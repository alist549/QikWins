// Game rules, in one place so the app, the docs and the settlement log all
// agree. Money is always whole cents (integers) to keep every payout exact.

const num = (value, fallback) => (value === undefined || value === "" ? fallback : Number(value));

// Practice players fill empty seats in the demo only. Real-money mode
// (REAL_MONEY=on) always turns them off: the house must never play.
const PRACTICE_PLAYERS = process.env.DEMO_OPPONENTS !== "off" && process.env.REAL_MONEY !== "on";

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

// Double or Nothing: two players at the same stake play rock-paper-scissors,
// first to 2 wins (ties replayed). The winner takes both stakes, less a fee
// taken from the loser's stake.
const DOUBLE = {
  WINS_NEEDED: 2,
  MOVE_MS: num(process.env.DOUBLE_MOVE_MS, 10000),
  REVEAL_MS: num(process.env.DOUBLE_REVEAL_MS, 2500),
  FEE_RATE: num(process.env.DOUBLE_FEE_RATE, 0.1),
  // Demo only: if nobody else is waiting at your stake, a practice player
  // takes the other seat after this long (see PRACTICE_PLAYERS).
  BOT_WAIT_MS: num(process.env.DOUBLE_BOT_WAIT_MS, 8000),
  BOTS: PRACTICE_PLAYERS,
};

// 7x: eight players at the same stake roll three dice each, with one
// re-roll. The highest total takes the table (ties split it). The fee is
// taken from the losers' stakes, so a lone winner gets back about 7.3x.
const SEVEN = {
  SEATS: 8,
  ROLL_MS: num(process.env.SEVEN_ROLL_MS, 8000),
  FEE_RATE: num(process.env.SEVEN_FEE_RATE, 0.1),
  BOT_WAIT_MS: num(process.env.SEVEN_BOT_WAIT_MS, 6000),
  BOTS: PRACTICE_PLAYERS,
};

// Big Wheel: everyone stakes on one or more of 12 segments; a provably fair
// spin picks one. Stakes on the winning segment share the whole wheel (less
// a fee from the losing stakes), so a lonely segment can pay 50x or more.
// If nobody backed the winner, the wheel (less the fee) rolls over.
const WHEEL = {
  SEGMENTS: 12,
  OPEN_MS: num(process.env.WHEEL_OPEN_MS, 20000),
  SPIN_MS: num(process.env.WHEEL_SPIN_MS, 6000),
  RESULT_MS: num(process.env.WHEEL_RESULT_MS, 6000),
  FEE_RATE: num(process.env.WHEEL_FEE_RATE, 0.1),
  // Demo only: practice players put a few stakes on each spin.
  BOTS: PRACTICE_PLAYERS,
  BOT_PLAYERS: num(process.env.WHEEL_BOT_PLAYERS, 9),
};

// Last Standing: a knockout for up to 32 players at one stake. Each round
// asks a two-way question; only the side fewer players picked survives.
// The last ones standing share every stake (less a fee from the knocked-out
// players' stakes): about 29x for a lone winner.
const STANDING = {
  SEATS: num(process.env.STANDING_SEATS, 32),
  PICK_MS: num(process.env.STANDING_PICK_MS, 8000),
  REVEAL_MS: num(process.env.STANDING_REVEAL_MS, 3500),
  MAX_ROUNDS: 8,
  FEE_RATE: num(process.env.STANDING_FEE_RATE, 0.1),
  BOT_WAIT_MS: num(process.env.STANDING_BOT_WAIT_MS, 6000),
  BOTS: PRACTICE_PLAYERS,
  QUESTIONS: UNDERDOG.QUESTIONS,
};

// Penalties: shootouts between real players. The striker shoots left,
// centre or right and the keeper dives one way (a match is a save). Players
// swap between striker and keeper every kick, KICKS_EACH each, then sudden
// death. Two modes:
//   duel: 1 v 1; the winner takes both stakes less a fee from the loser's
//   cup:  a 16-player knockout. Each win adds the beaten player's bank (less
//         the fee) to yours; after every round you choose to cash out your
//         bank or play on. Win all four rounds: about 13x.
const PENALTY = {
  SPOTS: 3,
  KICKS_EACH: num(process.env.PENALTY_KICKS_EACH, 3),
  KICK_MS: num(process.env.PENALTY_KICK_MS, 7000),
  REVEAL_MS: num(process.env.PENALTY_REVEAL_MS, 2600),
  CHOICE_MS: num(process.env.PENALTY_CHOICE_MS, 10000),
  MAX_SUDDEN_DEATH: 6,
  CUP_SEATS: num(process.env.PENALTY_CUP_SEATS, 16),
  FEE_RATE: num(process.env.PENALTY_FEE_RATE, 0.1),
  BOT_WAIT_MS: num(process.env.PENALTY_BOT_WAIT_MS, 5000),
  BOTS: PRACTICE_PLAYERS,
};

module.exports = { COMMON, HOP_OFF, UNDERDOG, DOUBLE, SEVEN, WHEEL, STANDING, PENALTY };
