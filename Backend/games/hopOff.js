const crypto = require("crypto");
const fair = require("../services/fair");
const { settleHopOff } = require("../services/payouts");
const { HOP_OFF, COMMON } = require("../config/games");

const GAME = "hop-off";

class GameError extends Error {}

// Hop Off, one shared ride at a time:
//   boarding: players stake (and may preset the stop they'll get off at)
//   riding:   the ride moves one stop every STOP_MS; tap "Get off" any time
//   settled:  the checkpoint is revealed and the pool is paid out
// The checkpoint stop comes from a seed whose hash is published when
// boarding opens (see services/fair.js), so it can't change mid-ride.
//
// publish(event, data) goes to everyone watching; notify(userId, event,
// data) to one player. With autoRun off (tests), call the steps directly.
function createHopOff({ store, publish = () => {}, notify = () => {}, config = HOP_OFF, now = Date.now, autoRun = true }) {
  let round = null;
  let carry = 0;
  let timer = null;
  let stopped = false;
  let lastSettled = null;

  const schedule = (fn, ms) => {
    if (!autoRun || stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => Promise.resolve(fn()).catch((e) => console.error("Hop Off:", e.message)), ms);
  };

  const ridersOf = () => [...round.riders.values()];
  const aboard = () => ridersOf().filter((r) => r.offAt == null);

  function snapshot(userId) {
    if (!round) return null;
    const riders = ridersOf();
    const settled = round.phase === "settled";
    const me = userId ? round.riders.get(String(userId)) : null;
    return {
      game: GAME,
      roundId: round.id,
      phase: round.phase,
      hash: round.hash,
      stops: config.STOPS,
      stop: round.stop,
      endsAt: round.endsAt,
      feeRate: config.FEE_RATE,
      riders: riders.length,
      aboard: aboard().length,
      pool: riders.reduce((t, r) => t + r.stake, 0),
      carryIn: round.carryIn,
      recentOff: round.offLog.slice(-8).reverse(),
      // Revealed only once the round is over.
      checkpoint: settled ? round.checkpoint : null,
      seed: settled ? round.seed : null,
      result: settled ? round.result : null,
      you: me ? { stake: me.stake, presetStop: me.presetStop, offAt: me.offAt, payout: me.payout ?? null } : null,
      lastRound: lastSettled,
    };
  }

  const broadcast = () => publish("hop-off:state", snapshot());

  function openBoarding() {
    const id = `HO-${now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const seed = fair.newSeed();
    round = {
      id,
      phase: "boarding",
      seed,
      hash: fair.hashSeed(seed),
      checkpoint: fair.drawStop(seed, GAME, id, config.STOPS),
      stop: 0,
      riders: new Map(),
      offLog: [],
      carryIn: carry,
      endsAt: now() + config.BOARDING_MS,
      result: null,
    };
    carry = 0;
    broadcast();
    schedule(depart, config.BOARDING_MS);
    return snapshot();
  }

  async function join(userId, { stake, presetStop = null }) {
    if (!round || round.phase !== "boarding") throw new GameError("Boarding has closed. Catch the next ride.");
    const key = String(userId);
    if (round.riders.has(key)) throw new GameError("You're already on this ride.");
    if (!Number.isInteger(stake) || stake < COMMON.MIN_STAKE || stake > COMMON.MAX_STAKE) {
      throw new GameError(`Stakes are ${COMMON.MIN_STAKE / 100} to ${COMMON.MAX_STAKE / 100} per ride.`);
    }
    if (presetStop != null && (!Number.isInteger(presetStop) || presetStop < 1 || presetStop > config.STOPS)) {
      throw new GameError("Pick a stop on the route.");
    }
    const id = round.id;
    const user = await store.debit(key, stake);
    if (!user) throw new GameError("Not enough balance, or your account is paused.");
    if (!round || round.id !== id || round.phase !== "boarding") {
      // Boarding closed while the stake was being taken: give it back.
      await store.credit(key, stake);
      throw new GameError("Boarding has closed. Catch the next ride.");
    }
    round.riders.set(key, { userId: key, name: user.name, stake, presetStop, offAt: null });
    notify(key, "wallet", { balance: user.balance });
    broadcast();
    return snapshot(key);
  }

  function depart() {
    if (!round || round.phase !== "boarding") return;
    if (round.riders.size === 0) {
      // Nobody aboard yet: keep boarding open rather than drive empty.
      round.endsAt = now() + config.BOARDING_MS;
      broadcast();
      schedule(depart, config.BOARDING_MS);
      return;
    }
    round.phase = "riding";
    return arrive();
  }

  function markOff(rider) {
    rider.offAt = round.stop;
    round.offLog.push({ name: rider.name, stop: round.stop });
  }

  // The ride reaches the next stop.
  function arrive() {
    if (!round || round.phase !== "riding") return;
    round.stop += 1;
    if (round.stop >= round.checkpoint) return settle();
    for (const rider of aboard()) {
      if (rider.presetStop != null && rider.presetStop <= round.stop) markOff(rider);
    }
    // Everyone got off: no need to keep driving.
    if (aboard().length === 0) return settle();
    round.endsAt = now() + config.STOP_MS;
    broadcast();
    schedule(arrive, config.STOP_MS);
  }

  function getOff(userId) {
    if (!round || round.phase !== "riding") throw new GameError("The ride isn't moving.");
    const rider = round.riders.get(String(userId));
    if (!rider) throw new GameError("You're not on this ride.");
    if (rider.offAt != null) throw new GameError("You already got off.");
    markOff(rider);
    if (aboard().length === 0) {
      clearTimeout(timer);
      settle().catch((e) => console.error("Hop Off:", e.message));
      return snapshot(userId);
    }
    broadcast();
    return snapshot(userId);
  }

  async function settle() {
    if (!round || round.phase === "settled") return;
    round.phase = "settled";
    round.stop = Math.max(round.stop, round.checkpoint);
    const riders = ridersOf();
    const s = settleHopOff(riders, { feeRate: config.FEE_RATE, carryIn: round.carryIn });
    carry = s.carryOut;
    s.payouts.forEach((p, i) => (riders[i].payout = p.payout));
    round.result = {
      fee: s.fee,
      caughtPot: s.caughtPot,
      carryOut: s.carryOut,
      caught: riders.filter((r) => r.offAt == null).length,
      survivors: riders.filter((r) => r.offAt != null).length,
      paidOut: s.payouts.reduce((t, p) => t + p.payout, 0),
    };
    round.endsAt = now() + config.SETTLED_MS;
    const record = {
      id: round.id,
      game: GAME,
      settledAt: new Date(now()),
      hash: round.hash,
      seed: round.seed,
      checkpoint: round.checkpoint,
      stops: config.STOPS,
      feeRate: config.FEE_RATE,
      carryIn: round.carryIn,
      pool: riders.reduce((t, r) => t + r.stake, 0),
      ...round.result,
      riders: riders.map((r) => ({ name: r.name, stake: r.stake, offAt: r.offAt, payout: r.payout })),
    };
    lastSettled = { roundId: round.id, checkpoint: round.checkpoint, ...round.result };
    for (const rider of riders) {
      if (rider.payout > 0) {
        const user = await store.credit(rider.userId, rider.payout);
        if (user) notify(rider.userId, "wallet", { balance: user.balance });
      }
    }
    await store.saveRound(record);
    broadcast();
    schedule(openBoarding, config.SETTLED_MS);
    return record;
  }

  return {
    GAME,
    start() {
      stopped = false;
      if (!round) openBoarding();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
    state: snapshot,
    join,
    getOff,
    // Steps, for tests.
    openBoarding,
    depart,
    arrive,
    settle,
    get round() {
      return round;
    },
  };
}

module.exports = { createHopOff, GameError };
