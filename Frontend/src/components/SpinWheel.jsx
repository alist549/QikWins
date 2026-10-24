import { useEffect, useRef, useState } from "react";
import { Wheel } from "spin-wheel";
import { SEGMENTS, cssColor } from "../scenes/wheel";

// The Big Wheel, drawn by spin-wheel (MIT, github.com/CrazyTim/spin-wheel):
// a smooth canvas wheel that spins onto a chosen segment. It drifts while
// stakes come in, then spins onto the drawn segment and finishes on time by
// the server's clock. Bulbs, the pointer and the landing glow are plain
// HTML around it.
const easeOutQuart = (n) => 1 - Math.pow(1 - n, 4);

function SpinWheel({ phase, winning, selected, endsAt, serverNow, spinMs = 5500, onTick, label }) {
  const host = useRef(null);
  const wheel = useRef(null);
  const state = useRef({ mode: "idle", offset: 0, lastServerNow: null });
  const tick = useRef(onTick);
  tick.current = onTick;
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const w = new Wheel(host.current, {
      items: SEGMENTS.map((s) => ({ label: s.icon, backgroundColor: cssColor(s.color) })),
      isInteractive: false,
      radius: 0.92,
      borderColor: "#1F1147",
      borderWidth: 10,
      lineColor: "rgba(255,255,255,0.65)",
      lineWidth: 2,
      itemLabelFont: "Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif",
      itemLabelAlign: "center",
      itemLabelRadius: 0.82,
      itemLabelRadiusMax: 0.55,
      itemLabelBaselineOffset: -0.1,
      itemLabelFontSizeMax: Math.max(14, Math.round(host.current.clientWidth * 0.1)),
      rotationResistance: 0,
      onCurrentIndexChange: () => {
        if (state.current.mode === "spinning") tick.current?.();
      },
      onRest: (e) => {
        host.current?.setAttribute("data-index", e.currentIndex);
        if (state.current.mode === "spinning") {
          state.current.mode = "landed";
          setLanded(true);
        }
      },
    });
    w.spin(8);
    wheel.current = w;
    return () => {
      w.remove();
      wheel.current = null;
    };
  }, []);

  useEffect(() => {
    const s = state.current;
    if (serverNow && serverNow !== s.lastServerNow) {
      s.lastServerNow = serverNow;
      s.offset = serverNow - Date.now();
    }
    const w = wheel.current;
    if (!w) return;
    if (phase === "open" && s.mode !== "idle") {
      s.mode = "idle";
      setLanded(false);
      w.spin(8);
    } else if (phase === "spinning" && winning != null && s.mode === "idle") {
      // Finish when the server says the spin ends, however late we joined.
      const left = endsAt ? endsAt - (Date.now() + s.offset) : spinMs;
      const duration = Math.max(800, Math.min(spinMs, left - 200));
      s.mode = "spinning";
      w.spinToItem(winning, duration, true, Math.max(1, Math.round(duration / 900)), 1, easeOutQuart);
    } else if (phase === "result" && winning != null && s.mode === "idle") {
      // Joined after the spin: show where it landed.
      s.mode = "landed";
      w.spinToItem(winning, 0, true, 0, 1);
      setLanded(true);
    }
  }, [phase, winning, endsAt, serverNow, spinMs]);

  const glow = landed && winning != null ? cssColor(SEGMENTS[winning].color) : selected != null ? cssColor(SEGMENTS[selected].color) : "#FACC15";
  return (
    <div className="relative w-full h-full flex items-center justify-center" role="img" aria-label={label}>
      <div className="relative h-full aspect-square max-w-full">
        <div
          className={`absolute inset-[3%] rounded-full transition-shadow duration-500 ${landed ? "qw-pulse" : ""}`}
          style={{ boxShadow: `0 0 ${landed ? 60 : 28}px ${landed ? 18 : 6}px ${glow}${landed ? "AA" : "55"}` }}
          aria-hidden
        />
        <div ref={host} className="absolute inset-0" />
        <div className={`absolute inset-[2.5%] rounded-full pointer-events-none ${phase === "spinning" ? "qw-bulbs-fast" : "qw-bulbs-slow"}`} aria-hidden />
        <div className="absolute left-1/2 top-[-1%] -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[30px] border-l-transparent border-r-transparent border-t-[#FACC15] drop-shadow-[0_2px_0_#0A0A0A]" aria-hidden />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[17%] aspect-square rounded-full bg-[#0A0A0A] border-4 border-[#FACC15] flex items-center justify-center text-[#FACC15] text-xs font-black" aria-hidden>
          SPIN
        </div>
      </div>
    </div>
  );
}

export default SpinWheel;
