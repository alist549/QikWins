const crypto = require("crypto");
const fair = require("../services/fair");
const { settleWheel } = require("../services/payouts");
const { WHEEL, COMMON } = require("../config/games");
const { GameError } = require("./hopOff");
const { seatBot } = require("../services/bots");

// Big Wheel, one spin at a time:
//   open:     players stake on any of the segments; live totals show what
//             each segment would pay right now
//   spinning: no more stakes; the wheel turns to the drawn segment
//   result:   winners are paid, or the wheel rolls over into the next spin
// The winning segment comes from a seed whose hash is shown while the wheel
// is open (see services/fair.js), so it is fixed before anyone stakes.
//
// The races (Marble Madness and friends) run on this same engine with their
// own config: racers instead of segments, and the race animation reveals the
// winner that was drawn before the first stake.
function createBigWheel({ store, publish = () => {}, notify = () => {}, config = WHEEL, now = Date.now, autoRun = true }) {
  const GAME = config.GAME || "big-wheel";
  let round = null;
  let carry = 0;
  let stopped = false;
  let lastSettled = null;
  const timers = new Set();

  const later = (fn, ms) => {
    if (!autoRun || stopped) return;
    const t = setTimeout(() => {
      timers.delete(t);
      Promise.resolve(fn()).catch((e) => console.error(`${GAME}:`, e.message));
    }, ms);
    timers.add(t);
  };

  const totals = () => {
    const t = Array(config.SEGMENTS).fill(0);
    for (const b of round.bets) t[b.segment] += b.stake;
    return t;
  };

  // What one unit on each segment would get back if the spin ended now.
  function paysNow(t) {
    const total = t.reduce((a, b) => a + b, 0) + round.carryIn;
    return t.map((onIt) => {
      if (!onIt) return null;
      const fee = Math.floor((total - round.carryIn - onIt) * config.FEE_RATE);
      return Math.round(((total - fee) / onIt) * 10) / 10;
    });
  }

  function snapshot(userId) {
    if (!round) return null;
    const key = userId == null ? null : String(userId);
    const t = totals();
    const done = round.phase === "result";
    const mine = round.bets.filter((b) => b.userId === key);
    return {
      game: GAME,
      roundId: round.id,
      phase: round.phase,
      hash: round.hash,
      segments: config.SEGMENTS,
      endsAt: round.endsAt,
      feeRate: config.FEE_RATE,
      players: new Set(round.bets.map((b) => b.userId)).size,
      pool: t.reduce((a, b) => a + b, 0),
      carryIn: round.carryIn,
      totals: t,
      pays: paysNow(t),
      recent: round.bets.slice(-6).reverse().map((b) => ({ name: b.name, segment: b.segment, stake: b.stake })),
      // The winner is shown when the wheel starts turning, so it can land there.
      winning: round.phase === "open" ? null : round.winning,
      seed: done ? round.seed : null,
      result: done ? round.result : null,
      you: mine.length
        ? {
            bets: mine.map((b) => ({ segment: b.segment, stake: b.stake })),
            stake: mine.reduce((a, b) => a + b.stake, 0),
            payout: done ? mine.reduce((a, b) => a + (b.payout || 0), 0) : null,
          }
        : null,
      lastRound: lastSettled,
    };
  }

  const broadcast = () => publish(`${GAME}:state`, snapshot());

  function openRound() {
    const id = `${config.PREFIX || "BW"}-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const seed = fair.newSeed();
    round = {
      id,
      phase: "open",
      seed,
      hash: fair.hashSeed(seed),
      winning: fair.drawStop(seed, GAME, id, config.SEGMENTS) - 1,
      bets: [],
      carryIn: carry,
      endsAt: now() + config.OPEN_MS,
      result: null,
    };
    carry = 0;
    broadcast();
    later(spin, config.OPEN_MS);
    if (config.BOTS) seedBots(round.id);
    return snapshot();
  }

  // Play credits only: a few fill-in players drift in with small stakes.
  function seedBots(id) {
    const n = config.BOT_PLAYERS;
    for (let i = 0; i < n; i++) {
      later(async () => {
        if (!round || round.id !== id || round.phase !== "open") return;
        const amount = [25, 50, 100][crypto.randomInt(0, 3)];
        const bot = await seatBot(store, amount);
        if (!bot) return;
        if (!round || round.id !== id || round.phase !== "open") return store.credit(bot.userId, amount);
        round.bets.push({ userId: bot.userId, name: bot.name, bot: true, segment: crypto.randomInt(0, config.SEGMENTS), stake: amount });
        broadcast();
      }, 400 + Math.random() * (config.OPEN_MS * 0.8));
    }
  }

  async function stake(userId, { segment, stake: amount }) {
    if (!round || round.phase !== "open") throw new GameError("The wheel is spinning. The next spin opens shortly.");
    if (!Number.isInteger(segment) || segment < 0 || segment >= config.SEGMENTS) throw new GameError("Pick a segment.");
    const key = String(userId);
    const already = round.bets.filter((b) => b.userId === key).reduce((a, b) => a + b.stake, 0);
    if (!Number.isInteger(amount) || amount < COMMON.MIN_STAKE || already + amount > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100} per spin.`);
    }
    const id = round.id;
    const user = await store.debit(key, amount);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    if (!round || round.id !== id || round.phase !== "open") {
      await store.credit(key, amount);
      throw new GameError("The wheel is spinning. The next spin opens shortly.");
    }
    const existing = round.bets.find((b) => b.userId === key && b.segment === segment);
    if (existing) existing.stake += amount;
    else round.bets.push({ userId: key, name: user.name, segment, stake: amount });
    notify(key, "wallet", { balance: user.balance });
    broadcast();
    return snapshot(key);
  }

  function spin() {
    if (!round || round.phase !== "open") return;
    if (!round.bets.length) {
      round.endsAt = now() + config.OPEN_MS;
      broadcast();
      later(spin, config.OPEN_MS);
      return;
    }
    round.phase = "spinning";
    round.endsAt = now() + config.SPIN_MS;
    broadcast();
    later(settle, config.SPIN_MS);
  }

  async function settle() {
    if (!round || round.phase === "result") return;
    round.phase = "result";
    const s = settleWheel(round.bets, { winning: round.winning, feeRate: config.FEE_RATE, carryIn: round.carryIn });
    round.bets.forEach((b, i) => (b.payout = s.payouts[i]));
    const winStake = round.bets.filter((b) => b.segment === round.winning).reduce((a, b) => a + b.stake, 0);
    round.result = {
      winning: round.winning,
      fee: s.fee,
      paidOut: s.paidOut,
      carryOut: s.carryOut,
      winners: new Set(round.bets.filter((b) => b.payout > 0).map((b) => b.userId)).size,
      multiplier: winStake ? Math.round((s.paidOut / winStake) * 10) / 10 : null,
    };
    carry = s.carryOut;
    round.endsAt = now() + config.RESULT_MS;
    lastSettled = { roundId: round.id, ...round.result };
    for (const b of round.bets) {
      if (b.payout > 0) {
        const user = await store.credit(b.userId, b.payout);
        if (user && !b.bot) notify(b.userId, "wallet", { balance: user.balance });
      }
    }
    const record = {
      id: round.id,
      game: GAME,
      settledAt: new Date(now()),
      feeRate: config.FEE_RATE,
      seed: round.seed,
      hash: round.hash,
      segments: config.SEGMENTS,
      pool: round.bets.reduce((a, b) => a + b.stake, 0),
      carryIn: round.carryIn,
      ...round.result,
      bets: round.bets.map((b) => ({ name: b.name, segment: b.segment, stake: b.stake, payout: b.payout })),
    };
    await store.saveRound(record);
    broadcast();
    later(openRound, config.RESULT_MS);
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
      timers.forEach(clearTimeout);
    },
    state: snapshot,
    stake,
    openRound,
    spin,
    settle,
    get round() {
      return round;
    },
  };
}

module.exports = { createBigWheel };
