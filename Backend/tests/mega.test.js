const { memoryStore } = require("../services/store");
const { createLastStanding } = require("../games/lastStanding");
const { MEGA } = require("../config/games");

// Mega Jackpot: the Last Standing engine with a big table.
describe("mega jackpot", () => {
  test("a big table sends counts, not every player, and practice players arrive in batches", async () => {
    const store = memoryStore();
    const events = [];
    const game = createLastStanding({ store, config: { ...MEGA, SEATS: 100, BOT_BATCH: 40 }, autoRun: false, notify: (id, name) => events.push(name), publish: (name) => events.push(name) });
    const me = await store.createUser({ name: "Tendai", phone: "+1555", balance: 10000 });
    await game.join(me.id, { stake: 100 });
    await game.fillWithBots(game.tableOf(me.id));
    const view = game.state(me.id);
    expect(view.table.seated).toBe(41);
    expect(view.table.players).toBeNull();
    expect(events).toContain("mega:lobby");
  });

  test("the headline prize: $1 in a full table pays the last one standing $2,250.10", () => {
    const { settleStanding } = require("../services/payouts");
    const s = settleStanding(2500, 1, { stake: 100, feeRate: MEGA.FEE_RATE });
    expect(s.shares[0]).toBe(225010);
  });
});
