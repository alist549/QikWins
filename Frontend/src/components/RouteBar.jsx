import { motion } from "motion/react";

// The ten cities of a Hop Off route as pins on a line. The line fills as
// the jet flies, your stop gets a gold ring, and once the round is over the
// checkpoint city turns red.
function RouteBar({ stops, stop = 0, checkpoint = null, myStop = null }) {
  const pct = stop === 0 ? 0 : ((stop - 1) / (stops.length - 1)) * 100;
  return (
    <div className="px-3 pt-2 pb-3">
      <div className="relative h-3 mx-2">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/25" />
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316]"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
        {stops.map((name, i) => {
          const n = i + 1;
          const isCheckpoint = checkpoint === n;
          const passed = n <= stop;
          return (
            <motion.span
              key={name}
              title={name}
              className={`absolute top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 ${
                isCheckpoint ? "bg-[#DC2626] border-white" : passed ? "bg-[#FACC15] border-[#FACC15]" : "bg-white/40 border-white/60"
              } ${myStop === n ? "ring-[3px] ring-white" : ""}`}
              style={{ left: `${(i / (stops.length - 1)) * 100}%` }}
              animate={n === stop ? { scale: [1, 1.7, 1.25] } : isCheckpoint ? { scale: [1, 1.9, 1.4] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 mx-2 flex justify-between text-[9px] font-bold text-white/80 leading-tight">
        {stops.map((name, i) => (
          <span key={name} className={`w-0 flex whitespace-nowrap ${i === 0 ? "justify-start -ml-1.5" : i === stops.length - 1 ? "justify-end -mr-1.5" : "justify-center"} ${i % 2 ? "translate-y-2.5" : ""} ${checkpoint === i + 1 ? "text-[#FECACA]" : ""}`}>
            {name}
          </span>
        ))}
      </div>
      <div className="h-2.5" />
    </div>
  );
}

export default RouteBar;
