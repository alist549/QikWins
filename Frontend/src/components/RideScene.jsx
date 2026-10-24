// The Hop Off route: the rank, then ten stops on a two-lane loop, with the
// ride moving from stop to stop. Grey route lines like QikDrive's welcome
// scene; stops already passed turn solid, and once the round is over the
// checkpoint shows in red.
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
      <rect x="-17" y="-11" width="34" height="17" rx="5" className={caught ? "fill-danger" : "fill-fg"} />
      <rect x="-13" y="-8" width="7" height="6" rx="1.5" className="fill-brand" />
      <rect x="-4" y="-8" width="7" height="6" rx="1.5" className="fill-brand" />
      <rect x="5" y="-8" width="8" height="6" rx="1.5" className="fill-brand" />
      <circle cx="-9" cy="7" r="3.2" className="fill-fg stroke-bg" strokeWidth="1.5" />
      <circle cx="9" cy="7" r="3.2" className="fill-fg stroke-bg" strokeWidth="1.5" />
    </g>
  );
}

function RideScene({ stops, stop = 0, checkpoint = null, myStop = null, caught = false }) {
  const at = stop === 0 ? RANK : POINTS[Math.min(stop, POINTS.length) - 1];
  return (
    <svg viewBox="0 0 380 210" className="w-full h-auto select-none" role="img" aria-label={stop === 0 ? "The ride is at the rank" : `The ride is at stop ${stop}, ${stops[stop - 1]}`}>
      <path d={ROUTE} fill="none" className="stroke-line" strokeWidth="10" strokeLinecap="round" />
      <path d={ROUTE} fill="none" className="stroke-bg" strokeWidth="1.5" strokeDasharray="6 8" />
      <text x={RANK.x} y={RANK.y - 18} textAnchor="middle" className="fill-muted" fontSize="9" fontWeight="600">
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
              className={isCheckpoint ? "fill-danger" : passed ? "fill-fg" : "fill-bg stroke-muted"}
              strokeWidth={passed || isCheckpoint ? 0 : 2}
            />
            <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="8" fontWeight="700" className={isCheckpoint || passed ? "fill-bg" : "fill-muted"}>
              {n}
            </text>
            {mine && <circle cx={p.x} cy={p.y} r="12" fill="none" className="stroke-brand" strokeWidth="2.5" />}
            <text x={p.x} y={top ? p.y - 18 : p.y + 27} textAnchor="middle" fontSize="9" fontWeight={isCheckpoint ? 700 : 500} className={isCheckpoint ? "fill-danger" : "fill-muted"}>
              {isCheckpoint ? "Checkpoint" : short(stops[i])}
            </text>
          </g>
        );
      })}
      <g style={{ transform: `translate(${at.x}px, ${at.y - 2}px)`, transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <Vehicle caught={caught} />
      </g>
    </svg>
  );
}

export default RideScene;
