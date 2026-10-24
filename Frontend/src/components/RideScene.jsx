// The Hop Off route, drawn for the blue game stage: the rank, then ten stops
// on a two-lane loop, with the ride moving from stop to stop. Stops already
// passed turn solid, and once the round is over the checkpoint shows in red.
const RANK = { x: 22, y: 56 };
const POINTS = [
  { x: 75, y: 56 },
  { x: 135, y: 56 },
  { x: 195, y: 56 },
  { x: 255, y: 56 },
  { x: 315, y: 56 },
  { x: 315, y: 156 },
  { x: 255, y: 156 },
  { x: 195, y: 156 },
  { x: 135, y: 156 },
  { x: 75, y: 156 },
];
const ROUTE = "M22 56 H315 C 368 56, 368 156, 315 156 H75";

const short = (name) => (name.length > 10 ? `${name.slice(0, 9)}…` : name);

function Vehicle({ caught }) {
  // A small minibus, facing right; tinted red when the checkpoint stops it.
  return (
    <g>
      <rect x="-19" y="-13" width="38" height="19" rx="6" fill={caught ? "#DC2626" : "#fff"} />
      <rect x="-15" y="-10" width="8" height="7" rx="1.5" fill="#0A0A0A" />
      <rect x="-5" y="-10" width="8" height="7" rx="1.5" fill="#0A0A0A" />
      <rect x="5" y="-10" width="10" height="7" rx="1.5" fill="#7DD3FC" />
      <circle cx="-10" cy="7" r="3.8" fill="#0A0A0A" stroke="#fff" strokeWidth="1.5" />
      <circle cx="10" cy="7" r="3.8" fill="#0A0A0A" stroke="#fff" strokeWidth="1.5" />
    </g>
  );
}

function RideScene({ stops, stop = 0, checkpoint = null, myStop = null, caught = false, moving = false }) {
  const at = stop === 0 ? RANK : POINTS[Math.min(stop, POINTS.length) - 1];
  return (
    <svg viewBox="0 0 380 210" className="w-full h-auto select-none" role="img" aria-label={stop === 0 ? "The ride is at the rank" : `The ride is at stop ${stop}, ${stops[stop - 1]}`}>
      <path d={ROUTE} fill="none" stroke="#0A0A0A" strokeOpacity="0.35" strokeWidth="12" strokeLinecap="round" />
      <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="6 8" className={moving ? "qw-road" : ""} />
      <text x={RANK.x} y={RANK.y - 18} textAnchor="middle" fill="#fff" fillOpacity="0.8" fontSize="9" fontWeight="700">
        Rank
      </text>
      {POINTS.map((p, i) => {
        const n = i + 1;
        const passed = n <= stop;
        const isCheckpoint = checkpoint === n;
        const mine = myStop === n;
        const top = p.y < 100;
        return (
          <g key={n}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isCheckpoint ? 9 : 7}
              fill={isCheckpoint ? "#DC2626" : passed ? "#0A0A0A" : "#fff"}
              stroke={isCheckpoint ? "#fff" : "none"}
              strokeWidth={isCheckpoint ? 2 : 0}
            />
            <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="8" fontWeight="800" fill={isCheckpoint || passed ? "#fff" : "#007DFE"}>
              {n}
            </text>
            {mine && <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#FACC15" strokeWidth="3" />}
            <text x={p.x} y={top ? p.y - 18 : p.y + 27} textAnchor="middle" fontSize="9" fontWeight={isCheckpoint ? 800 : 600} fill="#fff" fillOpacity={isCheckpoint ? 1 : 0.85}>
              {isCheckpoint ? "Checkpoint" : short(stops[i])}
            </text>
          </g>
        );
      })}
      <g style={{ transform: `translate(${at.x}px, ${at.y - 2}px)`, transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <g className={moving ? "qw-bob" : ""}>
          <Vehicle caught={caught} />
        </g>
      </g>
    </svg>
  );
}

export default RideScene;
