const crypto = require("crypto");
const { settleDuel } = require("../services/payouts");
const { DOUBLE, COMMON } = require("../config/games");
const { GameError } = require("./hopOff");
const { seatBot } = require("../services/bots");

const GAME = "double";
const MOVES = ["rock", "paper", "scissors"];
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

// Double or Nothing, head to head:
//   queued:  your stake is held while we look for someone at the same stake
//   playing: rock-paper-scissors, first to WINS_NEEDED; ties are replayed; a
//            player who doesn't pick in time gets a random move
//   done:    the winner walks off with both stakes, less the fee
// notify(userId, "double:state", view) keeps each player's screen current;
// publish("double:lobby", stats) tells everyone how many are waiting.
function createDoubleOrNothing({ store, publish = () => {}, notify = () => {}, config = DOUBLE, now = Date.now, autoRun = true, random = Math.random }) {
  const queue = new Map(); // stake -> [{ userId, name, since }]
  const matches = new Map(); // matchId -> match
  const byUser = new Map(); // userId -> matchId (current or just finished)
  const timers = new Map();
  let stopped = false;

  const later = (key, fn, ms) => {
    if (!autoRun || stopped) return;
    clearTimeout(timers.get(key));
    timers.set(
      key,
      setTimeout(() => Promise.resolve(fn()).catch((e) => console.error("Double or Nothing:", e.message)), ms)
    );
  };

  const randomMove = () => MOVES[Math.floor(random() * 3)];
  const queuedAt = (userId) => [...queue.entries()].find(([, list]) => list.some((q) => q.userId === userId));

  function lobby() {
    const waiting = {};
    for (const [stake, list] of queue) if (list.length) waiting[stake] = list.length;
    const live = [...matches.values()].filter((m) => m.phase === "playing").length;
    return { waiting, live, feeRate: config.FEE_RATE };
  }

  function view(userId) {
    const key = String(userId);
    const q = queuedAt(key);
    if (q) {
      const entry = q[1].find((x) => x.userId === key);
      return { status: "queued", stake: Number(q[0]), since: entry.since, lobby: lobby() };
    }
    const match = matches.get(byUser.get(key));
    if (!match) return { status: "idle", lobby: lobby() };
    const me = match.players.findIndex((p) => p.userId === key);
    const them = 1 - me;
    return {
      status: match.phase === "done" ? "done" : "playing",
      lobby: lobby(),
      match: {
        id: match.id,
        stake: match.stake,
        round: match.round,
        wins: [match.wins[me], match.wins[them]],
        winsNeeded: config.WINS_NEEDED,
        you: { name: match.players[me].name },
        opponent: { name: match.players[them].name, bot: match.players[them].bot },
        picked: Boolean(match.moves[me]),
        opponentPicked: Boolean(match.moves[them]),
        endsAt: match.endsAt,
        // Each finished throw, from your side: [yours, theirs, "win"|"lose"|"tie"].
        history: match.history.map((h) => ({
          you: h.moves[me],
          them: h.moves[them],
          result: h.winner == null ? "tie" : h.winner === me ? "win" : "lose",
        })),
        result:
          match.phase === "done"
            ? { won: match.winner === me, payout: match.winner === me ? match.payout : 0, fee: match.fee }
            : null,
      },
    };
  }

  const tell = (match) => match.players.forEach((p) => !p.bot && notify(p.userId, "double:state", view(p.userId)));
  const announce = () => publish("double:lobby", lobby());

  async function enqueue(userId, { stake }) {
    const key = String(userId);
    if (!Number.isInteger(stake) || stake < COMMON.MIN_STAKE || stake > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100}.`);
    }
    if (queuedAt(key)) throw new GameError("You're already looking for an opponent.");
    const current = matches.get(byUser.get(key));
    if (current && current.phase === "playing") throw new GameError("Finish your game first.");
    const user = await store.debit(key, stake);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    notify(key, "wallet", { balance: user.balance });

    const waiting = (queue.get(stake) || []).filter((q) => q.userId !== key);
    if (waiting.length) {
      const opponent = waiting.shift();
      queue.set(stake, waiting);
      startMatch(stake, opponent, { userId: key, name: user.name });
    } else {
      waiting.push({ userId: key, name: user.name, since: now() });
      queue.set(stake, waiting);
      if (config.BOTS) later(`bot:${key}`, () => botJoins(key, stake), config.BOT_WAIT_MS);
    }
    announce();
    return view(key);
  }

  async function cancel(userId) {
    const key = String(userId);
    const q = queuedAt(key);
    if (!q) throw new GameError("You're not in the queue.");
    const [stake, list] = q;
    queue.set(stake, list.filter((x) => x.userId !== key));
    clearTimeout(timers.get(`bot:${key}`));
    const user = await store.credit(key, Number(stake));
    if (user) notify(key, "wallet", { balance: user.balance });
    announce();
    return view(key);
  }

  async function botJoins(userId, stake) {
    const q = queuedAt(userId);
    if (!q || Number(q[0]) !== stake) return;
    const bot = await seatBot(store, stake);
    if (!bot) return;
    if (!queuedAt(userId)) {
      // They cancelled or found a person while the bot sat down.
      await store.credit(bot.userId, stake);
      return;
    }
    queue.set(stake, queue.get(stake).filter((x) => x.userId !== userId));
    startMatch(stake, q[1].find((x) => x.userId === userId), bot);
    announce();
  }

  function startMatch(stake, a, b) {
    const match = {
      id: `DN-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      stake,
      players: [a, b],
      wins: [0, 0],
      round: 1,
      moves: [null, null],
      history: [],
      phase: "playing",
      endsAt: now() + config.MOVE_MS,
    };
    matches.set(match.id, match);
    match.players.forEach((p) => {
      clearTimeout(timers.get(`bot:${p.userId}`));
      byUser.set(p.userId, match.id);
    });
    openThrow(match);
    return match;
  }

  function openThrow(match) {
    match.moves = [null, null];
    match.endsAt = now() + (match.history.length ? config.REVEAL_MS : 0) + config.MOVE_MS;
    match.players.forEach((p, i) => {
      if (p.bot) later(`botmove:${match.id}:${i}`, () => move(p.userId, randomMove()), (match.history.length ? config.REVEAL_MS : 0) + 800 + random() * 2500);
    });
    later(`throw:${match.id}`, () => timeOut(match), match.endsAt - now());
    tell(match);
  }

  function move(userId, choice) {
    const key = String(userId);
    if (!MOVES.includes(choice)) throw new GameError("Pick rock, paper or scissors.");
    const match = matches.get(byUser.get(key));
    if (!match || match.phase !== "playing") throw new GameError("You're not in a game.");
    const seat = match.players.findIndex((p) => p.userId === key);
    if (match.moves[seat]) throw new GameError("You've already picked.");
    match.moves[seat] = choice;
    if (match.moves[0] && match.moves[1]) return resolveThrow(match).then(() => view(key));
    tell(match);
    return view(key);
  }

  // Nobody waits forever: an empty seat gets a random move.
  function timeOut(match) {
    if (match.phase !== "playing") return;
    match.moves = match.moves.map((m) => m || randomMove());
    return resolveThrow(match);
  }

  async function resolveThrow(match) {
    clearTimeout(timers.get(`throw:${match.id}`));
    const [m0, m1] = match.moves;
    const winner = m0 === m1 ? null : BEATS[m0] === m1 ? 0 : 1;
    match.history.push({ moves: [m0, m1], winner });
    if (winner != null) {
      match.wins[winner] += 1;
      match.round += 1;
    }
    if (winner != null && match.wins[winner] >= config.WINS_NEEDED) return finish(match, winner);
    openThrow(match);
  }

  async function finish(match, winner) {
    match.phase = "done";
    match.winner = winner;
    const s = settleDuel(match.stake, { feeRate: config.FEE_RATE });
    match.fee = s.fee;
    match.payout = s.winnerPayout;
    const champ = match.players[winner];
    const user = await store.credit(champ.userId, s.winnerPayout);
    if (user && !champ.bot) notify(champ.userId, "wallet", { balance: user.balance });
    await store.saveRound({
      id: match.id,
      game: GAME,
      settledAt: new Date(now()),
      stake: match.stake,
      pool: match.stake * 2,
      fee: s.fee,
      paidOut: s.winnerPayout,
      feeRate: config.FEE_RATE,
      players: match.players.map((p, i) => ({ name: p.name, wins: match.wins[i], payout: i === winner ? s.winnerPayout : 0, stake: match.stake })),
      throws: match.history.map((h) => ({ moves: h.moves, winner: h.winner })),
    });
    tell(match);
    announce();
    // Keep the finished game on screen briefly, then free the seat.
    later(`clear:${match.id}`, () => {
      matches.delete(match.id);
      match.players.forEach((p) => {
        if (byUser.get(p.userId) === match.id) byUser.delete(p.userId);
        if (!p.bot) notify(p.userId, "double:state", view(p.userId));
      });
      announce();
    }, 15000);
    return match;
  }

  // "Play again" from the result screen.
  function dismiss(userId) {
    const key = String(userId);
    const match = matches.get(byUser.get(key));
    if (match && match.phase === "done") byUser.delete(key);
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
    state: (userId) => (userId ? view(userId) : { status: "idle", lobby: lobby() }),
    lobby,
    enqueue,
    cancel,
    move,
    dismiss,
    // For tests.
    botJoins,
    timeOut,
    matchOf: (userId) => matches.get(byUser.get(String(userId))),
  };
}

module.exports = { createDoubleOrNothing, MOVES };
