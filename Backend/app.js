const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const { COMMON, HOP_OFF, UNDERDOG, DOUBLE, SEVEN, WHEEL, STANDING } = require("./config/games");
const { normalizePhone } = require("./utils/phone");
const { signToken, requireUser, optionalUser } = require("./middlewares/auth");
const { GameError } = require("./games/hopOff");
const fair = require("./services/fair");

// The HTTP API. Players act through these routes; live round updates go
// out over Socket.IO (socket.js).
// With `webDir` (the built website), the same server also serves the site,
// so one free web service runs everything (see render.yaml).
function createApp({ store, hopOff, underdog, double, seven, wheel, standing, webDir }) {
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

  const status = (req, res) => res.json({ name: "QikWins", demo: true, store: store.kind });
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
      demoBalance: COMMON.DEMO_BALANCE,
      hopOff: { stops: HOP_OFF.STOPS, feeRate: HOP_OFF.FEE_RATE, boardingMs: HOP_OFF.BOARDING_MS, stopMs: HOP_OFF.STOP_MS },
      underdog: { feeRate: UNDERDOG.FEE_RATE, openMs: UNDERDOG.OPEN_MS },
      double: { feeRate: DOUBLE.FEE_RATE, winsNeeded: DOUBLE.WINS_NEEDED, moveMs: DOUBLE.MOVE_MS },
      seven: { feeRate: SEVEN.FEE_RATE, seats: SEVEN.SEATS, rollMs: SEVEN.ROLL_MS },
      bigWheel: { feeRate: WHEEL.FEE_RATE, segments: WHEEL.SEGMENTS, openMs: WHEEL.OPEN_MS, spinMs: WHEEL.SPIN_MS },
      lastStanding: { feeRate: STANDING.FEE_RATE, seats: STANDING.SEATS, pickMs: STANDING.PICK_MS, maxRounds: STANDING.MAX_ROUNDS },
    })
  );

  // Demo sign-in: a name, a phone number and a confirmed age. Real-money
  // play would add an SMS code and identity checks here.
  app.post(
    "/auth/demo",
    body("name").isString().trim().isLength({ min: 2, max: 40 }).withMessage("Enter your name (2 to 40 letters)."),
    body("over18").equals("true").withMessage("You must be 18 or older to play."),
    asyncHandler(async (req, res) => {
      if (!valid(req, res)) return;
      const phone = normalizePhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Enter your phone number with its country code, like +263 77 123 4567." });
      const user =
        (await store.findUserByPhone(phone)) ||
        (await store.createUser({ name: req.body.name.trim(), phone, balance: COMMON.DEMO_BALANCE }));
      res.json({ token: signToken(user.id), user });
    })
  );

  app.get("/me", auth, (req, res) => res.json({ user: req.user }));

  app.post(
    "/me/reset-demo",
    auth,
    asyncHandler(async (req, res) => res.json({ user: await store.update(req.user.id, { balance: COMMON.DEMO_BALANCE }) }))
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

  // Big Wheel: stake on any segments while the wheel is open.
  if (wheel) {
    app.get("/games/big-wheel", maybe, (req, res) => res.json(wheel.state(req.userId)));
    app.post(
      "/games/big-wheel/stake",
      auth,
      play((req) => wheel.stake(req.user.id, { segment: Number(req.body.segment), stake: Number(req.body.stake) }))
    );
  }

  // Last Standing: a knockout where only the smaller side survives.
  if (standing) {
    app.get("/games/last-standing", maybe, (req, res) => res.json(standing.state(req.userId)));
    app.post("/games/last-standing/join", auth, play((req) => standing.join(req.user.id, { stake: Number(req.body.stake) })));
    app.post("/games/last-standing/leave", auth, play((req) => standing.leave(req.user.id)));
    app.post("/games/last-standing/pick", auth, play(async (req) => standing.pick(req.user.id, req.body.side)));
    app.post("/games/last-standing/dismiss", auth, play(async (req) => standing.dismiss(req.user.id)));
  }

  // The public settlement log.
  app.get(
    "/rounds/:game(hop-off|underdog|double|seven|big-wheel|last-standing)",
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
    const game = req.query.game === "big-wheel" ? "big-wheel" : "hop-off";
    const stops = game === "big-wheel" ? WHEEL.SEGMENTS : HOP_OFF.STOPS;
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
