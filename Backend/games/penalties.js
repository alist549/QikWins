const crypto = require("crypto");
const { PENALTY, COMMON } = require("../config/games");
const { GameError } = require("./hopOff");
const { seatBot } = require("../services/bots");

const GAME = "penalties";
const MODES = { duel: 2, cup: null }; // seats; the cup's come from config
const randomSpot = (spots) => crypto.randomInt(0, spots);

// Penalties, between real players, as a 1 v 1 duel or a 16-player cup.
//
// A table fills at one stake and mode, then every round pairs the players
// still in. A match is a shootout: the players take turns to shoot and keep
// (KICKS_EACH each, then sudden death). Both pick left, centre or right at the same
// time; the keeper saves only by diving to the striker's spot.
//
// Money: everyone starts with their stake as their bank. A match winner adds
// the loser's bank, less the fee, to their own. In the duel the winner is
// paid straight away. In the cup, after each round the winners choose to
// cash out their bank or play on (no answer means cash out, the safe
// choice); the cup winner is paid their bank.
function createPenalties({ store, publish = () => {}, notify = () => {}, config = PENALTY, now = Date.now, autoRun = true, spot = randomSpot }) {
  const filling = new Map(); // `${mode}:${stake}` -> table
  const tables = new Map(); // id -> table
  const byUser = new Map(); // userId -> table id
  const timers = new Map();
  let stopped = false;

  const later = (key, fn, ms) => {
    if (!autoRun || stopped) return;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => Promise.resolve(fn()).catch((e) => console.error("Penalties:", e.message)), ms));
  };
  const cancel = (key) => clearTimeout(timers.get(key));
  const seatsFor = (mode) => MODES[mode] || config.CUP_SEATS;
  const id = (prefix) => `${prefix}-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  function roundName(table, players) {
    if (table.mode === "duel") return "Penalty duel";
    if (players <= 2) return "Final";
    if (players <= 4) return "Semi-finals";
    if (players <= 8) return "Quarter-finals";
    return `Round of ${players}`;
  }

  function lobby() {
    const waiting = { duel: {}, cup: {} };
    for (const t of filling.values()) if (t.seats.length) waiting[t.mode][t.stake] = t.seats.length;
    const live = [...tables.values()].filter((t) => t.phase === "playing" || t.phase === "choice");
    return {
      waiting,
      cupSeats: config.CUP_SEATS,
      live: live.length,
      playing: live.reduce((n, t) => n + t.seats.filter((s) => s.state === "in").length, 0),
      feeRate: config.FEE_RATE,
    };
  }

  // ---- Views -------------------------------------------------------------

  function matchView(m, key) {
    const me = m.players.findIndex((p) => p.userId === key);
    const them = 1 - me;
    const shooter = m.kick % 2;
    return {
      id: m.id,
      round: m.round,
      you: me,
      opponent: { name: m.players[them].name },
      score: [m.score[me], m.score[them]],
      kick: m.kick,
      kicksEach: config.KICKS_EACH,
      suddenDeath: m.kick >= config.KICKS_EACH * 2,
      role: shooter === me ? "shoot" : "keep",
      phase: m.phase,
      endsAt: m.endsAt,
      picked: m.picks[me] != null,
      opponentPicked: m.picks[them] != null,
      history: m.kicks.map((k) => ({ you: k.shooter === me ? "shoot" : "keep", aim: k.aim, dive: k.dive, goal: k.goal })),
      won: m.winner == null ? null : m.winner === me,
    };
  }

  function view(userId) {
    const key = userId == null ? null : String(userId);
    const table = tables.get(byUser.get(key));
    if (!table) return { status: "idle", lobby: lobby() };
    const me = table.seats.find((s) => s.userId === key);
    const match = table.matches.find((m) => m.players.some((p) => p.userId === key));
    let status;
    if (table.phase === "waiting") status = "waiting";
    else if (table.phase === "done") status = "done";
    else if (me.state !== "in") status = "watching";
    else if (table.phase === "choice") status = "choice";
    else status = match ? "playing" : "watching";
    const fee = (bank) => Math.floor(bank * config.FEE_RATE);
    return {
      status,
      lobby: lobby(),
      table: {
        id: table.id,
        mode: table.mode,
        stake: table.stake,
        seatsTotal: seatsFor(table.mode),
        seated: table.seats.length,
        round: table.round,
        roundName: table.roundName,
        phase: table.phase,
        endsAt: table.phase === "choice" ? table.endsAt : null,
        pot: table.stake * table.seats.length,
        stillIn: table.seats.filter((s) => s.state === "in").length,
        you: {
          name: me.name,
          bank: me.bank,
          state: me.state,
          payout: me.payout,
          choice: me.choice,
          // Your bank if you play on and win the next match.
          nextBank: me.bank * 2 - fee(me.bank),
        },
        players: table.seats.map((s) => ({ name: s.name, state: s.state, you: s.userId === key })),
        bracket: [
          ...table.history,
          ...(table.phase === "playing"
            ? [
                {
                  round: table.round,
                  name: table.roundName,
                  matches: table.matches.map((m) => ({ a: m.players[0].name, b: m.players[1].name, score: m.score, winner: m.winner, live: m.winner == null })),
                },
              ]
            : []),
        ],
        result: table.result,
      },
      match: match ? matchView(match, key) : null,
    };
  }

  const tell = (table) => table.seats.forEach((s) => !s.bot && notify(s.userId, "penalties:state", view(s.userId)));
  const announce = () => publish("penalties:lobby", lobby());

  // ---- Joining -----------------------------------------------------------

  async function join(userId, { mode, stake }) {
    const key = String(userId);
    if (!(mode in MODES)) throw new GameError("Pick 1 v 1 or the cup.");
    if (!Number.isInteger(stake) || stake < COMMON.MIN_STAKE || stake > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100}.`);
    }
    const current = tables.get(byUser.get(key));
    if (current && current.phase !== "done" && current.seats.find((s) => s.userId === key)?.state === "in") {
      throw new GameError("You're already playing penalties.");
    }
    const user = await store.debit(key, stake);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    notify(key, "wallet", { balance: user.balance });
    const fkey = `${mode}:${stake}`;
    let table = filling.get(fkey);
    if (!table) {
      table = { id: id(mode === "duel" ? "PD" : "PC"), mode, stake, seats: [], phase: "waiting", round: 0, roundName: null, matches: [], history: [], fee: 0, endsAt: null, result: null };
      filling.set(fkey, table);
      tables.set(table.id, table);
    }
    table.seats.push({ userId: key, name: user.name, bank: stake, state: "in", payout: 0, choice: null });
    byUser.set(key, table.id);
    if (config.BOTS) later(`fill:${table.id}`, () => fillWithBots(table), config.BOT_WAIT_MS);
    afterSeat(table);
    return view(key);
  }

  function afterSeat(table) {
    if (table.seats.length >= seatsFor(table.mode)) startRound(table);
    else tell(table);
    announce();
  }

  async function leave(userId) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (!table || table.phase !== "waiting") throw new GameError("You can only leave before kick-off.");
    table.seats = table.seats.filter((s) => s.userId !== key);
    byUser.delete(key);
    const user = await store.credit(key, table.stake);
    if (user) notify(key, "wallet", { balance: user.balance });
    if (!table.seats.some((s) => !s.bot)) {
      for (const s of table.seats) await store.credit(s.userId, table.stake);
      filling.delete(`${table.mode}:${table.stake}`);
      tables.delete(table.id);
      cancel(`fill:${table.id}`);
    } else tell(table);
    announce();
    return view(key);
  }

  async function fillWithBots(table) {
    while (table.phase === "waiting" && table.seats.length < seatsFor(table.mode)) {
      const bot = await seatBot(store, table.stake);
      if (!bot || table.phase !== "waiting" || !tables.has(table.id)) {
        if (bot) await store.credit(bot.userId, table.stake);
        return;
      }
      table.seats.push({ ...bot, bank: table.stake, state: "in", payout: 0, choice: null });
      byUser.set(bot.userId, table.id);
      if (table.seats.length >= seatsFor(table.mode)) startRound(table);
    }
    tell(table);
    announce();
  }

  // ---- Rounds and matches ------------------------------------------------

  function startRound(table) {
    filling.delete(`${table.mode}:${table.stake}`);
    cancel(`fill:${table.id}`);
    const players = table.seats.filter((s) => s.state === "in");
    // Shuffle, then pair up; an odd one out gets a bye into the next round.
    for (let i = players.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [players[i], players[j]] = [players[j], players[i]];
    }
    table.phase = "playing";
    table.round += 1;
    table.roundName = roundName(table, players.length);
    table.matches = [];
    table.byes = players.length % 2 ? [players.pop()] : [];
    for (let i = 0; i < players.length; i += 2) {
      const m = { id: id("PK"), round: table.round, players: [players[i], players[i + 1]], score: [0, 0], kick: 0, kicks: [], picks: [null, null], phase: "aim", endsAt: null, winner: null };
      table.matches.push(m);
      openKick(table, m);
    }
    tell(table);
    announce();
  }

  function openKick(table, m) {
    m.phase = "aim";
    m.picks = [null, null];
    m.endsAt = now() + config.KICK_MS;
    m.players.forEach((p, i) => {
      if (p.bot) later(`bot:${m.id}:${i}`, () => pickFor(table, m, i, spot(config.SPOTS)), 700 + Math.random() * (config.KICK_MS * 0.5));
    });
    later(`kick:${m.id}`, () => resolveKick(table, m, true), config.KICK_MS);
  }

  function pickFor(table, m, i, value) {
    if (m.phase !== "aim" || m.picks[i] != null) return;
    m.picks[i] = value;
    if (m.picks.every((p) => p != null)) resolveKick(table, m);
    else tell(table);
  }

  function kick(userId, value) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    const m = table?.matches.find((x) => x.players.some((p) => p.userId === key));
    if (!m || m.phase !== "aim" || m.winner != null) throw new GameError("Not your kick right now.");
    if (!Number.isInteger(value) || value < 0 || value >= config.SPOTS) throw new GameError("Pick left, centre or right.");
    const i = m.players.findIndex((p) => p.userId === key);
    if (m.picks[i] != null) throw new GameError("You've already picked.");
    pickFor(table, m, i, value);
    return view(key);
  }

  // Who has won, if anyone, after `taken` kicks.
  function decided(m) {
    const n = config.KICKS_EACH;
    const taken = m.kicks.length;
    const [a, b] = m.score;
    if (taken <= 2 * n) {
      const leftA = n - Math.ceil(taken / 2);
      const leftB = n - Math.floor(taken / 2);
      if (a > b + leftB) return 0;
      if (b > a + leftA) return 1;
      return null;
    }
    // Sudden death: decided after each pair of kicks.
    if (taken % 2 === 0 && a !== b) return a > b ? 0 : 1;
    if (taken % 2 === 0 && taken >= 2 * (n + config.MAX_SUDDEN_DEATH)) return crypto.randomInt(0, 2);
    return null;
  }

  function resolveKick(table, m, timedOut = false) {
    if (m.phase !== "aim") return;
    cancel(`kick:${m.id}`);
    if (timedOut) m.picks = m.picks.map((p) => (p == null ? spot(config.SPOTS) : p));
    const shooter = m.kick % 2;
    const keeper = 1 - shooter;
    const aim = m.picks[shooter];
    const dive = m.picks[keeper];
    const goal = aim !== dive;
    if (goal) m.score[shooter] += 1;
    m.kicks.push({ shooter, aim, dive, goal });
    m.kick += 1;
    m.phase = "reveal";
    m.endsAt = now() + config.REVEAL_MS;
    later(`next:${m.id}`, () => advance(table, m), config.REVEAL_MS);
    tell(table);
  }

  // After a kick's reveal: the match is won, or the next kick opens.
  async function advance(table, m) {
    if (m.phase !== "reveal") return;
    const winner = decided(m);
    if (winner != null) return finishMatch(table, m, winner);
    openKick(table, m);
    tell(table);
  }

  async function finishMatch(table, m, winnerIndex) {
    if (m.winner != null) return;
    m.winner = winnerIndex;
    m.phase = "done";
    const win = m.players[winnerIndex];
    const lose = m.players[1 - winnerIndex];
    const fee = Math.floor(lose.bank * config.FEE_RATE);
    win.bank += lose.bank - fee;
    lose.bank = 0;
    lose.state = "out";
    table.fee += fee;
    if (table.matches.every((x) => x.winner != null)) await endRound(table);
    else tell(table);
  }

  async function endRound(table) {
    table.history.push({
      round: table.round,
      name: table.roundName,
      matches: table.matches.map((m) => ({ a: m.players[0].name, b: m.players[1].name, score: m.score, winner: m.winner })),
      byes: (table.byes || []).map((b) => b.name),
    });
    const left = table.seats.filter((s) => s.state === "in");
    if (left.length <= 1 || table.mode === "duel") {
      for (const s of left) await payOut(s, "champion");
      return finishTable(table);
    }
    // Cup: winners choose to cash out or play on.
    table.phase = "choice";
    table.matches = [];
    table.endsAt = now() + config.CHOICE_MS;
    left.forEach((s) => {
      s.choice = null;
      if (s.bot) later(`choice:${table.id}:${s.userId}`, () => choose(s.userId, Math.random() < 0.8 ? "continue" : "cashout"), 800 + Math.random() * 3000);
    });
    later(`choice:${table.id}`, () => closeChoice(table), config.CHOICE_MS);
    tell(table);
    announce();
  }

  async function payOut(seat, state) {
    seat.state = state;
    seat.payout = seat.bank;
    const user = await store.credit(seat.userId, seat.bank);
    if (user && !seat.bot) notify(seat.userId, "wallet", { balance: user.balance });
  }

  async function choose(userId, choice) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    if (!table || table.phase !== "choice") throw new GameError("There's nothing to choose right now.");
    if (choice !== "cashout" && choice !== "continue") throw new GameError("Cash out or play on?");
    const seat = table.seats.find((s) => s.userId === key);
    if (seat.state !== "in" || seat.choice) throw new GameError("You've already chosen.");
    seat.choice = choice;
    if (choice === "cashout") await payOut(seat, "cashed");
    const waiting = table.seats.filter((s) => s.state === "in" && !s.choice);
    if (!waiting.length) await closeChoice(table);
    else tell(table);
    return view(key);
  }

  async function closeChoice(table) {
    if (table.phase !== "choice") return;
    cancel(`choice:${table.id}`);
    // No answer means cash out: the safe choice.
    for (const s of table.seats.filter((x) => x.state === "in" && !x.choice)) {
      s.choice = "cashout";
      await payOut(s, "cashed");
    }
    const on = table.seats.filter((s) => s.state === "in");
    if (on.length === 1) {
      // Everyone else cashed out: nobody left to play, so they cash out too.
      await payOut(on[0], "cashed");
      return finishTable(table);
    }
    if (!on.length) return finishTable(table);
    table.seats.forEach((s) => (s.choice = null));
    startRound(table);
  }

  async function finishTable(table) {
    table.phase = "done";
    table.matches = [];
    const champion = table.seats.find((s) => s.state === "champion");
    table.result = {
      champion: champion?.name || null,
      rounds: table.round,
      fee: table.fee,
      paidOut: table.seats.reduce((n, s) => n + s.payout, 0),
    };
    await store.saveRound({
      id: table.id,
      game: GAME,
      mode: table.mode,
      settledAt: new Date(now()),
      stake: table.stake,
      pool: table.stake * table.seats.length,
      feeRate: config.FEE_RATE,
      ...table.result,
      history: table.history,
      players: table.seats.map((s) => ({ name: s.name, state: s.state, stake: table.stake, payout: s.payout })),
    });
    tell(table);
    announce();
    later(`clear:${table.id}`, () => {
      tables.delete(table.id);
      table.seats.forEach((s) => {
        if (byUser.get(s.userId) === table.id) byUser.delete(s.userId);
      });
    }, 30000);
    return table;
  }

  function dismiss(userId) {
    const key = String(userId);
    const table = tables.get(byUser.get(key));
    const seat = table?.seats.find((s) => s.userId === key);
    if (table && (table.phase === "done" || seat?.state !== "in")) byUser.delete(key);
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
    kick,
    choose,
    dismiss,
    // For tests.
    fillWithBots,
    resolveKick,
    advance,
    closeChoice,
    tableOf: (userId) => tables.get(byUser.get(String(userId))),
  };
}

module.exports = { createPenalties };
