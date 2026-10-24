// Game rules, in one place so the app, the docs and the settlement log all
// agree. Money is always whole cents (integers) to keep every payout exact.

const num = (value, fallback) => (value === undefined || value === "" ? fallback : Number(value));

// Shared by every game.
const COMMON = {
  CURRENCY: process.env.CURRENCY || "USD",
  // Demo wallet: every new player starts with this much practice money.
  DEMO_BALANCE: num(process.env.DEMO_BALANCE, 10000),
  MIN_STAKE: num(process.env.MIN_STAKE, 25),
  MAX_STAKE: num(process.env.MAX_STAKE, 500),
  // The quick stake chips shown in the app.
  STAKE_CHIPS: [25, 50, 100, 200, 500],
};

// Hop Off: a shared ride drives a route; a hidden checkpoint catches
// everyone still aboard. Survivors get their stake back plus a share of the
// caught riders' stakes (after the fee), weighted by stake x stops ridden.
const HOP_OFF = {
  STOPS: 10,
  BOARDING_MS: num(process.env.HOP_OFF_BOARDING_MS, 10000),
  STOP_MS: num(process.env.HOP_OFF_STOP_MS, 2000),
  SETTLED_MS: num(process.env.HOP_OFF_SETTLED_MS, 5000),
  // Taken only from the caught riders' money.
  FEE_RATE: num(process.env.HOP_OFF_FEE_RATE, 0.1),
};

// Underdog: two sides, totals hidden until the lock; the side with less
// money behind it wins and shares the other side's stakes (after the fee).
const UNDERDOG = {
  OPEN_MS: num(process.env.UNDERDOG_OPEN_MS, 45000),
  REVEAL_MS: num(process.env.UNDERDOG_REVEAL_MS, 6000),
  // Taken only from the losing side's money.
  FEE_RATE: num(process.env.UNDERDOG_FEE_RATE, 0.1),
  // Rotated in order. Written to work in any country.
  QUESTIONS: [
    ["Tea", "Coffee"],
    ["Left", "Right"],
    ["Messi", "Ronaldo"],
    ["Beach", "Mountains"],
    ["Cats", "Dogs"],
    ["Morning", "Night"],
    ["Sweet", "Savoury"],
    ["Red", "Blue"],
    ["City", "Village"],
    ["Rain", "Sunshine"],
  ],
};

module.exports = { COMMON, HOP_OFF, UNDERDOG };
