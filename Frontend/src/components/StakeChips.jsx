import { money } from "../lib/money";

// Quick stake amounts. The chosen chip is solid; the rest are outlined.
function StakeChips({ chips, value, onChange, disabled }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Stake">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          disabled={disabled}
          onClick={() => onChange(c)}
          className={`flex-1 h-11 rounded-full text-sm font-semibold tabular transition disabled:opacity-40 ${
            value === c ? "bg-primary text-on-primary" : "border border-line hover:bg-surface"
          }`}
        >
          {money(c)}
        </button>
      ))}
    </div>
  );
}

export default StakeChips;
