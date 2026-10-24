import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

// The goal with its 3 directions (left, centre and right), a keeper and a
// ball. Before a kick the directions are buttons; on the reveal the keeper
// dives to `dive` and the ball flies to `aim`. The stadium is 3D
// (scenes/penalty3d.js); the flat drawing shows while it loads, or if the
// device has no WebGL.
export const SPOT_NAMES = ["Left", "Centre", "Right"];

const W = 320;
const H = 200;
const GOAL = { x: 30, y: 30, w: 260, h: 110 };
const spotCenter = (i) => ({ x: GOAL.x + (GOAL.w / 3) * (i + 0.5), y: GOAL.y + GOAL.h * 0.45 });
const BALL_START = { x: W / 2, y: 182 };
const KEEPER_HOME = { x: W / 2, y: GOAL.y + GOAL.h - 34 };

function Keeper({ tint }) {
  return (
    <g>
      <rect x="-9" y="-6" width="18" height="34" rx="7" fill={tint} />
      <circle cx="0" cy="-15" r="9" fill="#F5C99B" />
      <rect x="-30" y="-4" width="22" height="7" rx="3.5" fill={tint} />
      <rect x="8" y="-4" width="22" height="7" rx="3.5" fill={tint} />
      <circle cx="-31" cy="-0.5" r="5.5" fill="#FACC15" />
      <circle cx="31" cy="-0.5" r="5.5" fill="#FACC15" />
      <rect x="-8" y="27" width="6" height="14" rx="3" fill="#0A0A0A" />
      <rect x="2" y="27" width="6" height="14" rx="3" fill="#0A0A0A" />
    </g>
  );
}

