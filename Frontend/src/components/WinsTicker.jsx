import { Trophy } from "lucide-react";
import { money } from "../lib/money";
import { times, useRecentWins } from "../lib/wins";

// Real recent wins from the results log, scrolling past like a live feed.
function WinsTicker() {
  const wins = useRecentWins().slice(0, 16);
  const items = wins.length ? wins : [{ name: "You", amount: 0, game: "the next round" }];
  return (
    <div className="relative h-11 rounded-full bg-[#0A0A0A] text-white overflow-hidden flex items-center" aria-label="Recent wins">
      <span className="z-10 h-full pl-4 pr-3 bg-gradient-to-r from-[#FACC15] to-[#F97316] text-black inline-flex items-center gap-1.5 text-xs font-black tracking-wider">
        <Trophy size={15} /> BIG WINS
      </span>
      <div className="flex-1 overflow-hidden">
        <div className="flex w-max qw-marquee">
          {[...items, ...items].map((w, i) => (
            <span key={i} className="px-3 text-sm whitespace-nowrap tabular">
              {w.amount ? (
                <>
                  <b>{w.name}</b> won <b className="text-[#FACC15]">{money(w.amount, { sign: true })}</b>
                  {w.multiple >= 2 && <span className="ml-1 px-1.5 rounded-md bg-[#22C55E] text-black text-xs font-black">{times(w.multiple)}</span>} in {w.game}
                </>
              ) : (
                <>Be the first winner in {w.game}</>
              )}
              <span className="text-white/40 pl-3">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WinsTicker;
