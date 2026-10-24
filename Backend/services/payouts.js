// Pool maths. Pure functions over whole cents, so they are easy to test and
// to publish. Every function returns a full settlement: who gets what, the
// fee, and anything carried into the next round. Nothing is created or lost:
// sum(payouts) + fee + carryOut === sum(stakes) + carryIn.

const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

// Splits `amount` cents across `weights` in proportion, using the largest
// remainder method so the parts always add up to exactly `amount`.
function splitByWeight(amount, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (amount <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const parts = raw.map(Math.floor);
  let left = amount - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value), weight: weights[index] }))
    .sort((a, b) => b.frac - a.frac || b.weight - a.weight || a.index - b.index);
  for (let i = 0; left > 0; i = (i + 1) % order.length) {
    parts[order[i].index] += 1;
    left -= 1;
  }
  return parts;
}

const feeOf = (amount, rate) => Math.floor(amount * rate);

// Hop Off. riders: [{ userId, stake, offAt }] where offAt is the stop the
// rider got off at, or null if the checkpoint caught them.
function settleHopOff(riders, { feeRate, carryIn = 0 }) {
  const survivors = riders.filter((r) => r.offAt != null);
  const caught = riders.filter((r) => r.offAt == null);
  const caughtPot = sum(caught, (r) => r.stake);
  const fee = feeOf(caughtPot, feeRate);
  const bonus = caughtPot - fee + carryIn;

  if (survivors.length === 0) {
    // Everyone was caught: the money rides on in the next round.
    return {
      payouts: riders.map((r) => ({ userId: r.userId, stake: r.stake, payout: 0 })),
      fee,
      carryOut: bonus,
      caughtPot,
    };
  }

  const shares = splitByWeight(bonus, survivors.map((r) => r.stake * r.offAt));
  const shareOf = new Map(survivors.map((r, i) => [r, shares[i]]));
  return {
    payouts: riders.map((r) => ({
      userId: r.userId,
      stake: r.stake,
      payout: r.offAt == null ? 0 : r.stake + shareOf.get(r),
    })),
    fee,
    carryOut: 0,
    caughtPot,
  };
}

// Underdog. bets: [{ userId, side: "a" | "b", stake }]. The side with less
// money wins. A tie, or a side nobody backed, refunds everyone with no fee.
function settleUnderdog(bets, { feeRate }) {
  const totals = {
    a: sum(bets.filter((b) => b.side === "a"), (b) => b.stake),
    b: sum(bets.filter((b) => b.side === "b"), (b) => b.stake),
  };
  const refund = () => ({
    winner: null,
    totals,
    fee: 0,
    payouts: bets.map((b) => ({ userId: b.userId, side: b.side, stake: b.stake, payout: b.stake })),
  });
  if (totals.a === 0 || totals.b === 0 || totals.a === totals.b) return refund();

  const winner = totals.a < totals.b ? "a" : "b";
  const losingPot = totals[winner === "a" ? "b" : "a"];
  const fee = feeOf(losingPot, feeRate);
  const winners = bets.filter((b) => b.side === winner);
  const shares = splitByWeight(losingPot - fee, winners.map((b) => b.stake));
  const shareOf = new Map(winners.map((b, i) => [b, shares[i]]));
  return {
    winner,
    totals,
    fee,
    payouts: bets.map((b) => ({
      userId: b.userId,
      side: b.side,
      stake: b.stake,
      payout: b.side === winner ? b.stake + shareOf.get(b) : 0,
    })),
  };
}

module.exports = { splitByWeight, settleHopOff, settleUnderdog };
