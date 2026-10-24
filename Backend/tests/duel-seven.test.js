const { memoryStore } = require("../services/store");
const { createDoubleOrNothing } = require("../games/doubleOrNothing");
const { createSevenX } = require("../games/sevenX");
const { settleDuel, settleSeven } = require("../services/payouts");

async function players(store, n, balance = 1000) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(await store.createUser({ name: `P${i}`, phone: `+26377100000${i}`, balance }));
  return list;
}

describe("Double or Nothing", () => {
  test("winner takes both stakes less 10% of the loser's", () => {
    expect(settleDuel(100, { feeRate: 0.1 })).toEqual({ fee: 10, winnerPayout: 190 });
  });

  test("matches two players at the same stake and plays first to 2, replaying ties", async () => {
    const store = memoryStore();
    const game = createDoubleOrNothing({ store, autoRun: false });
    const [a, b, c] = await players(store, 3);
    expect((await game.enqueue(a.id, { stake: 100 })).status).toBe("queued");
    expect((await game.enqueue(c.id, { stake: 200 })).status).toBe("queued");
    const view = await game.enqueue(b.id, { stake: 100 });
    expect(view.status).toBe("playing");
    expect(view.match.opponent.name).toBe("P0");

    await game.move(a.id, "rock");
    expect(game.state(b.id).match.opponentPicked).toBe(true);
    await game.move(b.id, "rock"); // tie, replayed
    expect(game.state(a.id).match.wins).toEqual([0, 0]);
    await game.move(a.id, "paper");
    await game.move(b.id, "rock"); // a 1-0
    await game.move(a.id, "scissors");
    const end = await game.move(b.id, "paper"); // a 2-0
    expect(end.status).toBe("done");
    expect(end.match.result).toEqual({ won: false, payout: 0, fee: 10 });
    expect(end.match.history.map((h) => h.result)).toEqual(["tie", "lose", "lose"]);
    expect((await store.getUser(a.id)).balance).toBe(900 + 190);
    expect((await store.getUser(b.id)).balance).toBe(900);
    expect((await store.listRounds("double", 5))[0].fee).toBe(10);
  });

  test("a queued player can cancel for a refund; a slow player gets a random move", async () => {
    const store = memoryStore();
    const game = createDoubleOrNothing({ store, autoRun: false, random: () => 0 });
    const [a, b] = await players(store, 2);
    await game.enqueue(a.id, { stake: 100 });
    await game.cancel(a.id);
    expect((await store.getUser(a.id)).balance).toBe(1000);
    await game.enqueue(a.id, { stake: 100 });
    await game.enqueue(b.id, { stake: 100 });
    await game.move(a.id, "paper");
    await game.timeOut(game.matchOf(a.id)); // b gets "rock" (random 0)
    expect(game.state(a.id).match.wins).toEqual([1, 0]);
  });

  test("a demo bot takes the empty seat", async () => {
    const store = memoryStore();
    const game = createDoubleOrNothing({ store, autoRun: false });
    const [a] = await players(store, 1);
    await game.enqueue(a.id, { stake: 100 });
    await game.botJoins(a.id, 100);
    const view = game.state(a.id);
    expect(view.status).toBe("playing");
    expect(view.match.opponent.bot).toBe(true);
    expect(view.match.opponent.name).toMatch(/\(bot\)/);
  });
});

describe("7x", () => {
  test("a lone winner takes all eight stakes less 10% of the other seven", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({ userId: `p${i}`, total: i === 3 ? 17 : 9 }));
    const s = settleSeven(players, { stake: 100, feeRate: 0.1 });
    expect(s.fee).toBe(70);
    expect(s.payouts[3].payout).toBe(730);
    expect(s.payouts.reduce((t, p) => t + p.payout, 0) + s.fee).toBe(800);
  });

  test("ties split the pot", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({ userId: `p${i}`, total: i < 2 ? 15 : 8 }));
    const s = settleSeven(players, { stake: 100, feeRate: 0.1 });
    expect(s.payouts[0].payout).toBe(100 + 270);
    expect(s.payouts[1].payout).toBe(100 + 270);
  });

  test("eight seats fill, dice roll, one re-roll each, highest total wins", async () => {
    const store = memoryStore();
    let n = 0;
    // Seat 0 rolls 6s, everyone else 1s, re-rolls give 2s.
    const dice = () => (n++ < 3 ? 6 : n > 24 ? 2 : 1);
    const game = createSevenX({ store, autoRun: false, dice });
    const people = await players(store, 8);
    for (const p of people) await game.join(p.id, { stake: 100 });
    const view = game.state(people[1].id);
    expect(view.status).toBe("rolling");
    expect(view.table.seats.find((s) => s.you).total).toBe(3);
    const after = game.reroll(people[1].id);
    expect(after.table.seats.find((s) => s.you).total).toBe(6);
    expect(() => game.reroll(people[1].id)).toThrow("used your re-roll");
    await game.finish(game.tableOf(people[0].id));
    expect(game.state(people[0].id).status).toBe("done");
    expect((await store.getUser(people[0].id)).balance).toBe(900 + 730);
    expect((await store.getUser(people[1].id)).balance).toBe(900);
  });

  test("bots fill the empty seats; leaving before the roll refunds", async () => {
    const store = memoryStore();
    const game = createSevenX({ store, autoRun: false });
    const [a, b] = await players(store, 2);
    await game.join(b.id, { stake: 50 });
    await game.leave(b.id);
    expect((await store.getUser(b.id)).balance).toBe(1000);
    await game.join(a.id, { stake: 50 });
    await game.fillWithBots(game.tableOf(a.id));
    const view = game.state(a.id);
    expect(view.status).toBe("rolling");
    expect(view.table.seats.filter((s) => s.bot)).toHaveLength(7);
  });
});
