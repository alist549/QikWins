import { NavLink } from "react-router-dom";
import GameArt from "./GameArt";
import { GAMES } from "../lib/games";

// Desktop left panel: every live game, with the most it can pay.
function GameRail() {
  return (
    <nav aria-label="Games" className="flex flex-col gap-1.5">
      <div className="px-2 text-xs font-black tracking-[0.2em] text-muted">GAMES</div>
      {GAMES.filter((g) => g.live).map((g) => (
        <NavLink
          key={g.id}
          to={g.path}
          className={({ isActive }) => `flex items-center gap-3 rounded-2xl p-1.5 pr-3 transition ${isActive ? "bg-surface ring-2 ring-[#FACC15]" : "hover:bg-surface"}`}
        >
          <span className="tile-art qw-still w-11 h-11 rounded-xl overflow-hidden shrink-0">
            <GameArt game={g.id} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-sm truncate">{g.name}</span>
            <span className="block text-xs text-muted truncate">{g.tag}</span>
          </span>
          {g.max && <span className="text-xs font-black text-[#F97316] shrink-0">{g.max}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default GameRail;
