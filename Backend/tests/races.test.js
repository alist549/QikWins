const { memoryStore } = require("../services/store");
const { createBigWheel } = require("../games/bigWheel");
const fair = require("../services/fair");
const { RACES } = require("../config/games");

// The races run on the Big Wheel engine with racers for segments.
describe("races", () => {
  test("Marble Madness: backers of the drawn marble share the pool, verifiable from the seed", async () => {
    const config = { ...RACES.find((r) => r.GAME === "marble-madness"), BOTS: false };
    const store = memoryStore();
    const game = createBigWheel({ store, autoRun: false, config });
    const a = await store.createUser({ name: "A", phone: "+1001", balance: 1000 });
    const b = await store.createUser({ name: "B", phone: "+1002", balance: 1000 });
    game.openRound();
    const win = game.round.winning;
    expect(game.round.id.startsWith("MM-")).toBe(true);
    await game.stake(a.id, { segment: win, stake: 100 });
    await game.stake(b.id, { segment: (win + 1) % 8, stake: 100 });
    game.spin();
    const record = await game.settle();
    expect(record.game).toBe("marble-madness");
    expect(record.bets.map((x) => x.payout)).toEqual([190, 0]);
    expect(fair.verifyStop({ seed: record.seed, hash: record.hash, game: "marble-madness", roundId: record.id, stops: 8, stop: win + 1 }).ok).toBe(true);
  });

  test("every race has its own id and at least 4 racers", () => {
    expect(new Set(RACES.map((r) => r.GAME)).size).toBe(RACES.length);
    RACES.forEach((r) => expect(r.SEGMENTS).toBeGreaterThanOrEqual(4));
  });
});

describe("recent wins", () => {
  test("/wins lists winners from every game's log", async () => {
    const request = require("supertest");
    const { createApp } = require("../app");
    const store = memoryStore();
    await store.saveRound({ id: "MM-1", game: "marble-madness", settledAt: new Date(), bets: [{ name: "Ama", stake: 100, payout: 750 }, { name: "Kofi", stake: 100, payout: 0 }] });
    const res = await request(createApp({ store })).get("/wins");
    expect(res.body.wins).toEqual([expect.objectContaining({ name: "Ama", amount: 650, multiple: 7.5, game: "marble-madness" })]);
  });
});
