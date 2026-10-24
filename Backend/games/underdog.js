const crypto = require("crypto");
const { settleUnderdog } = require("../services/payouts");
const { UNDERDOG, COMMON } = require("../config/games");
const { GameError } = require("./hopOff");

const GAME = "underdog";

// Underdog, one question at a time:
//   open:     players back side A or B; only the pool and player count show
//   revealed: side totals are shown; the side with less money wins
// The players decide the outcome, so there is no random draw to trust.
function createUnderdog({ store, publish = () => {}, notify = () => {}, config = UNDERDOG, now = Date.now, autoRun = true }) {
  let round = null;
  let timer = null;
  let stopped = false;
  let questionIndex = 0;
  let lastSettled = null;

  const schedule = (fn, ms) => {
    if (!autoRun || stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => Promise.resolve(fn()).catch((e) => console.error("Underdog:", e.message)), ms);
  };

  const betsOf = () => [...round.bets.values()];

  function snapshot(userId) {
    if (!round) return null;
    const bets = betsOf();
    const revealed = round.phase === "revealed";
    const me = userId ? round.bets.get(String(userId)) : null;
    return {
      game: GAME,
      roundId: round.id,
      phase: round.phase,
      question: round.question,
      endsAt: round.endsAt,
      feeRate: config.FEE_RATE,
      players: bets.length,
      pool: bets.reduce((t, b) => t + b.stake, 0),
      // Hidden until the lock, so nobody can just copy the smaller side.
      totals: revealed ? round.result.totals : null,
      counts: revealed ? round.result.counts : null,
      winner: revealed ? round.result.winner : null,
      result: revealed ? { fee: round.result.fee, paidOut: round.result.paidOut } : null,
      you: me ? { side: me.side, stake: me.stake, payout: me.payout ?? null } : null,
      lastRound: lastSettled,
    };
  }

  const broadcast = () => publish("underdog:state", snapshot());

  function openRound() {
    const question = config.QUESTIONS[questionIndex % config.QUESTIONS.length];
    questionIndex += 1;
    round = {
      id: `UD-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      phase: "open",
      question,
      bets: new Map(),
      endsAt: now() + config.OPEN_MS,
      result: null,
    };
    broadcast();
    schedule(lock, config.OPEN_MS);
    return snapshot();
  }

  async function stake(userId, { side, stake: amount }) {
    if (!round || round.phase !== "open") throw new GameError("This question has closed. The next one opens shortly.");
    if (side !== "a" && side !== "b") throw new GameError("Pick a side.");
    const key = String(userId);
    const existing = round.bets.get(key);
    if (existing && existing.side !== side) throw new GameError("You've already backed the other side.");
    const total = (existing?.stake || 0) + amount;
    if (!Number.isInteger(amount) || amount < COMMON.MIN_STAKE || total > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100} per question.`);
    }
    const id = round.id;
    const user = await store.debit(key, amount);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    if (!round || round.id !== id || round.phase !== "open") {
      await store.credit(key, amount);
      throw new GameError("This question has closed. The next one opens shortly.");
    }
    const bet = round.bets.get(key) || { userId: key, name: user.name, side, stake: 0 };
    bet.stake += amount;
    round.bets.set(key, bet);
    notify(key, "wallet", { balance: user.balance });
    broadcast();
    return snapshot(key);
  }

  async function lock() {
    if (!round || round.phase !== "open") return;
    if (round.bets.size === 0) {
      round.endsAt = now() + config.OPEN_MS;
      broadcast();
      schedule(lock, config.OPEN_MS);
      return;
    }
    round.phase = "revealed";
    const bets = betsOf();
    const s = settleUnderdog(bets, { feeRate: config.FEE_RATE });
    s.payouts.forEach((p, i) => (bets[i].payout = p.payout));
    round.result = {
      winner: s.winner,
      totals: s.totals,
      counts: { a: bets.filter((b) => b.side === "a").length, b: bets.filter((b) => b.side === "b").length },
      fee: s.fee,
      paidOut: s.payouts.reduce((t, p) => t + p.payout, 0),
    };
    round.endsAt = now() + config.REVEAL_MS;
    lastSettled = { roundId: round.id, question: round.question, ...round.result };
    for (const bet of bets) {
      if (bet.payout > 0) {
        const user = await store.credit(bet.userId, bet.payout);
        if (user) notify(bet.userId, "wallet", { balance: user.balance });
      }
    }
    const record = {
      id: round.id,
      game: GAME,
      settledAt: new Date(now()),
      question: round.question,
      feeRate: config.FEE_RATE,
      pool: bets.reduce((t, b) => t + b.stake, 0),
      ...round.result,
      bets: bets.map((b) => ({ name: b.name, side: b.side, stake: b.stake, payout: b.payout })),
    };
    await store.saveRound(record);
    broadcast();
    schedule(openRound, config.REVEAL_MS);
    return record;
  }

  return {
    GAME,
    start() {
      stopped = false;
      if (!round) openRound();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
    state: snapshot,
    stake,
    openRound,
    lock,
    get round() {
      return round;
    },
  };
}

module.exports = { createUnderdog };
