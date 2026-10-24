// Runs against a real MongoDB when MONGODB_URL is set (CI); skipped otherwise.
const mongoose = require("mongoose");
const { mongoStore } = require("../services/store");

const run = process.env.MONGODB_URL ? describe : describe.skip;

run("MongoDB store", () => {
  let store;
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URL);
    await mongoose.connection.dropDatabase();
    store = mongoStore();
  });
  afterAll(() => mongoose.disconnect());

  test("debits never overdraw and respect a pause", async () => {
    const user = await store.createUser({ name: "Tendai", phone: "+263771234567", balance: 100 });
    expect((await store.debit(user.id, 60)).balance).toBe(40);
    expect(await store.debit(user.id, 60)).toBeNull();
    expect((await store.credit(user.id, 20)).balance).toBe(60);
    await store.update(user.id, { excludedUntil: new Date(Date.now() + 60000) });
    expect(await store.debit(user.id, 10)).toBeNull();
  });

  test("rounds are logged newest first", async () => {
    await store.saveRound({ id: "HO-1", game: "hop-off", settledAt: new Date(1000), pool: 1 });
    await store.saveRound({ id: "HO-2", game: "hop-off", settledAt: new Date(2000), pool: 2 });
    const rounds = await store.listRounds("hop-off", 10);
    expect(rounds.map((r) => r.id)).toEqual(["HO-2", "HO-1"]);
    expect((await store.getRound("HO-1")).pool).toBe(1);
  });
});
