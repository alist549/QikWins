import { motion } from "motion/react";
import Counter from "./Counter";

// The prize, big and gold, next to a game's join button: what you get back
// if you win, worked out from the stake you picked and the fee.
function WinUpTo({ amount, label = "Win", note }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-[#0A0A0A] text-white px-5 py-3 flex items-center justify-between gap-3">
      <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-[#FACC15]/25 blur-2xl qw-glow" aria-hidden />
      <div className="relative">
        <div className="text-xs font-black tracking-[0.2em] text-[#FACC15]">{label.toUpperCase()}</div>
        {note && <div className="text-xs text-white/70">{note}</div>}
      </div>
      <motion.div
        key={amount}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 12 }}
        className="relative text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-b from-[#FEF9C3] via-[#FDE047] to-[#F59E0B] bg-clip-text text-transparent"
      >
        <Counter value={amount} duration={0.4} />
      </motion.div>
    </div>
  );
}

export default WinUpTo;
