// The races: each is a pool on one racer, run by the same engine and drawn
// the same way (every racer has an equal chance). Only the look differs.
//   racers: name, colour and the shape drawn for it
const named = (names, colors, extra = {}) => names.map((name, i) => ({ name, color: colors[i], ...extra }));
const LIVERY = [0xe11d48, 0x2563eb, 0x16a34a, 0xeab308, 0x9333ea, 0xf97316, 0x0d9488, 0xe5e7eb];
const TEAMS = ["Crimson", "Cobalt", "Verde", "Aurum", "Violet", "Blaze", "Teal", "Ivory"];

// Sleek drawn racers on dark tracks: no cartoons, made for adults.
export const RACES = [
  {
    id: "marble-madness",
    glow: ["124 58 237", "219 39 119"],
    name: "Marble Madness",
    tag: "8 chrome marbles, one pot",
    pick: "Back a marble",
    max: "$7+",
    racers: named(TEAMS, LIVERY, { shape: "marble" }),
    sky: [0x0b0820, 0x1e1b4b],
    track: 0x1e1b4b,
    bg: "from-[#0B0820] via-[#312E81] to-[#9D174D]",
  },
  {
    id: "grand-prix",
    glow: ["220 38 38", "113 113 122"],
    name: "Grand Prix",
    tag: "Six cars, flag to flag",
    pick: "Back a car",
    max: "$5+",
    racers: named(TEAMS.slice(0, 6), LIVERY, { shape: "car" }),
    sky: [0x111111, 0x27272a],
    track: 0x3f3f46,
    bg: "from-[#09090B] via-[#3F3F46] to-[#DC2626]",
  },
  {
    id: "rocket-race",
    glow: ["37 99 235", "124 58 237"],
    name: "Rocket Race",
    tag: "Launch to orbit first",
    pick: "Back a rocket",
    max: "$5+",
    racers: named(["Atlas", "Vega", "Titan", "Ares", "Orion", "Helios"], LIVERY, { shape: "rocket" }),
    sky: [0x020617, 0x172554],
    track: 0x0f172a,
    bg: "from-[#020617] via-[#1E3A8A] to-[#7C3AED]",
  },
  {
    id: "drone-dash",
    glow: ["2 132 199", "6 182 212"],
    name: "Drone Dash",
    tag: "Fastest drone takes the pot",
    pick: "Back a drone",
    max: "$5+",
    racers: named(["Hawk", "Falcon", "Raptor", "Kestrel", "Osprey", "Condor"], LIVERY, { shape: "drone" }),
    sky: [0x082f49, 0x0c4a6e],
    track: 0x075985,
    bg: "from-[#082F49] via-[#0369A1] to-[#06B6D4]",
  },
  {
    id: "powerboat",
    glow: ["15 118 110", "14 165 233"],
    name: "Powerboat",
    tag: "Full throttle on open water",
    pick: "Back a boat",
    max: "$4+",
    racers: named(["Marlin", "Barracuda", "Mako", "Tarpon", "Wahoo"], LIVERY, { shape: "boat" }),
    sky: [0x042f2e, 0x134e4a],
    track: 0x115e59,
    bg: "from-[#042F2E] via-[#0F766E] to-[#0EA5E9]",
  },
  {
    id: "hyperdrive",
    glow: ["147 51 234", "192 38 211"],
    name: "Hyperdrive",
    tag: "Warp to the finish",
    pick: "Back a pod",
    max: "$5+",
    racers: named(["Astra", "Lumen", "Zenith", "Pulsar", "Nebula", "Quasar"], LIVERY, { shape: "pod" }),
    sky: [0x0f0a2e, 0x3b0764],
    track: 0x1e1b4b,
    bg: "from-[#0F0A2E] via-[#581C87] to-[#C026D3]",
  },
];

export const raceById = (id) => RACES.find((r) => r.id === id);
export const css = (n) => `#${n.toString(16).padStart(6, "0")}`;

// A small seeded random generator, so every viewer sees the same race for
// the same round (the winner itself comes from the server).
export function seeded(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How far along each racer is (0 to 1+) at `u` (0 to 1 of the run). The
// winner crosses the line first at 80% of the run; the others follow, with
// surges and stumbles so the lead changes on the way.
export function racePlan(roundId, winner, n) {
  const rand = seeded(`${roundId}`);
  const finish = Array.from({ length: n }, (_, i) => (i === winner ? 0.8 : 0.83 + rand() * 0.2));
  const waves = Array.from({ length: n }, () => ({ k: 1.5 + rand() * 2.5, phase: rand() * Math.PI * 2, amp: 0.05 + rand() * 0.07 }));
  return (u) =>
    finish.map((f, i) => {
      const x = u / f;
      const w = waves[i];
      const wobble = w.amp * Math.sin(Math.PI * Math.min(1, x)) * Math.sin(w.k * Math.PI * x + w.phase);
      return Math.max(0, x + wobble);
    });
}
