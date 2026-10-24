import { Link } from "react-router-dom";
import GameArt from "./GameArt";
import { money } from "../lib/money";

// A lobby tile: animated cover art, the win from $1, a SOON badge for games
// still to come, and the live pool.
function GameTile({ game, live }) {
  const body = (
    <>
      <div className="tile-art relative aspect-square rounded-[22px] overflow-hidden qw-frame qw-gloss qw-shine group-hover:scale-[1.03] transition-transform duration-300">
        <GameArt game={game.id} />
        {!game.live && (
          <span className="absolute top-2.5 left-2.5 h-6 px-2 rounded-full bg-white/90 text-black text-[11px] font-bold inline-flex items-center">SOON</span>
        )}
        {game.hot && (
          <span className="absolute top-2.5 right-2.5 h-6 px-2 rounded-full qw-gold-btn text-[10px] font-black tracking-[0.15em] inline-flex items-center z-10">HOT</span>
        )}
        {game.max && (
          <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-2xl bg-black/80 backdrop-blur flex flex-col leading-none z-10 ring-1 ring-[#D4A017]/60">
            <span className="text-[9px] font-black tracking-[0.14em] text-[#F2D27A]">{game.max.endsWith("+") ? "$1 CAN WIN" : "$1 WINS UP TO"}</span>
            <span className="text-xl font-black tracking-tight qw-gold-text">{game.max}</span>
          </span>
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
