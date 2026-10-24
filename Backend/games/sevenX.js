const crypto = require("crypto");
const { settleSeven } = require("../services/payouts");
const { SEVEN, COMMON } = require("../config/games");
const { GameError } = require("./hopOff");
const { seatBot } = require("../services/bots");

const GAME = "seven";
const roll = () => crypto.randomInt(1, 7);
const sumOf = (dice) => dice.reduce((a, b) => a + b, 0);

// 7x, eight to a table:
//   waiting: seats fill with players at the same stake
//   rolling: everyone gets three dice at once and may re-roll all three once
//   done:    the highest total takes the table (ties split it)
// Beat the other seven and you win their seven stakes, less the fee.
function createSevenX({ store, publish = () => {}, notify = () => {}, config = SEVEN, now = Date.now, autoRun = true, dice = roll }) {
  const filling = new Map(); // stake -> table
  const tables = new Map(); // id -> table
  const byUser = new Map(); // userId -> table id
  const timers = new Map();
  let stopped = false;

  const later = (key, fn, ms) => {
    if (!autoRun || stopped) return;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => Promise.resolve(fn()).catch((e) => console.error("7x:", e.message)), ms));
  };

  const newTable = (stake) => ({
    id: `7X-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
    stake,
    seats: [],
    phase: "waiting",
    since: now(),
    endsAt: null,
    result: null,
  });

  function lobby() {
    const waiting = {};
    for (const [stake, t] of filling) if (t.seats.length) waiting[stake] = t.seats.length;
    return { waiting, seats: config.SEATS, live: [...tables.values()].filter((t) => t.phase === "rolling").length, feeRate: config.FEE_RATE };
  }

  function view(userId) {
    const key = userId == null ? null : String(userId);
    const table = tables.get(byUser.get(key));
    if (!table) return { status: "idle", lobby: lobby() };
    const done = table.phase === "done";
    return {
      status: table.phase,
      lobby: lobby(),
      table: {
        id: table.id,
        stake: table.stake,
        seatsTotal: config.SEATS,
        endsAt: table.endsAt,
        pot: table.stake * table.seats.length,
        seats: table.seats.map((s) => ({
          name: s.name,
          you: s.userId === key,
          dice: s.dice,
          total: s.dice ? sumOf(s.dice) : null,
          rerolled: s.rerolled,
          payout: done ? s.payout : null,
        })),
        result: table.result,
      },
    };
  }

  const tell = (table) => table.seats.forEach((s) => !s.bot && notify(s.userId, "seven:state", view(s.userId)));
  const announce = () => publish("seven:lobby", lobby());

  async function join(userId, { stake }) {
    const key = String(userId);
    if (!Number.isInteger(stake) || stake < COMMON.MIN_STAKE || stake > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100}.`);
    }
    const current = tables.get(byUser.get(key));
    if (current && current.phase !== "done") throw new GameError("You're already at a table.");
    const user = await store.debit(key, stake);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    notify(key, "wallet", { balance: user.balance });
    let table = filling.get(stake);
    if (!table) {
      table = newTable(stake);
      filling.set(stake, table);
      tables.set(table.id, table);
    }
    table.seats.push({ userId: key, name: user.name, dice: null, rerolled: false, payout: null });
    byUser.set(key, table.id);
    if (config.BOTS) later(`fill:${table.id}`, () => fillWithBots(table), config.BOT_WAIT_MS);
    afterSeat(table);
    return view(key);
  }

  function afterSeat(table) {
    if (table.seats.length >= config.SEATS) startRolling(table);
    else tell(table);
    announce();
  }

  async function leave(userId) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (!table || table.phase !== "waiting") throw new GameError("You can only leave before the dice roll.");
    table.seats = table.seats.filter((s) => s.userId !== key);
    byUser.delete(key);
    const user = await store.credit(key, table.stake);
    if (user) notify(key, "wallet", { balance: user.balance });
    if (!table.seats.some((s) => !s.bot)) {
      // Only bots left: refund them and close the table.
      for (const s of table.seats) await store.credit(s.userId, table.stake);
      filling.delete(table.stake);
      tables.delete(table.id);
      clearTimeout(timers.get(`fill:${table.id}`));
    } else tell(table);
    announce();
    return view(key);
  }

  async function fillWithBots(table) {
    while (table.phase === "waiting" && table.seats.length < config.SEATS) {
      const bot = await seatBot(store, table.stake);
      if (!bot || table.phase !== "waiting" || !tables.has(table.id)) {
        if (bot) await store.credit(bot.userId, table.stake);
        return;
      }
      table.seats.push({ ...bot, dice: null, rerolled: false, payout: null });
      byUser.set(bot.userId, table.id);
      afterSeat(table);
    }
  }

  function startRolling(table) {
    filling.delete(table.stake);
    clearTimeout(timers.get(`fill:${table.id}`));
    table.phase = "rolling";
    table.endsAt = now() + config.ROLL_MS;
    table.seats.forEach((s) => (s.dice = [dice(), dice(), dice()]));
    // Bots re-roll a weak hand, like most people would.
    table.seats.forEach((s, i) => {
      if (s.bot && sumOf(s.dice) < 10) later(`bot:${table.id}:${i}`, () => reroll(s.userId), 1000 + Math.random() * 4000);
    });
    later(`end:${table.id}`, () => finish(table), config.ROLL_MS);
    tell(table);
    announce();
  }

  function reroll(userId) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (!table || table.phase !== "rolling") throw new GameError("Nothing to re-roll right now.");
    const seat = table.seats.find((s) => s.userId === key);
    if (seat.rerolled) throw new GameError("You've used your re-roll.");
    seat.dice = [dice(), dice(), dice()];
    seat.rerolled = true;
    tell(table);
    return view(key);
  }

  async function finish(table) {
    if (table.phase !== "rolling") return;
    table.phase = "done";
    const s = settleSeven(
      table.seats.map((x) => ({ userId: x.userId, total: sumOf(x.dice) })),
      { stake: table.stake, feeRate: config.FEE_RATE }
    );
    table.seats.forEach((seat, i) => (seat.payout = s.payouts[i].payout));
    table.result = { best: s.best, winners: s.winners.length, fee: s.fee, paidOut: table.stake * table.seats.length - s.fee };
    for (const seat of table.seats) {
      if (seat.payout > 0) {
        const user = await store.credit(seat.userId, seat.payout);
        if (user && !seat.bot) notify(seat.userId, "wallet", { balance: user.balance });
      }
    }
    await store.saveRound({
      id: table.id,
      game: GAME,
      settledAt: new Date(now()),
      stake: table.stake,
      pool: table.stake * table.seats.length,
      feeRate: config.FEE_RATE,
      ...table.result,
      players: table.seats.map((x) => ({ name: x.name, dice: x.dice, total: sumOf(x.dice), rerolled: x.rerolled, stake: table.stake, payout: x.payout })),
    });
    tell(table);
    announce();
    later(`clear:${table.id}`, () => {
      tables.delete(table.id);
      table.seats.forEach((x) => {
        if (byUser.get(x.userId) === table.id) byUser.delete(x.userId);
      });
    }, 20000);
    return table;
  }

  function dismiss(userId) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (table && table.phase === "done") byUser.delete(key);
    return view(key);
  }

  return {
    GAME,
    start() {
      stopped = false;
    },
    stop() {
      stopped = true;
      timers.forEach(clearTimeout);
    },
    state: view,
    lobby,
    join,
    leave,
    reroll,
    dismiss,
    // For tests.
    fillWithBots,
    finish,
    tableOf: (userId) => tables.get(byUser.get(String(userId))),
  };
}

module.exports = { createSevenX };
