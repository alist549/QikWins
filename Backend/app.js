const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const { COMMON, HOP_OFF, UNDERDOG, DOUBLE, SEVEN, WHEEL, RACES, STANDING, MEGA, PENALTY } = require("./config/games");
const { normalizePhone } = require("./utils/phone");
const { signToken, requireUser, optionalUser } = require("./middlewares/auth");
const { GameError } = require("./games/hopOff");
const fair = require("./services/fair");
const { createSms } = require("./services/sms");
const { createOtp } = require("./services/otp");

// The HTTP API. Players act through these routes; live round updates go
// out over Socket.IO (socket.js).
// With `webDir` (the built website), the same server also serves the site,
// so one free web service runs everything (see render.yaml).
function createApp({ store, sms = createSms(), otp = createOtp(), hopOff, underdog, double, seven, wheel, races = [], standing, mega, penalties, webDir }) {
  const app = express();
  if (process.env.ENVIRONMENT !== "test") app.use(morgan("dev"));
  app.use(cors());
  app.use(express.json({ limit: "20kb" }));

  const auth = requireUser(store);
  const maybe = optionalUser();
  const valid = (req, res) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return true;
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  };
  // Game rule errors are the player's to fix: send them back as a 400.
  const play = (fn) =>
    asyncHandler(async (req, res) => {
      try {
        res.json(await fn(req));
      } catch (e) {
        if (e instanceof GameError) return res.status(400).json({ message: e.message });
        throw e;
      }
    });

  const status = (req, res) => res.json({ name: "QikWins", realMoney: COMMON.REAL_MONEY, store: store.kind });
  app.get("/health", status);
  if (webDir) app.use(express.static(webDir, { index: false, maxAge: "1h" }));
  else app.get("/", status);

  // Everything the app needs to explain the rules and the money.
  app.get("/games/config", (req, res) =>
    res.json({
      currency: COMMON.CURRENCY,
      minStake: COMMON.MIN_STAKE,
      maxStake: COMMON.MAX_STAKE,
      stakeChips: COMMON.STAKE_CHIPS,
      startBalance: COMMON.START_BALANCE,
      realMoney: COMMON.REAL_MONEY,
      licence: COMMON.LICENCE,
      hopOff: { stops: HOP_OFF.STOPS, feeRate: HOP_OFF.FEE_RATE, boardingMs: HOP_OFF.BOARDING_MS, stopMs: HOP_OFF.STOP_MS },
      underdog: { feeRate: UNDERDOG.FEE_RATE, openMs: UNDERDOG.OPEN_MS },
      double: { feeRate: DOUBLE.FEE_RATE, winsNeeded: DOUBLE.WINS_NEEDED, moveMs: DOUBLE.MOVE_MS },
      seven: { feeRate: SEVEN.FEE_RATE, seats: SEVEN.SEATS, rollMs: SEVEN.ROLL_MS },
      bigWheel: { feeRate: WHEEL.FEE_RATE, segments: WHEEL.SEGMENTS, openMs: WHEEL.OPEN_MS, spinMs: WHEEL.SPIN_MS },
      penalties: { feeRate: PENALTY.FEE_RATE, spots: PENALTY.SPOTS, kicksEach: PENALTY.KICKS_EACH, kickMs: PENALTY.KICK_MS, cupSeats: PENALTY.CUP_SEATS },
      lastStanding: { feeRate: STANDING.FEE_RATE, seats: STANDING.SEATS, pickMs: STANDING.PICK_MS, maxRounds: STANDING.MAX_ROUNDS },
      races: Object.fromEntries(RACES.map((r) => [r.GAME, { racers: r.SEGMENTS, openMs: r.OPEN_MS, runMs: r.SPIN_MS, feeRate: r.FEE_RATE }])),
      mega: { feeRate: MEGA.FEE_RATE, seats: MEGA.SEATS, pickMs: MEGA.PICK_MS, maxRounds: MEGA.MAX_ROUNDS },
    })
  );

  // Accounts. Signing up takes a first name, surname, date of birth (18+),
  // phone number and email, and only creates the account once the phone has
  // proved itself with a 6-digit SMS code. Signing in is the phone and a code.
  // With no SMS provider set yet, the code comes back in the reply (`devCode`)
  // and the site shows it, so sign-up keeps working until SMS is connected.
  const reply = async (res, phone, issued, purpose) => {
    if (issued.wait) return res.status(429).json({ message: `Wait ${issued.wait} seconds before asking for another code.` });
    try {
      await sms.send(phone, `${issued.code} is your QikWins ${purpose} code. It expires in 10 minutes. Never share it.`);
    } catch (e) {
      console.error("SMS:", e.message);
      return res.status(502).json({ message: "We couldn't send the text. Check the number and try again." });
    }
    res.json({ requestId: issued.id, phone, ...(sms.live ? {} : { devCode: issued.code }) });
  };
  const ageOn = (dob, today = new Date()) => {
    let age = today.getUTCFullYear() - dob.getUTCFullYear();
    const m = today.getUTCMonth() - dob.getUTCMonth();
    if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
    return age;
  };
  const nameRule = (field, label) =>
    body(field).isString().trim().matches(/^[\p{L}][\p{L}' .-]{0,39}$/u).withMessage(`Enter your ${label}.`);

  app.post(
    "/auth/signup/start",
    nameRule("firstName", "first name"),
    nameRule("surname", "surname"),
    body("email").isEmail().withMessage("Enter a valid email address.").normalizeEmail({ gmail_remove_dots: false }),
    body("dob").isISO8601({ strict: true }).withMessage("Enter your date of birth."),
    asyncHandler(async (req, res) => {
      if (!valid(req, res)) return;
      const phone = normalizePhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Enter your phone number with its country code, like +263 77 123 4567." });
      const dob = new Date(`${req.body.dob.slice(0, 10)}T00:00:00Z`);
      const age = ageOn(dob);
      if (Number.isNaN(age) || age > 120) return res.status(400).json({ message: "Enter your date of birth." });
      if (age < 18) return res.status(400).json({ message: "You must be 18 or older to play." });
      if (await store.findUserByPhone(phone)) return res.status(409).json({ message: "That number already has an account. Sign in instead." });
      if (await store.findUserByEmail(req.body.email)) return res.status(409).json({ message: "That email already has an account. Sign in instead." });
      const profile = { firstName: req.body.firstName.trim(), surname: req.body.surname.trim(), dob: dob.toISOString().slice(0, 10), email: req.body.email };
      await reply(res, phone, otp.issue(phone, { signup: profile }), "sign-up");
    })
  );

  app.post(
    "/auth/login/start",
    asyncHandler(async (req, res) => {
      const phone = normalizePhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Enter your phone number with its country code, like +263 77 123 4567." });
      if (!(await store.findUserByPhone(phone))) return res.status(404).json({ message: "No account uses that number yet. Create one first." });
      await reply(res, phone, otp.issue(phone, {}), "sign-in");
    })
  );

  app.post(
    "/auth/verify",
    body("requestId").isString().withMessage("Ask for a code first."),
    body("code").isString().trim().matches(/^\d{6}$/).withMessage("Enter the 6-digit code."),
    asyncHandler(async (req, res) => {
      if (!valid(req, res)) return;
      const checked = otp.check(req.body.requestId, req.body.code);
      if (!checked.ok) return res.status(400).json({ message: checked.message });
      const { phone, data } = checked;
      let user = await store.findUserByPhone(phone);
      if (data.signup) {
        if (user) return res.status(409).json({ message: "That number already has an account. Sign in instead." });
        const p = data.signup;
        user = await store.createUser({ ...p, name: `${p.firstName} ${p.surname[0].toUpperCase()}.`, phone, phoneVerifiedAt: new Date(), balance: COMMON.START_BALANCE });
      }
      if (!user) return res.status(404).json({ message: "No account uses that number yet. Create one first." });
      res.json({ token: signToken(user.id), user });
    })
  );

  // Tests and the screenshot script sign players in directly.
  if (process.env.ENVIRONMENT === "test") {
    app.post("/auth/test", asyncHandler(async (req, res) => {
      const phone = normalizePhone(req.body.phone);
      if (!phone || !req.body.name) return res.status(400).json({ message: "Name and phone needed." });
      const user = (await store.findUserByPhone(phone)) || (await store.createUser({ name: String(req.body.name).slice(0, 40), phone, balance: COMMON.START_BALANCE }));
      res.json({ token: signToken(user.id), user });
    }));
  }

  app.get("/me", auth, (req, res) => res.json({ user: req.user }));

  // Play credits only: top the balance back up to the starting amount.
  app.post(
    "/me/reset-credits",
    auth,
    asyncHandler(async (req, res) => {
      if (COMMON.REAL_MONEY) return res.status(403).json({ message: "Deposits go through the cashier." });
      res.json({ user: await store.update(req.user.id, { balance: COMMON.START_BALANCE }) });
    })
  );

  // Self-exclusion: no stakes accepted for 1, 7 or 30 days.
  app.post(
    "/me/pause",
    auth,
    body("days").isIn([1, 7, 30]).withMessage("Choose 1, 7 or 30 days."),
    asyncHandler(async (req, res) => {
      if (!valid(req, res)) return;
      const until = new Date(Date.now() + Number(req.body.days) * 24 * 60 * 60 * 1000);
      res.json({ user: await store.update(req.user.id, { excludedUntil: until }) });
    })
  );

  app.get("/games/hop-off", (req, res) => res.json(hopOff.state()));
  app.get("/games/underdog", (req, res) => res.json(underdog.state()));

  app.post(
    "/games/hop-off/join",
    auth,
    play((req) =>
      hopOff.join(req.user.id, {
        stake: Number(req.body.stake),
        presetStop: req.body.presetStop == null ? null : Number(req.body.presetStop),
      })
    )
  );
  app.post("/games/hop-off/off", auth, play(async (req) => hopOff.getOff(req.user.id)));
  app.post(
    "/games/underdog/stake",
    auth,
    play((req) => underdog.stake(req.user.id, { side: req.body.side, stake: Number(req.body.stake) }))
  );

  // Double or Nothing: queue at a stake, then rock-paper-scissors.
  app.get("/games/double", maybe, (req, res) => res.json(double.state(req.userId)));
  app.post("/games/double/queue", auth, play((req) => double.enqueue(req.user.id, { stake: Number(req.body.stake) })));
  app.post("/games/double/cancel", auth, play((req) => double.cancel(req.user.id)));
  app.post("/games/double/move", auth, play(async (req) => double.move(req.user.id, req.body.move)));
  app.post("/games/double/dismiss", auth, play(async (req) => double.dismiss(req.user.id)));

  // 7x: eight to a table, three dice, one re-roll.
  app.get("/games/seven", maybe, (req, res) => res.json(seven.state(req.userId)));
  app.post("/games/seven/join", auth, play((req) => seven.join(req.user.id, { stake: Number(req.body.stake) })));
  app.post("/games/seven/leave", auth, play((req) => seven.leave(req.user.id)));
  app.post("/games/seven/reroll", auth, play(async (req) => seven.reroll(req.user.id)));
  app.post("/games/seven/dismiss", auth, play(async (req) => seven.dismiss(req.user.id)));

  // Big Wheel and the races: stake on a segment (or racer) while it's open.
  for (const game of [wheel, ...races]) {
    if (!game) continue;
    app.get(`/games/${game.GAME}`, maybe, (req, res) => res.json(game.state(req.userId)));
    app.post(
      `/games/${game.GAME}/stake`,
      auth,
      play((req) => game.stake(req.user.id, { segment: Number(req.body.segment), stake: Number(req.body.stake) }))
    );
  }

  // Last Standing (a knockout where only the smaller side survives) and Mega
  // Jackpot share one engine and the same routes.
  for (const [id, game] of [["last-standing", standing], ["mega", mega]]) {
    if (!game) continue;
    app.get(`/games/${id}`, maybe, (req, res) => res.json(game.state(req.userId)));
    app.post(`/games/${id}/join`, auth, play((req) => game.join(req.user.id, { stake: Number(req.body.stake) })));
    app.post(`/games/${id}/leave`, auth, play((req) => game.leave(req.user.id)));
    app.post(`/games/${id}/pick`, auth, play(async (req) => game.pick(req.user.id, req.body.side)));
    app.post(`/games/${id}/dismiss`, auth, play(async (req) => game.dismiss(req.user.id)));
  }

  // Penalties: a 1 v 1 duel or a 16-player cup.
  if (penalties) {
    app.get("/games/penalties", maybe, (req, res) => res.json(penalties.state(req.userId)));
    app.post("/games/penalties/join", auth, play((req) => penalties.join(req.user.id, { mode: req.body.mode, stake: Number(req.body.stake) })));
    app.post("/games/penalties/leave", auth, play((req) => penalties.leave(req.user.id)));
    app.post("/games/penalties/kick", auth, play(async (req) => penalties.kick(req.user.id, Number(req.body.spot))));
    app.post("/games/penalties/choose", auth, play((req) => penalties.choose(req.user.id, req.body.choice)));
    app.post("/games/penalties/dismiss", auth, play(async (req) => penalties.dismiss(req.user.id)));
  }

  // Recent wins across every game, for the lobby ticker and the live wins
  // panel: who won, how much on top of their stake, and the multiple.
  // Built from the settlement log and cached for a few seconds.
  const WIN_GAMES = ["mega", "big-wheel", "last-standing", "penalties", "seven", "double", "hop-off", "underdog", ...RACES.map((r) => r.GAME)];
  let winsCache = { at: 0, wins: [] };
  app.get(
    "/wins",
    asyncHandler(async (req, res) => {
      if (Date.now() - winsCache.at > 5000) {
        const wins = [];
        for (const game of WIN_GAMES) {
          for (const r of await store.listRounds(game, game === "mega" ? 2 : 6)) {
            for (const x of r.bets || r.players || r.riders || []) {
              const stake = x.stake ?? r.stake;
              if (x.payout > stake) wins.push({ name: x.name, amount: x.payout - stake, multiple: x.payout / stake, game, at: r.settledAt });
            }
          }
        }
        wins.sort((a, b) => new Date(b.at) - new Date(a.at));
        winsCache = { at: Date.now(), wins: wins.slice(0, 40) };
      }
      res.json({ wins: winsCache.wins });
    })
  );

  // The public settlement log.
  app.get(
    `/rounds/:game(hop-off|underdog|double|seven|big-wheel|last-standing|mega|penalties|${RACES.map((r) => r.GAME).join("|")})`,
    asyncHandler(async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      res.json({ rounds: await store.listRounds(req.params.game, limit) });
    })
  );
  app.get(
    "/rounds/id/:id",
    asyncHandler(async (req, res) => {
      const round = await store.getRound(req.params.id);
      if (!round) return res.status(404).json({ message: "No round with that ID." });
      res.json({ round });
    })
  );

  // Anyone can check a Hop Off checkpoint or a Big Wheel spin from its
  // revealed seed. Big Wheel segments are numbered from 1 here.
  app.get("/fair/verify", (req, res) => {
    const { seed, hash, roundId } = req.query;
    if (!seed || !hash || !roundId) return res.status(400).json({ message: "Send seed, hash and roundId." });
    const race = RACES.find((r) => r.GAME === req.query.game);
    const game = race ? race.GAME : req.query.game === "big-wheel" ? "big-wheel" : "hop-off";
    const stops = race ? race.SEGMENTS : game === "big-wheel" ? WHEEL.SEGMENTS : HOP_OFF.STOPS;
    const check = fair.verifyStop({ seed, hash, game, roundId, stops, stop: Number(req.query.stop) });
    res.json(check);
  });

  // The website's own pages all load index.html; the app routes from there.
  if (webDir) {
    app.get(/^\/(why|sign-in|play(\/[a-z-]+)?|fair|play-safe)?\/?$/, (req, res) => res.sendFile(path.join(webDir, "index.html")));
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  });

  return app;
}

module.exports = { createApp };
