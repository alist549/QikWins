// One die face as a 3x3 grid of pips.
const SPOTS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ n, size = 64, delay = 0, rollKey, tone = "bg-white text-black" }) {
  return (
    <span
      key={rollKey}
      className={`qw-roll grid grid-cols-3 grid-rows-3 rounded-[22%] shadow-float ${tone}`}
      style={{ width: size, height: size, padding: size * 0.14, animationDelay: `${delay}s` }}
      aria-label={`${n}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {SPOTS[n]?.includes(i) && <span className="rounded-full bg-current" style={{ width: size * 0.16, height: size * 0.16 }} />}
        </span>
      ))}
    </span>
  );
}

export default Die;