function Goal({ onPick, picked, disabled, reveal, kickKey, role }) {
  const showReveal = Boolean(reveal);
  const target = showReveal ? spotCenter(reveal.aim) : null;
  const diveTo = showReveal ? spotCenter(reveal.dive) : KEEPER_HOME;
  const diveDx = diveTo.x - KEEPER_HOME.x;
  const diveDy = diveTo.y - KEEPER_HOME.y + (reveal?.dive === 1 ? -6 : 8);

  const host = useRef(null);
  const stage = useRef(null);
  const [mouth, setMouth] = useState(null);
  useEffect(() => {
    let gone = false;
    import("../scenes/penalty3d")
      .then(({ penaltyScene }) => {
        if (gone) return;
        stage.current = penaltyScene(host.current);
        setMouth(stage.current.mouth());
      })
      .catch((e) => console.error("Penalties 3D:", e));
    return () => {
      gone = true;
      stage.current?.destroy();
      stage.current = null;
    };
  }, []);
  useEffect(() => {
    stage.current?.setRole(role);
  }, [role, mouth]);
  const aim = reveal?.aim;
  const dive = reveal?.dive;
  const scored = reveal?.goal;
  useEffect(() => {
    if (!stage.current) return;
    if (showReveal) stage.current.play({ aim, dive, goal: scored });
    else stage.current.reset();
  }, [showReveal, aim, dive, scored, kickKey, mouth]);

  const box = mouth
    ? { left: `${mouth.left * 100}%`, top: `${mouth.top * 100}%`, width: `${(mouth.right - mouth.left) * 100}%`, height: `${(mouth.bottom - mouth.top) * 100}%` }
    : { left: `${(GOAL.x / W) * 100}%`, top: `${(GOAL.y / H) * 100}%`, width: `${(GOAL.w / W) * 100}%`, height: `${(GOAL.h / H) * 100}%` };
  return (
    <div className="relative w-full select-none" style={{ aspectRatio: `${W} / ${H}` }}>
      <div ref={host} className="absolute inset-0" aria-hidden />
      <svg viewBox={`0 0 ${W} ${H}`} className={`absolute inset-0 w-full h-full ${mouth ? "hidden" : ""}`}>
        <defs>
          <pattern id="net" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0 L10 10 M10 0 L0 10" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#16A34A" />
            <stop offset="1" stopColor="#15803D" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#pitch)" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="0" y={GOAL.y + GOAL.h + i * 30} width={W} height="15" fill="#fff" opacity="0.05" />
        ))}
        <rect x={GOAL.x} y={GOAL.y} width={GOAL.w} height={GOAL.h} fill="#0b3b1e" />
        <rect x={GOAL.x} y={GOAL.y} width={GOAL.w} height={GOAL.h} fill="url(#net)" />
        <rect x={GOAL.x - 5} y={GOAL.y - 5} width={GOAL.w + 10} height="6" rx="3" fill="#fff" />
        <rect x={GOAL.x - 5} y={GOAL.y - 5} width="6" height={GOAL.h + 5} rx="3" fill="#fff" />
        <rect x={GOAL.x + GOAL.w - 1} y={GOAL.y - 5} width="6" height={GOAL.h + 5} rx="3" fill="#fff" />
        <line x1="0" y1={GOAL.y + GOAL.h} x2={W} y2={GOAL.y + GOAL.h} stroke="#fff" strokeOpacity="0.8" strokeWidth="2" />
        <circle cx={BALL_START.x} cy={BALL_START.y + 6} r="2.5" fill="#fff" opacity="0.7" />
        {/* Keeper */}
        <motion.g
          key={`k${kickKey}`}
          initial={{ x: KEEPER_HOME.x, y: KEEPER_HOME.y, rotate: 0 }}
          animate={
            showReveal
              ? { x: KEEPER_HOME.x + diveDx, y: KEEPER_HOME.y + diveDy, rotate: diveDx === 0 ? 0 : diveDx > 0 ? 70 : -70 }
              : { x: [KEEPER_HOME.x - 6, KEEPER_HOME.x + 6, KEEPER_HOME.x - 6], y: KEEPER_HOME.y, rotate: 0 }
          }
          transition={showReveal ? { type: "spring", stiffness: 160, damping: 14, delay: 0.12 } : { repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        >
          <Keeper tint={role === "keep" ? "#FACC15" : "#DC2626"} />
        </motion.g>
        {/* Ball */}
        <motion.g
          key={`b${kickKey}`}
          initial={{ x: BALL_START.x, y: BALL_START.y, scale: 1 }}
          animate={showReveal ? { x: target.x, y: target.y, scale: 0.62 } : { x: BALL_START.x, y: BALL_START.y, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <circle r="9" fill="#fff" stroke="#0A0A0A" strokeWidth="1.5" />
          <path d="M0 -4 L3.8 -1.2 L2.4 3.2 L-2.4 3.2 L-3.8 -1.2 Z" fill="#0A0A0A" />
        </motion.g>
      </svg>
      {/* The 3 directions, as buttons over the goal mouth. */}
      {!showReveal && (
        <div className="absolute grid grid-cols-3 gap-1" style={box}>
          {SPOT_NAMES.map((name, i) => (
            <motion.button
              key={name}
              type="button"
              aria-label={name}
              disabled={disabled}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPick(i)}
              className={`rounded-lg border-2 transition-colors ${
                picked === i ? "bg-[#FACC15]/70 border-[#FACC15] text-black" : disabled ? "border-transparent text-white/0" : "border-white/40 border-dashed hover:bg-white/15 text-white"
              } flex items-end justify-center pb-1.5 text-xs font-extrabold uppercase tracking-wider`}
            >
              <span className={`px-2 py-0.5 rounded-full ${picked === i ? "" : "bg-black/55"}`}>
                {["← ", "", ""][i]}
                {name}
                {["", "", " →"][i]}
              </span>
            </motion.button>
          ))}
        </div>
      )}
      {/* Centred by the wrapper: Motion owns the badge's own transform. */}
      {showReveal && (
        <div className="absolute inset-x-0 bottom-[6%] flex justify-center pointer-events-none">
          <motion.div
            key={`r${kickKey}`}
            initial={{ scale: 0.2, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.45 }}
            className={`px-4 py-1 rounded-xl text-2xl font-black tracking-tight shadow-float ${
              reveal.goal ? "bg-[#FACC15] text-black" : "bg-white text-[#DC2626]"
            }`}
          >
            {reveal.goal ? "GOAL!" : "SAVED!"}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Goal;
