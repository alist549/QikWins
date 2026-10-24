const crypto = require("crypto");
const { settleStanding } = require("../services/payouts");
const { STANDING, COMMON } = require("../config/games");
const { GameError } = require("./hopOff");
const { seatBot } = require("../services/bots");

const GAME = "last-standing";

// Last Standing, a knockout at one stake:
//   waiting: seats fill with players at the same stake
//   picking: everyone still in picks a side of a two-way question
//   reveal:  only the side fewer people picked stays in (a tie keeps both;
//            not picking knocks you out)
//   done:    after one player is left, or MAX_ROUNDS, the survivors share
//            every stake, less a fee from the knocked-out players' stakes
function createLastStanding({ store, publish = () => {}, notify = () => {}, config = STANDING, now = Date.now, autoRun = true }) {
  const filling = new Map(); // stake -> table
  const tables = new Map(); // id -> table
  const byUser = new Map(); // userId -> table id
  const timers = new Map();
  let stopped = false;
  let questionIndex = 0;

  const later = (key, fn, ms) => {
    if (!autoRun || stopped) return;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => Promise.resolve(fn()).catch((e) => console.error("Last Standing:", e.message)), ms));
  };

  const newTable = (stake) => ({
    id: `LS-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
    stake,
    seats: [],
    phase: "waiting",
    round: 0,
    question: null,
    endsAt: null,
    history: [],
    result: null,
  });

  const alive = (table) => table.seats.filter((s) => !s.outAt);

  function lobby() {
    const waiting = {};
    for (const [stake, t] of filling) if (t.seats.length) waiting[stake] = t.seats.length;
    const live = [...tables.values()].filter((t) => t.phase === "picking" || t.phase === "reveal");
    return { waiting, seats: config.SEATS, live: live.length, playing: live.reduce((n, t) => n + t.seats.length, 0), feeRate: config.FEE_RATE };
  }

  function view(userId) {
    const key = userId == null ? null : String(userId);
    const table = tables.get(byUser.get(key));
    if (!table) return { status: "idle", lobby: lobby() };
    const me = table.seats.find((s) => s.userId === key);
    const last = table.history[table.history.length - 1];
    return {
      status: table.phase,
      lobby: lobby(),
      table: {
        id: table.id,
        stake: table.stake,
        seatsTotal: config.SEATS,
        seated: table.seats.length,
        alive: alive(table).length,
        pot: table.stake * table.seats.length,
        round: table.round,
        maxRounds: config.MAX_ROUNDS,
        question: table.question,
        endsAt: table.endsAt,
        // Live pick counts stay hidden until the reveal.
        last: last || null,
        you: me ? { name: me.name, pick: me.pick, out: Boolean(me.outAt), outAt: me.outAt, payout: table.phase === "done" ? me.payout : null } : null,
        players: table.seats.map((s) => ({ name: s.name, you: s.userId === key, out: Boolean(s.outAt) })),
        result: table.result,
      },
    };
  }

  const tell = (table) => table.seats.forEach((s) => !s.bot && notify(s.userId, "last-standing:state", view(s.userId)));
  const announce = () => publish("last-standing:lobby", lobby());

  async function join(userId, { stake }) {
    const key = String(userId);
    if (!Number.isInteger(stake) || stake < COMMON.MIN_STAKE || stake > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100}.`);
    }
    const current = tables.get(byUser.get(key));
    if (current && current.phase !== "done") throw new GameError("You're already in a knockout.");
    const user = await store.debit(key, stake);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    notify(key, "wallet", { balance: user.balance });
    let table = filling.get(stake);
    if (!table) {
      table = newTable(stake);
      filling.set(stake, table);
      tables.set(table.id, table);
    }
    table.seats.push({ userId: key, name: user.name, pick: null, outAt: null, payout: 0 });
    byUser.set(key, table.id);
    if (config.BOTS) later(`fill:${table.id}`, () => fillWithBots(table), config.BOT_WAIT_MS);
    afterSeat(table);
    return view(key);
  }

  function afterSeat(table) {
    if (table.seats.length >= config.SEATS) startRound(table);
    else tell(table);
    announce();
  }

  async function leave(userId) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (!table || table.phase !== "waiting") throw new GameError("You can only leave before the knockout starts.");
    table.seats = table.seats.filter((s) => s.userId !== key);
    byUser.delete(key);
    const user = await store.credit(key, table.stake);
    if (user) notify(key, "wallet", { balance: user.balance });
    if (!table.seats.some((s) => !s.bot)) {
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
      table.seats.push({ ...bot, pick: null, outAt: null, payout: 0 });
      byUser.set(bot.userId, table.id);
      if (table.seats.length >= config.SEATS) startRound(table);
    }
    tell(table);
    announce();
  }

  function startRound(table) {
    filling.delete(table.stake);
    clearTimeout(timers.get(`fill:${table.id}`));
    table.phase = "picking";
    table.round += 1;
    table.question = config.QUESTIONS[questionIndex % config.QUESTIONS.length];
    questionIndex += 1;
    table.endsAt = now() + config.PICK_MS;
    alive(table).forEach((s) => (s.pick = null));
    alive(table)
      .filter((s) => s.bot)
      .forEach((s) => later(`bot:${table.id}:${s.userId}`, () => s.pick || (s.pick = Math.random() < 0.5 ? "a" : "b"), 500 + Math.random() * (config.PICK_MS - 1500)));
    later(`reveal:${table.id}`, () => reveal(table), config.PICK_MS);
    tell(table);
    announce();
  }

  function pick(userId, side) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (!table || table.phase !== "picking") throw new GameError("No question open right now.");
    if (side !== "a" && side !== "b") throw new GameError("Pick a side.");
    const seat = table.seats.find((s) => s.userId === key);
    if (seat.outAt) throw new GameError("You're out of this knockout.");
    if (seat.pick) throw new GameError("You've already picked.");
    seat.pick = side;
    tell(table);
    return view(key);
  }

  async function reveal(table) {
    if (table.phase !== "picking") return;
    const inPlay = alive(table);
    // Bots that haven't picked yet do so now.
    inPlay.filter((s) => s.bot && !s.pick).forEach((s) => (s.pick = Math.random() < 0.5 ? "a" : "b"));
    const counts = { a: inPlay.filter((s) => s.pick === "a").length, b: inPlay.filter((s) => s.pick === "b").length };
    let safe;
    if (counts.a === 0 && counts.b === 0) safe = null;
    else if (counts.a === 0 || counts.b === 0 || counts.a === counts.b) safe = "both";
    else safe = counts.a < counts.b ? "a" : "b";
    for (const s of inPlay) {
      const survives = safe === null || (s.pick && (safe === "both" || s.pick === safe));
      if (!survives) s.outAt = table.round;
    }
    table.history.push({ round: table.round, question: table.question, counts, safe, left: alive(table).length });
    table.phase = "reveal";
    table.endsAt = now() + config.REVEAL_MS;
    const left = alive(table).length;
    if (left <= 1 || table.round >= config.MAX_ROUNDS) later(`next:${table.id}`, () => finish(table), config.REVEAL_MS);
    else later(`next:${table.id}`, () => startRound(table), config.REVEAL_MS);
    tell(table);
    return table;
  }

  async function finish(table) {
    if (table.phase === "done") return;
    table.phase = "done";
    table.endsAt = null;
    const survivors = alive(table);
    const s = settleStanding(table.seats.length, survivors.length, { stake: table.stake, feeRate: config.FEE_RATE });
    survivors.forEach((seat, i) => (seat.payout = s.shares[i]));
    table.result = {
      survivors: survivors.length,
      rounds: table.round,
      fee: s.fee,
      paidOut: table.stake * table.seats.length - s.fee,
      each: s.shares[0] || 0,
      multiplier: Math.round(((s.shares[0] || 0) / table.stake) * 10) / 10,
    };
    for (const seat of survivors) {
      const user = await store.credit(seat.userId, seat.payout);
      if (user && !seat.bot) notify(seat.userId, "wallet", { balance: user.balance });
    }
    await store.saveRound({
      id: table.id,
      game: GAME,
      settledAt: new Date(now()),
      stake: table.stake,
      pool: table.stake * table.seats.length,
      feeRate: config.FEE_RATE,
      ...table.result,
      history: table.history,
      players: table.seats.map((x) => ({ name: x.name, outAt: x.outAt, stake: table.stake, payout: x.payout })),
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
    if (table && (table.phase === "done" || table.seats.find((s) => s.userId === key)?.outAt)) byUser.delete(key);
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
    pick,
    dismiss,
    // For tests.
    fillWithBots,
    reveal,
    finish,
    startRound,
    tableOf: (userId) => tables.get(byUser.get(String(userId))),
  };
}

module.exports = { createLastStanding };
