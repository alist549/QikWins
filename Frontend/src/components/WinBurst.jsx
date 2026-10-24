import { useMemo } from "react";
import { money } from "../lib/money";

// Full-screen celebration: confetti and the amount won, then it fades.
const COLORS = ["#007DFE", "#FACC15", "#EC4899", "#22D3EE", "#ffffff", "#7C3AED"];

function WinBurst({ amount, label = "You won" }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        dx: `${Math.round((Math.random() - 0.5) * 360)}px`,
        dy: `${Math.round(Math.random() * 420 - 120)}px`,
        rot: `${Math.round(Math.random() * 720)}deg`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.15}s`,
        size: 6 + Math.round(Math.random() * 6),
      })),
    []
  );
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center" aria-live="assertive">
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
            animation: `qw-confetti 1.6s cubic-bezier(0.2, 0.7, 0.4, 1) ${p.delay} forwards`,
          }}
        />
      ))}
      <div className="qw-rise text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-brand drop-shadow">{label}</div>
        <div className="text-6xl font-extrabold tracking-tight text-fg drop-shadow-[0_4px_20px_rgb(0_125_254_/_0.5)]">{money(amount, { sign: true })}</div>
      </div>
    </div>
  );
}

export default WinBurst;
