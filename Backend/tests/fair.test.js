const fair = require("../services/fair");

test("a revealed seed matches its hash and reproduces the stop", () => {
  const seed = fair.newSeed();
  const hash = fair.hashSeed(seed);
  const stop = fair.drawStop(seed, "hop-off", "HO-1", 10);
  expect(stop).toBeGreaterThanOrEqual(1);
  expect(stop).toBeLessThanOrEqual(10);
  expect(fair.verifyStop({ seed, hash, game: "hop-off", roundId: "HO-1", stops: 10, stop }).ok).toBe(true);
  expect(fair.verifyStop({ seed, hash, game: "hop-off", roundId: "HO-2", stops: 10, stop }).expected).toBeDefined();
  expect(fair.verifyStop({ seed: fair.newSeed(), hash, game: "hop-off", roundId: "HO-1", stops: 10, stop }).hashOk).toBe(false);
});

test("stops are spread across the whole route", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(fair.drawStop(fair.newSeed(), "hop-off", `HO-${i}`, 10));
  expect(seen.size).toBe(10);
});
