import { useMemo } from "react";
import { motion } from "motion/react";
import { money } from "../lib/money";

// Full-screen celebration: a flash, spinning light rays, confetti and the
// amount won in big gold, then it fades.
const COLORS = ["#FACC15", "#F97316", "#EC4899", "#22D3EE", "#ffffff", "#7C3AED", "#22C55E"];

function WinBurst({ amount, label = "You won" }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        dx: `${Math.round((Math.random() - 0.5) * 900)}px`,
        dy: `${Math.round(Math.random() * 700 - 250)}px`,
        rot: `${Math.round(Math.random() * 720)}deg`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.25}s`,
        size: 7 + Math.round(Math.random() * 8),
      })),
    []
  );
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden" aria-live="assertive">
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle,rgba(250,204,21,0.55)_0%,rgba(10,10,10,0.75)_60%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.8, times: [0, 0.08, 0.75, 1] }}
      />
      <motion.div
        className="absolute w-[160vmax] h-[160vmax] bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.14)_0deg_8deg,transparent_8deg_24deg)]"
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 90, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.8, ease: "linear" }}
      />
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            "--dx": p.dx,
            "--dy": p.dy,
            "--rot": p.rot,
            animation: `qw-confetti 1.8s cubic-bezier(0.2, 0.7, 0.4, 1) ${p.delay} forwards`,
          }}
        />
      ))}
      <motion.div
        className="relative text-center px-6"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.15, 1, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.8, times: [0, 0.15, 0.25, 1] }}
      >
        <div className="text-2xl lg:text-4xl font-black uppercase tracking-[0.15em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">{label}</div>
        <div className="text-7xl lg:text-9xl font-black tracking-tighter tabular qw-gold-text drop-shadow-[0_6px_24px_rgba(249,115,22,0.6)]">
          {money(amount, { sign: true })}
        </div>
      </motion.div>
    </div>
  );
}

export default WinBurst;
