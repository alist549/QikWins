// Every game in the lobby. Four are live in the demo; the rest are shown as
// coming soon so players can see where QikWins is going.
export const GAMES = [
  { id: "seven", name: "7x", tag: "Beat 7 players", path: "/play/seven", live: true, kind: "table", hot: true },
  { id: "double", name: "x2", tag: "Double or Nothing", path: "/play/double", live: true, kind: "duel", hot: true },
  { id: "hop-off", name: "Hop Off", tag: "Ride, then jump", path: "/play/hop-off", live: true, kind: "timing" },
  { id: "underdog", name: "Underdog", tag: "Smaller side wins", path: "/play/underdog", live: true, kind: "crowd" },
  { id: "golden-drop", name: "Golden Drop", tag: "Back a region", kind: "draw" },
  { id: "last-standing", name: "Last Standing", tag: "8 PM live show", kind: "show" },
  { id: "spot-kick", name: "Spot Kick", tag: "Call the penalty", kind: "draw" },
  { id: "derby-tug", name: "Derby Tug", tag: "Team tapping", kind: "crowd" },
  { id: "mind-reader", name: "Mind Reader", tag: "Guess ⅔ of the crowd", kind: "crowd" },
  { id: "squads", name: "Squads", tag: "Play as a group", kind: "show" },
];

export const CATEGORIES = [
  { id: "all", label: "All games", tone: "from-[#7C3AED] to-[#EC4899]" },
  { id: "live", label: "Live now", tone: "from-[#DC2626] to-[#F97316]" },
  { id: "duel", label: "Head to head", tone: "from-[#00C2FF] to-[#7C3AED]" },
  { id: "crowd", label: "Beat the crowd", tone: "from-[#22C55E] to-[#0EA5E9]" },
  { id: "soon", label: "Coming soon", tone: "from-[#F59E0B] to-[#EC4899]" },
];

export function inCategory(game, category) {
  if (category === "live") return game.live;
  if (category === "soon") return !game.live;
  if (category === "crowd") return game.kind === "crowd";
  if (category === "duel") return game.kind === "duel" || game.kind === "table";
  return true;
}
