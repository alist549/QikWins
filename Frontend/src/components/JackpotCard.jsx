import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Crown } from "lucide-react";
import Counter from "./Counter";
import { useLobby } from "../lib/usePersonal";
import { useRules } from "../lib/useRules";
import { money } from "../lib/money";
import { times, useRecentWins } from "../lib/wins";

// The Mega Jackpot headline, plus the biggest recent win. Every number here
// is real: the jackpot is what the last one standing at a full $1 table
// takes (2,500 stakes less the fee), and the count is who's in right now.
// `compact` is the phone version: one row, no biggest-win line.
function JackpotCard({ className = "", compact = false }) {
  const rules = useRules();
  const lobby = useLobby("mega");
  const wins = useRecentWins();
  const best = wins.reduce((b, w) => (!b || w.amount > b.amount ? w : b), null);
  const seats = rules?.mega?.seats ?? 2500;
  const pot = 100 * seats - Math.floor((seats - 1) * 100 * (rules?.mega?.feeRate ?? 0.1));
  const playing = lobby ? Object.values(lobby.waiting || {}).reduce((a, b) => a + b, 0) + lobby.playing : 0;
  if (compact) {
    return (
      <Link to="/play/mega-jackpot" className={`relative overflow-hidden rounded-[24px] px-4 py-3 text-white bg-[radial-gradient(circle_at_20%_0%,#FDE047_0%,#F97316_40%,#9D174D_85%)] shadow-float flex items-center justify-between gap-3 ${className}`}>
        <span>
          <span className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.25em]">
            <Crown size={14} /> JACKPOT
          </span>
          <span className="block text-4xl font-black tabular leading-none mt-0.5 drop-shadow-[0_3px_12px_rgba(0,0,0,0.35)]"><Counter value={pot} /></span>
          <span className="block text-xs font-bold mt-1 opacity-90">From a $1 play · last one standing takes it</span>
        </span>
        <span className="h-11 px-4 rounded-full bg-white text-black text-sm font-black inline-flex items-center shrink-0 qw-shine relative overflow-hidden">Play now</span>
      </Link>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-[28px] p-5 text-white bg-[radial-gradient(circle_at_30%_0%,#FDE047_0%,#F97316_35%,#9D174D_75%,#4C1D95_100%)] shadow-float ${className}`}>
      <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/15 blur-2xl qw-glow" aria-hidden />
      <div className="relative flex items-center gap-2 text-xs font-black tracking-[0.25em]">
        <Crown size={16} /> JACKPOT
      </div>
      <motion.div
        className="relative mt-1 text-5xl font-black tabular whitespace-nowrap drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Counter value={pot} />
      </motion.div>
      <div className="relative mt-1 text-lg font-black">FROM A $1 PLAY</div>
      <div className="relative text-sm font-bold opacity-90">
        Mega Jackpot: 2,500 players, one question at a time. The last one standing takes it all.
        {playing > 0 && ` ${playing.toLocaleString()} playing now.`}
      </div>
      <Link to="/play/mega-jackpot" className="relative mt-4 h-12 px-6 rounded-full bg-white text-black font-black inline-flex items-center qw-shine overflow-hidden">
        Play now for $1
      </Link>
      {best && (
        <div className="relative mt-4 rounded-2xl bg-black/30 px-3 py-2 text-sm">
          <span className="opacity-80">Biggest win lately · </span>
          <b>{best.name}</b> won <b className="text-[#FDE047]">{money(best.amount, { sign: true })}</b>
          {best.multiple >= 2 && ` (${times(best.multiple)})`} in {best.game}
        </div>
      )}
    </div>
  );
}

export default JackpotCard;
