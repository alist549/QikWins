const { memoryStore } = require("../services/store");
const { createHopOff } = require("../games/hopOff");
const { createUnderdog } = require("../games/underdog");
const { HOP_OFF, UNDERDOG } = require("../config/games");

async function players(store, n) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(await store.createUser({ name: `P${i}`, phone: `+26377000000${i}`, balance: 1000 }));
  return list;
}

describe("Hop Off", () => {
  async function ride(checkpoint) {
    const store = memoryStore();
    const game = createHopOff({ store, autoRun: false });
    game.openBoarding();
    game.round.checkpoint = checkpoint;
    const [a, b, c] = await players(store, 3);
    await game.join(a.id, { stake: 100, presetStop: 2 });
    await game.join(b.id, { stake: 100 });
    await game.join(c.id, { stake: 100 });
    return { store, game, a, b, c };
  }

  test("stakes come out of the wallet and boarding rules hold", async () => {
    const { store, game, a } = await ride(5);
    expect((await store.getUser(a.id)).balance).toBe(900);
    await expect(game.join(a.id, { stake: 100 })).rejects.toThrow("already on this ride");
    await expect(game.join("nobody", { stake: 100 })).rejects.toThrow("Not enough balance");
    const [d] = await players(store, 1);
    await expect(game.join(d.id, { stake: 10 })).rejects.toThrow("Stakes are");
  });

  test("survivors are paid from the caught riders, the fee comes from the caught money", async () => {
    const { store, game, a, b, c } = await ride(5);
    game.depart(); // stop 1
    await game.arrive(); // stop 2: a's preset
    game.getOff(b.id); // b off at stop 2
    await game.arrive(); // 3
    await game.arrive(); // 4
    const record = await game.arrive(); // 5: checkpoint, c caught
    expect(game.round.phase).toBe("settled");
    expect(record.checkpoint).toBe(5);
    expect(record.fee).toBe(10);
    expect((await store.getUser(a.id)).balance).toBe(900 + 145);
    expect((await store.getUser(b.id)).balance).toBe(900 + 145);
    expect((await store.getUser(c.id)).balance).toBe(900);
    expect((await store.listRounds("hop-off", 5))[0].id).toBe(record.id);
    // The seed is only revealed after the round.
    expect(game.state().seed).toBe(record.seed);
  });

  test("the seed stays secret until the round settles", async () => {
    const { game } = await ride(5);
    expect(game.state().seed).toBeNull();
    expect(game.state().checkpoint).toBeNull();
    expect(game.state().hash).toHaveLength(64);
  });

  test("a preset on the checkpoint stop is caught", async () => {
    const { store, game, a } = await ride(2);
    game.depart();
    await game.arrive();
    expect(game.round.phase).toBe("settled");
    expect((await store.getUser(a.id)).balance).toBe(900);
  });

  test("everyone caught carries the pot into the next ride", async () => {
    const { game } = await ride(1);
    await game.depart();
    expect(game.round.phase).toBe("settled");
    game.openBoarding();
    expect(game.round.carryIn).toBe(300 - 30);
  });

  test("an empty ride waits instead of leaving", () => {
    const game = createHopOff({ store: memoryStore(), autoRun: false });
    game.openBoarding();
    game.depart();
    expect(game.round.phase).toBe("boarding");
  });

  test("default rules", () => {
    expect(HOP_OFF.STOPS).toBe(10);
    expect(HOP_OFF.FEE_RATE).toBe(0.1);
  });
});

describe("Underdog", () => {
  test("totals stay hidden until the lock, then the smaller side wins", async () => {
    const store = memoryStore();
    const game = createUnderdog({ store, autoRun: false });
    game.openRound();
    const [a, b, c] = await players(store, 3);
    await game.stake(a.id, { side: "a", stake: 100 });
    await game.stake(b.id, { side: "a", stake: 100 });
    await game.stake(c.id, { side: "b", stake: 100 });
    await expect(game.stake(c.id, { side: "a", stake: 100 })).rejects.toThrow("other side");
    expect(game.state().totals).toBeNull();
    expect(game.state().pool).toBe(300);
    const record = await game.lock();
    expect(record.winner).toBe("b");
    expect(record.totals).toEqual({ a: 200, b: 100 });
    expect((await store.getUser(c.id)).balance).toBe(900 + 100 + 180);
    expect((await store.getUser(a.id)).balance).toBe(900);
  });

  test("questions rotate", () => {
    const game = createUnderdog({ store: memoryStore(), autoRun: false });
    game.openRound();
    const first = game.round.question;
    game.openRound();
    expect(game.round.question).not.toEqual(first);
    expect(UNDERDOG.QUESTIONS.length).toBeGreaterThan(5);
  });
});
