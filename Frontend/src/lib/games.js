import { RACES } from "./races";

// Every game in the lobby. Eight are live in the demo; the rest are shown as
// coming soon so players can see where QikWins is going.
// `max` is the most a player can win back, as a multiple of their stake.
export const GAMES = [
  { id: "mega", name: "Mega Jackpot", tag: "$2,250 jackpot from $1", path: "/play/mega-jackpot", live: true, kind: "table", hot: true, max: "2,250x" },
  { id: "big-wheel", name: "Big Wheel", tag: "Back the empty one, take it all", path: "/play/big-wheel", live: true, kind: "crowd", hot: true, max: "50x+" },
  { id: "last-standing", name: "Last Standing", tag: "$28.90 from $1", path: "/play/last-standing", live: true, kind: "table", hot: true, max: "29x" },
  { id: "spot-kick", name: "Penalties", tag: "$13 cup from $1", path: "/play/penalties", live: true, kind: "duel", hot: true, max: "13x" },
  ...RACES.map((r) => ({ id: r.id, name: r.name, tag: r.tag, path: `/play/${r.id}`, live: true, kind: "race", hot: r.id === "marble-madness", max: r.max })),
  { id: "seven", name: "7x", tag: "$7.30 from $1 in a minute", path: "/play/seven", live: true, kind: "table", max: "7x" },
  { id: "double", name: "x2", tag: "Double your money", path: "/play/double", live: true, kind: "duel", max: "2x" },
  { id: "hop-off", name: "Hop Off", tag: "Fly further, win bigger", path: "/play/hop-off", live: true, kind: "timing" },
  { id: "underdog", name: "Underdog", tag: "Smaller side wins big", path: "/play/underdog", live: true, kind: "crowd" },
  { id: "golden-drop", name: "Golden Drop", tag: "Back a region", kind: "draw" },
  { id: "derby-tug", name: "Derby Tug", tag: "Team tapping", kind: "crowd" },
  { id: "mind-reader", name: "Mind Reader", tag: "Guess ⅔ of the crowd", kind: "crowd" },
  { id: "squads", name: "Squads", tag: "Play as a group", kind: "show" },
];

export const CATEGORIES = [
  { id: "all", label: "All games", tone: "from-[#7C3AED] to-[#EC4899]" },
  { id: "live", label: "Live now", tone: "from-[#DC2626] to-[#F97316]" },
  { id: "big", label: "Biggest wins", tone: "from-[#FACC15] to-[#F97316]" },
  { id: "race", label: "Races", tone: "from-[#DC2626] to-[#7C3AED]" },
  { id: "duel", label: "Head to head", tone: "from-[#00C2FF] to-[#7C3AED]" },
  { id: "crowd", label: "Beat the crowd", tone: "from-[#22C55E] to-[#0EA5E9]" },
  { id: "soon", label: "Coming soon", tone: "from-[#F59E0B] to-[#EC4899]" },
];

export function inCategory(game, category) {
  if (category === "live") return game.live;
  if (category === "big") return game.live && Boolean(game.max) && game.max !== "2x";
  if (category === "soon") return !game.live;
  if (category === "crowd") return game.kind === "crowd";
  if (category === "race") return game.kind === "race";
  if (category === "duel") return game.kind === "duel" || game.kind === "table";
  return true;
}
