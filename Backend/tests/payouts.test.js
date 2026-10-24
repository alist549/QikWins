const { splitByWeight, settleHopOff, settleUnderdog } = require("../services/payouts");

const total = (s) => s.payouts.reduce((t, p) => t + p.payout, 0);

describe("splitByWeight", () => {
  test("parts always add up to the amount", () => {
    expect(splitByWeight(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitByWeight(3600, [60, 80, 50]).reduce((a, b) => a + b)).toBe(3600);
    expect(splitByWeight(0, [1, 2])).toEqual([0, 0]);
  });
});

describe("Hop Off settlement", () => {
  // The worked example in the brainstorm doc: 100 riders at $1, checkpoint
  // at stop 6, 30 off at stop 2, 20 at stop 4, 10 at stop 5, 40 caught.
  const riders = [
    ...Array.from({ length: 30 }, (_, i) => ({ userId: `a${i}`, stake: 100, offAt: 2 })),
    ...Array.from({ length: 20 }, (_, i) => ({ userId: `b${i}`, stake: 100, offAt: 4 })),
    ...Array.from({ length: 10 }, (_, i) => ({ userId: `c${i}`, stake: 100, offAt: 5 })),
    ...Array.from({ length: 40 }, (_, i) => ({ userId: `d${i}`, stake: 100, offAt: null })),
  ];

  test("matches the doc's example", () => {
    const s = settleHopOff(riders, { feeRate: 0.1 });
    expect(s.caughtPot).toBe(4000);
    expect(s.fee).toBe(400);
    const by = (prefix) => s.payouts.filter((p) => p.userId.startsWith(prefix)).map((p) => p.payout);
    by("a").forEach((p) => expect(p).toBeGreaterThanOrEqual(137) && expect(p).toBeLessThanOrEqual(138));
    by("b").forEach((p) => expect([175, 176]).toContain(p));
    by("c").forEach((p) => expect([194, 195]).toContain(p));
    by("d").forEach((p) => expect(p).toBe(0));
    expect(total(s) + s.fee).toBe(10000);
  });

  test("a survivor never gets back less than their stake", () => {
    const s = settleHopOff(
      [
        { userId: "x", stake: 500, offAt: 1 },
        { userId: "y", stake: 25, offAt: 9 },
      ],
      { feeRate: 0.1 }
    );
    expect(s.payouts.map((p) => p.payout)).toEqual([500, 25]);
    expect(s.fee).toBe(0);
  });

  test("everyone caught: the money carries into the next ride", () => {
    const s = settleHopOff([{ userId: "x", stake: 200, offAt: null }], { feeRate: 0.1 });
    expect(s.fee).toBe(20);
    expect(s.carryOut).toBe(180);
    const next = settleHopOff(
      [
        { userId: "y", stake: 100, offAt: 3 },
        { userId: "z", stake: 100, offAt: 1 },
      ],
      { feeRate: 0.1, carryIn: s.carryOut }
    );
    expect(total(next)).toBe(200 + 180);
    expect(next.payouts[0].payout).toBe(100 + 135);
  });
});

describe("Underdog settlement", () => {
  test("the side with less money wins (doc example: $130 vs $70)", () => {
    const bets = [
      ...Array.from({ length: 130 }, (_, i) => ({ userId: `a${i}`, side: "a", stake: 100 })),
      ...Array.from({ length: 70 }, (_, i) => ({ userId: `b${i}`, side: "b", stake: 100 })),
    ];
    const s = settleUnderdog(bets, { feeRate: 0.1 });
    expect(s.winner).toBe("b");
    expect(s.fee).toBe(1300);
    s.payouts.filter((p) => p.side === "b").forEach((p) => expect([267, 268]).toContain(p.payout));
    expect(total(s) + s.fee).toBe(20000);
  });

  test("a tie or an empty side refunds everyone with no fee", () => {
    const tie = settleUnderdog(
      [
        { userId: "x", side: "a", stake: 100 },
        { userId: "y", side: "b", stake: 100 },
      ],
      { feeRate: 0.1 }
    );
    expect(tie.winner).toBeNull();
    expect(tie.payouts.map((p) => p.payout)).toEqual([100, 100]);
    const oneSided = settleUnderdog([{ userId: "x", side: "a", stake: 100 }], { feeRate: 0.1 });
    expect(oneSided.fee).toBe(0);
    expect(oneSided.payouts[0].payout).toBe(100);
  });
});
