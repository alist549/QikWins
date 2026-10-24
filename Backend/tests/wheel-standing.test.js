const { memoryStore } = require("../services/store");
const { createBigWheel } = require("../games/bigWheel");
const { createLastStanding } = require("../games/lastStanding");
const { settleWheel, settleStanding } = require("../services/payouts");
const fair = require("../services/fair");
const { WHEEL, STANDING } = require("../config/games");

async function players(store, n, balance = 1000) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(await store.createUser({ name: `P${i}`, phone: `+2637720000${String(i).padStart(2, "0")}`, balance }));
  return list;
}

const sumOf = (list) => list.reduce((a, b) => a + b, 0);

describe("Big Wheel payouts", () => {
  test("winners share the wheel by stake; the fee comes from losing stakes only", () => {
    const bets = [
      { segment: 3, stake: 100 },
      { segment: 3, stake: 50 },
      { segment: 0, stake: 500 },
      { segment: 7, stake: 350 },
    ];
    const s = settleWheel(bets, { winning: 3, feeRate: 0.1 });
    expect(s.fee).toBe(85);
    expect(s.payouts).toEqual([610, 305, 0, 0]);
    expect(sumOf(s.payouts) + s.fee).toBe(1000);
  });

  test("a lonely winner gets a huge multiple", () => {
    const bets = [{ segment: 5, stake: 25 }, ...Array.from({ length: 20 }, (_, i) => ({ segment: i % 4, stake: 100 }))];
    const s = settleWheel(bets, { winning: 5, feeRate: 0.1 });
    expect(s.payouts[0] / 25).toBeGreaterThan(70);
  });

  test("no winner: the wheel rolls over, less the fee", () => {
    const s = settleWheel([{ segment: 1, stake: 200 }], { winning: 2, feeRate: 0.1, carryIn: 50 });
    expect(s).toMatchObject({ fee: 20, paidOut: 0, carryOut: 230 });
  });
});

describe("Big Wheel rounds", () => {
  test("stakes, spin, a fair draw and payouts", async () => {
    const store = memoryStore();
    const game = createBigWheel({ store, autoRun: false, config: { ...WHEEL, BOTS: false } });
    const [a, b] = await players(store, 2);
    game.openRound();
    const win = game.round.winning;
    await game.stake(a.id, { segment: win, stake: 100 });
    await game.stake(b.id, { segment: (win + 1) % 12, stake: 300 });
    const open = game.state(a.id);
    expect(open.winning).toBeNull();
    expect(open.pays[win]).toBe(3.7); // (400 - 30) / 100
    game.spin();
    expect(game.state().phase).toBe("spinning");
    const record = await game.settle();
    expect(record.bets.map((x) => x.payout)).toEqual([370, 0]);
    expect((await store.getUser(a.id)).balance).toBe(900 + 370);
    expect(fair.verifyStop({ seed: record.seed, hash: record.hash, game: "big-wheel", roundId: record.id, stops: 12, stop: win + 1 }).ok).toBe(true);
  });

  test("rejects stakes over the per-spin limit and on a bad segment", async () => {
    const store = memoryStore();
    const game = createBigWheel({ store, autoRun: false, config: { ...WHEEL, BOTS: false } });
    const [a] = await players(store, 1, 5000);
    game.openRound();
    await game.stake(a.id, { segment: 0, stake: 400 });
    await expect(game.stake(a.id, { segment: 1, stake: 200 })).rejects.toThrow("per spin");
    await expect(game.stake(a.id, { segment: 12, stake: 100 })).rejects.toThrow("segment");
  });
});

describe("Last Standing", () => {
  test("survivors share it all, less a fee from the knocked-out stakes", () => {
    const s = settleStanding(32, 1, { stake: 100, feeRate: 0.1 });
    expect(s).toEqual({ fee: 310, shares: [2890] });
    const two = settleStanding(10, 3, { stake: 100, feeRate: 0.1 });
    expect(sumOf(two.shares) + two.fee).toBe(1000);
  });

  test("the smaller side survives each round until one is left", async () => {
    const store = memoryStore();
    const config = { ...STANDING, SEATS: 5, BOTS: false };
    const game = createLastStanding({ store, autoRun: false, config });
    const ps = await players(store, 5);
    for (const p of ps) await game.join(p.id, { stake: 100 });
    expect(game.state(ps[0].id).status).toBe("picking");
    const table = game.tableOf(ps[0].id);

    // Round 1: two pick A, three pick B. A survives.
    ["a", "a", "b", "b", "b"].forEach((side, i) => game.pick(ps[i].id, side));
    await game.reveal(table);
    expect(game.state(ps[0].id).table.alive).toBe(2);
    expect(game.state(ps[4].id).table.you.out).toBe(true);

    // Round 2: a tie keeps both; round 3: one doesn't pick and is out.
    game.startRound(table);
    game.pick(ps[0].id, "a");
    game.pick(ps[1].id, "b");
    await game.reveal(table);
    expect(game.state(ps[0].id).table.alive).toBe(2);
    game.startRound(table);
    game.pick(ps[0].id, "b");
    await game.reveal(table);
    await game.finish(table);

    const end = game.state(ps[0].id);
    expect(end.status).toBe("done");
    expect(end.table.result).toMatchObject({ survivors: 1, fee: 40, each: 460, multiplier: 4.6 });
    expect((await store.getUser(ps[0].id)).balance).toBe(900 + 460);
    expect((await store.listRounds("last-standing", 1))[0].history).toHaveLength(3);
  });

  test("demo bots fill the knockout and pick for themselves", async () => {
    const store = memoryStore();
    const game = createLastStanding({ store, autoRun: false, config: { ...STANDING, SEATS: 8 } });
    const [a] = await players(store, 1);
    await game.join(a.id, { stake: 50 });
    const table = game.tableOf(a.id);
    await game.fillWithBots(table);
    expect(table.seats).toHaveLength(8);
    game.pick(a.id, "a");
    await game.reveal(table);
    expect(table.history[0].counts.a + table.history[0].counts.b).toBe(8);
  });
});

describe("Practice players", () => {
  test("are always off in real-money mode", () => {
    process.env.REAL_MONEY = "on";
    jest.isolateModules(() => {
      const cfg = require("../config/games");
      expect([cfg.DOUBLE.BOTS, cfg.SEVEN.BOTS, cfg.WHEEL.BOTS, cfg.STANDING.BOTS]).toEqual([false, false, false, false]);
    });
    delete process.env.REAL_MONEY;
  });
});
