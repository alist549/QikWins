import { Link } from "react-router-dom";
import GameArt from "./GameArt";
import { money } from "../lib/money";

// A lobby tile: animated cover art, a LIVE or SOON badge, and the live pool.
function GameTile({ game, live }) {
  const body = (
    <>
      <div className="relative aspect-square rounded-[22px] overflow-hidden shadow-float qw-shine group-hover:scale-[1.03] transition-transform duration-300">
        <GameArt game={game.id} />
        {game.live ? (
          <span className="absolute top-2.5 left-2.5 h-6 px-2 rounded-full bg-black/70 text-white text-[11px] font-bold inline-flex items-center gap-1.5 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] qw-glow" aria-hidden />
            LIVE{live?.people ? ` · ${live.people}` : ""}
          </span>
        ) : (
          <span className="absolute top-2.5 left-2.5 h-6 px-2 rounded-full bg-white/90 text-black text-[11px] font-bold inline-flex items-center">SOON</span>
        )}
        {game.hot && (
          <span className="absolute top-2.5 right-2.5 h-6 px-2 rounded-full bg-gradient-to-r from-[#F97316] to-[#EC4899] text-white text-[11px] font-extrabold inline-flex items-center qw-pulse">🔥 HOT</span>
        )}
        {game.live && live?.pool > 0 && (
          <span className="absolute bottom-2.5 right-2.5 h-7 px-2.5 rounded-full bg-white text-black text-xs font-extrabold inline-flex items-center tabular">{money(live.pool)}</span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <div className="font-bold leading-tight">{game.name}</div>
        <div className="text-xs text-muted">{game.tag}</div>
      </div>
    </>
  );
  return game.live ? (
    <Link to={game.path} className="group block" aria-label={`Play ${game.name}`}>
      {body}
    </Link>
  ) : (
    <div className="group block opacity-95" aria-label={`${game.name}, coming soon`}>
      {body}
    </div>
  );
}

export default GameTile;
