import { motion } from "motion/react";
import { money } from "../lib/money";
import { sfx } from "../lib/sound";

// Quick stake amounts as casino-style chips. The chosen chip pops up.
const TONES = ["from-[#22C55E] to-[#15803D]", "from-[#0EA5E9] to-[#1D4ED8]", "from-[#F97316] to-[#C2410C]", "from-[#EC4899] to-[#9D174D]", "from-[#FACC15] to-[#B45309]"];

function StakeChips({ chips, value, onChange, disabled }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Stake">
      {chips.map((c, i) => (
        <motion.button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          disabled={disabled}
          whileTap={{ scale: 0.88 }}
          animate={{ y: value === c ? -4 : 0, scale: value === c ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          onClick={() => {
            sfx("chip");
            onChange(c);
          }}
          className={`flex-1 h-11 rounded-full text-sm font-extrabold tabular text-white bg-gradient-to-br ${TONES[i % TONES.length]} border-[3px] border-dashed border-white/50 disabled:opacity-40 ${
            value === c ? "ring-[3px] ring-offset-2 ring-offset-bg ring-[#FACC15] shadow-float" : "opacity-80"
          }`}
        >
          {money(c)}
        </motion.button>
      ))}
    </div>
  );
}

export default StakeChips;
