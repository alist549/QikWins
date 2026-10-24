process.env.ENVIRONMENT = "test";
const request = require("supertest");
const { createApp } = require("../app");
const { memoryStore } = require("../services/store");
const { createOtp } = require("../services/otp");
const { createHopOff } = require("../games/hopOff");
const { createUnderdog } = require("../games/underdog");
const { createDoubleOrNothing } = require("../games/doubleOrNothing");
const { createSevenX } = require("../games/sevenX");

function setup() {
  const store = memoryStore();
  const hopOff = createHopOff({ store, autoRun: false });
  const underdog = createUnderdog({ store, autoRun: false });
  hopOff.openBoarding();
  underdog.openRound();
  const double = createDoubleOrNothing({ store, autoRun: false });
  const seven = createSevenX({ store, autoRun: false });
  return { app: createApp({ store, hopOff, underdog, double, seven }), store, hopOff, underdog, double, seven };
}

async function signIn(app, phone = "+263 77 123 4567") {
  const res = await request(app).post("/auth/test").send({ name: "Tendai", phone, over18: true });
  return res.body;
}

const person = { firstName: "Tendai", surname: "Moyo", dob: "1995-04-12", phone: "+263 77 123 4567", email: "tendai@example.com" };

test("sign-up checks the details, then needs the SMS code before the account exists", async () => {
  const { app, store } = setup();
  const start = (fields) => request(app).post("/auth/signup/start").send({ ...person, ...fields });
  expect((await start({ phone: "12" })).status).toBe(400);
  expect((await start({ email: "nope" })).status).toBe(400);
  expect((await start({ firstName: "" })).status).toBe(400);
  const young = new Date(Date.now() - 17 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  expect((await start({ dob: young })).body.message).toMatch(/18 or older/);

  const ok = await start({});
  expect(ok.status).toBe(200);
  expect(ok.body.phone).toBe("+263771234567");
  expect(ok.body.devCode).toMatch(/^\d{6}$/);
  // No account until the code is entered.
  expect(await store.findUserByPhone("+263771234567")).toBeFalsy();
  // Asking again straight away is refused.
  expect((await start({})).status).toBe(429);

  const wrong = ok.body.devCode === "000000" ? "111111" : "000000";
  const bad = await request(app).post("/auth/verify").send({ requestId: ok.body.requestId, code: wrong });
  expect(bad.status).toBe(400);
  expect(bad.body.message).toMatch(/4 tries left/);
  const done = await request(app).post("/auth/verify").send({ requestId: ok.body.requestId, code: ok.body.devCode });
  expect(done.status).toBe(200);
  expect(done.body.token).toBeTruthy();
  expect(done.body.user).toMatchObject({ name: "Tendai M.", firstName: "Tendai", surname: "Moyo", dob: "1995-04-12", email: "tendai@example.com", balance: 10000 });
  expect(done.body.user.phoneVerifiedAt).toBeTruthy();
  // A used code can't be used twice.
  expect((await request(app).post("/auth/verify").send({ requestId: ok.body.requestId, code: ok.body.devCode })).status).toBe(400);
});

test("one account per phone and email; signing in is the phone and a code", async () => {
  let t = Date.now();
  const app = createApp({ store: memoryStore(), otp: createOtp({ now: () => t }) });
  const s = await request(app).post("/auth/signup/start").send(person);
  const first = await request(app).post("/auth/verify").send({ requestId: s.body.requestId, code: s.body.devCode });
  expect((await request(app).post("/auth/signup/start").send(person)).status).toBe(409);
  expect((await request(app).post("/auth/signup/start").send({ ...person, phone: "+254 712 345678" })).body.message).toMatch(/email/);
  expect((await request(app).post("/auth/login/start").send({ phone: "+254 712 345678" })).status).toBe(404);
  t += 31 * 1000;
  // Local Zimbabwean format finds the same player.
  const login = await request(app).post("/auth/login/start").send({ phone: "0771234567" });
  expect(login.status).toBe(200);
  const again = await request(app).post("/auth/verify").send({ requestId: login.body.requestId, code: login.body.devCode });
  expect(again.body.user.id).toBe(first.body.user.id);
});

test("codes are sent by SMS and never returned once a provider is set", async () => {
  const sent = [];
  const store = memoryStore();
  const app = createApp({ store, sms: { live: true, send: async (to, text) => sent.push({ to, text }) } });
  const s = await request(app).post("/auth/signup/start").send(person);
  expect(s.status).toBe(200);
  expect(s.body.devCode).toBeUndefined();
  expect(sent[0].to).toBe("+263771234567");
  const code = sent[0].text.match(/\d{6}/)[0];
  expect((await request(app).post("/auth/verify").send({ requestId: s.body.requestId, code })).status).toBe(200);
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

test("Underdog staking, pausing and topping up play credits", async () => {
  const { app } = setup();
  const { token } = await signIn(app);
  const bet = await request(app).post("/games/underdog/stake").set("token", token).send({ side: "a", stake: 200 });
  expect(bet.body.you).toEqual({ side: "a", stake: 200, payout: null });
  const reset = await request(app).post("/me/reset-credits").set("token", token);
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

test("Double or Nothing and 7x through the API", async () => {
  const { app } = setup();
  const a = await signIn(app, "+263771111111");
  const b = await signIn(app, "+254712345678");
  expect((await request(app).post("/games/double/queue").set("token", a.token).send({ stake: 100 })).body.status).toBe("queued");
  const matched = await request(app).post("/games/double/queue").set("token", b.token).send({ stake: 100 });
  expect(matched.body.status).toBe("playing");
  expect(matched.body.match.opponent.name).toBe("Tendai");
  const watching = await request(app).get("/games/double");
  expect(watching.body.status).toBe("idle");
  expect((await request(app).post("/games/double/move").set("token", a.token).send({ move: "lizard" })).status).toBe(400);

  const seat = await request(app).post("/games/seven/join").set("token", a.token).send({ stake: 50 });
  expect(seat.body.status).toBe("waiting");
  expect(seat.body.table.seats).toHaveLength(1);
  const left = await request(app).post("/games/seven/leave").set("token", a.token);
  expect(left.body.status).toBe("idle");
  expect((await request(app).get("/me").set("token", a.token)).body.user.balance).toBe(9900);
});
