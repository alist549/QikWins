import { AnimatePresence, motion } from "motion/react";
import { Trophy } from "lucide-react";
import { money } from "../lib/money";
import { times, useRecentWins } from "../lib/wins";

// Desktop side panel: the latest real wins, newest first.
function BigWinsFeed() {
  const wins = useRecentWins().slice(0, 8);
  return (
    <div className="rounded-[24px] bg-[#0A0A0A] text-white p-4">
      <div className="flex items-center gap-2 text-xs font-black tracking-[0.2em] text-[#FACC15]">
        <Trophy size={15} /> LIVE WINS
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {wins.map((w) => (
            <motion.li
              key={`${w.at}-${w.name}-${w.game}`}
              layout
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl bg-white/10 px-3 py-2 flex items-center justify-between gap-2"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold truncate">{w.name}</span>
                <span className="block text-xs text-white/60">{w.game}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-black text-[#FACC15] tabular">{money(w.amount, { sign: true })}</span>
                {w.multiple >= 2 && <span className="block text-[11px] font-black text-[#22C55E]">{times(w.multiple)}</span>}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {!wins.length && <li className="text-sm text-white/60">Wins show here the moment rounds finish.</li>}
      </ul>
    </div>
  );
}

export default BigWinsFeed;
