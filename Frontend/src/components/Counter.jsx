import { useEffect, useRef } from "react";
import { animate } from "motion/react";
import { money } from "../lib/money";

// Money that counts up (or down) to its new value instead of jumping.
function Counter({ value = 0, format = money, duration = 0.8 }) {
  const ref = useRef(null);
  const from = useRef(value);
  useEffect(() => {
    const node = ref.current;
    const controls = animate(from.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        if (node) node.textContent = format(Math.round(v));
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, format, duration]);
  return (
    <span ref={ref} className="tabular">
      {format(value)}
    </span>
  );
}

export default Counter;
