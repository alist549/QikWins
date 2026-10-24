const crypto = require("crypto");

// Provably fair draws. Before a round opens, the server picks a secret seed
// and publishes only its SHA-256 hash. After the round, it reveals the seed.
// Anyone can then check that sha256(seed) matches the published hash, and
// recompute the result from the seed, so the outcome could not have been
// changed after people played.
//
//   result = HMAC-SHA256(key = seed, message = "<game>:<roundId>")
//   first 8 hex characters -> a number from 0 to 2^32 - 1
//   stop   = 1 + (number mod stops)

const newSeed = () => crypto.randomBytes(32).toString("hex");
const hashSeed = (seed) => crypto.createHash("sha256").update(seed).digest("hex");

function drawStop(seed, game, roundId, stops) {
  const digest = crypto.createHmac("sha256", seed).update(`${game}:${roundId}`).digest("hex");
  return 1 + (parseInt(digest.slice(0, 8), 16) % stops);
}

// Checks a revealed round: the seed matches its hash and gives this stop.
function verifyStop({ seed, hash, game, roundId, stops, stop }) {
  const hashOk = hashSeed(seed) === hash;
  const expected = drawStop(seed, game, roundId, stops);
  return { hashOk, expected, ok: hashOk && expected === stop };
}

module.exports = { newSeed, hashSeed, drawStop, verifyStop };
