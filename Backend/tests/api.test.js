process.env.ENVIRONMENT = "test";
const request = require("supertest");
const { createApp } = require("../app");
const { memoryStore } = require("../services/store");
const { createHopOff } = require("../games/hopOff");
const { createUnderdog } = require("../games/underdog");

function setup() {
  const store = memoryStore();
  const hopOff = createHopOff({ store, autoRun: false });
  const underdog = createUnderdog({ store, autoRun: false });
  hopOff.openBoarding();
  underdog.openRound();
  return { app: createApp({ store, hopOff, underdog }), store, hopOff, underdog };
}

async function signIn(app, phone = "+263 77 123 4567") {
  const res = await request(app).post("/auth/demo").send({ name: "Tendai", phone, over18: true });
  return res.body;
}

test("demo sign-in needs a name, an international number and 18+", async () => {
  const { app } = setup();
  expect((await request(app).post("/auth/demo").send({ name: "Tendai", phone: "+263771234567", over18: false })).status).toBe(400);
  expect((await request(app).post("/auth/demo").send({ name: "Tendai", phone: "12", over18: true })).status).toBe(400);
  const first = await signIn(app);
  expect(first.user.phone).toBe("+263771234567");
  expect(first.user.balance).toBe(10000);
  // Local Zimbabwean format finds the same player.
  const again = await signIn(app, "0771234567");
  expect(again.user.id).toBe(first.user.id);
  const kenya = await signIn(app, "+254 712 345678");
  expect(kenya.user.id).not.toBe(first.user.id);
});

test("a full Hop Off round through the API", async () => {
  const { app, hopOff } = setup();
  const { token } = await signIn(app);
  const join = await request(app).post("/games/hop-off/join").set("token", token).send({ stake: 100 });
  expect(join.status).toBe(200);
  expect(join.body.you.stake).toBe(100);
  expect((await request(app).get("/me").set("token", token)).body.user.balance).toBe(9900);
  const early = await request(app).post("/games/hop-off/off").set("token", token);
  expect(early.status).toBe(400);
  await hopOff.depart();
  // Unless the checkpoint is stop 1, the ride is now at stop 1: get off.
  if (hopOff.round.phase === "riding") {
    const off = await request(app).post("/games/hop-off/off").set("Authorization", `Bearer ${token}`);
    expect(off.body.you.offAt).toBe(1);
  }
  await new Promise((r) => setImmediate(r));
  const log = await request(app).get("/rounds/hop-off");
  expect(log.body.rounds).toHaveLength(1);
  const r = log.body.rounds[0];
  const check = await request(app).get("/fair/verify").query({ seed: r.seed, hash: r.hash, roundId: r.id, stop: r.checkpoint });
  expect(check.body.ok).toBe(true);
  expect((await request(app).get(`/rounds/id/${r.id}`)).body.round.id).toBe(r.id);
});

test("Underdog staking, pausing and demo reset", async () => {
  const { app } = setup();
  const { token } = await signIn(app);
  const bet = await request(app).post("/games/underdog/stake").set("token", token).send({ side: "a", stake: 200 });
  expect(bet.body.you).toEqual({ side: "a", stake: 200, payout: null });
  const reset = await request(app).post("/me/reset-demo").set("token", token);
  expect(reset.body.user.balance).toBe(10000);
  expect((await request(app).post("/me/pause").set("token", token).send({ days: 3 })).status).toBe(400);
  const pause = await request(app).post("/me/pause").set("token", token).send({ days: 1 });
  expect(pause.body.user.excludedUntil).toBeTruthy();
  const blocked = await request(app).post("/games/underdog/stake").set("token", token).send({ side: "a", stake: 100 });
  expect(blocked.status).toBe(400);
  expect(blocked.body.message).toMatch(/paused/);
});

test("signed-out players can watch but not play", async () => {
  const { app } = setup();
  expect((await request(app).get("/games/hop-off")).body.phase).toBe("boarding");
  expect((await request(app).get("/games/config")).body.hopOff.stops).toBe(10);
  expect((await request(app).post("/games/hop-off/join").send({ stake: 100 })).status).toBe(401);
});
