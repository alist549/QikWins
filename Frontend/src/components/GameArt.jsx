// Animated cover art for every game tile and banner. Plain SVG + CSS
// (index.css "Game motion"), so it costs a few KB, not images.
import { useId } from "react";

// Gradient ids are made unique per copy: the same art can be on the page
// twice (a tile and the desktop game list), and a hidden copy's gradient
// would otherwise blank the visible one.
function Bg({ id: name, from, to }) {
  const id = `${name}${useId().replace(/:/g, "")}`;
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" cx="150" cy="40" r="140">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Bleeds past the square so wide banners stay filled. */}
      <rect x="-400" y="-400" width="1000" height="1000" fill={`url(#${id})`} />
      <rect x="-400" y="-400" width="1000" height="1000" fill={`url(#${id}-glow)`} />
    </>
  );
}

function HopOff() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-hop" from="#007DFE" to="#00C2FF" />
      {/* City skyline */}
      <g fill="#ffffff" opacity="0.18">
        <rect x="10" y="70" width="22" height="70" />
        <rect x="36" y="50" width="18" height="90" />
        <rect x="58" y="80" width="26" height="60" />
        <rect x="120" y="60" width="20" height="80" />
        <rect x="144" y="40" width="24" height="100" />
        <rect x="172" y="75" width="20" height="65" />
      </g>
      {/* Road */}
      <rect x="0" y="140" width="200" height="40" fill="#0A0A0A" opacity="0.85" />
      <line x1="0" y1="160" x2="200" y2="160" stroke="#fff" strokeWidth="3" strokeDasharray="14 6" className="qw-road" />
      {/* Checkpoint */}
      <g transform="translate(168 112)">
        <rect x="0" y="0" width="4" height="30" fill="#fff" />
        <rect x="-26" y="2" width="30" height="7" rx="2" fill="#DC2626" />
        <rect x="-20" y="2" width="6" height="7" fill="#fff" />
        <rect x="-8" y="2" width="6" height="7" fill="#fff" />
      </g>
      {/* Jet */}
      <g className="qw-float">
        <rect x="46" y="82" width="96" height="20" rx="10" fill="#FFFFFF" />
        <polygon points="140,82 160,92 140,102" fill="#FFFFFF" />
        <polygon points="52,84 38,58 52,58 70,84" fill="#0A0A0A" />
        <polygon points="86,96 64,126 80,126 110,96" fill="#E4E4E7" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <circle key={i} cx={62 + i * 10} cy="90" r="2.6" fill="#0A0A0A" />
        ))}
        <rect x="46" y="95" width="94" height="3" fill="#007DFE" />
      </g>
      {/* Parachute */}
      <g className="qw-bob">
        <path d="M150 120 a16 16 0 0 1 32 0 z" fill="#FACC15" />
        <line x1="150" y1="120" x2="166" y2="140" stroke="#fff" strokeWidth="1.2" />
        <line x1="182" y1="120" x2="166" y2="140" stroke="#fff" strokeWidth="1.2" />
        <circle cx="166" cy="142" r="3.5" fill="#0A0A0A" />
      </g>
      <text x="100" y="82" fontSize="26" textAnchor="middle" fontWeight="800" fill="#fff" className="qw-pulse">
        GET OFF!
      </text>
    </svg>
  );
}

function Underdog() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-dog" from="#7C3AED" to="#EC4899" />
      <rect x="0" y="0" width="100" height="200" fill="#0A0A0A" opacity="0.18" />
      <g className="qw-float">
        <circle cx="52" cy="92" r="34" fill="#fff" opacity="0.95" />
        <text x="52" y="104" textAnchor="middle" fontSize="34" fontWeight="800" fill="#7C3AED">A</text>
      </g>
      <g className="qw-float" style={{ animationDelay: "1.5s" }}>
        <circle cx="148" cy="92" r="34" fill="#fff" opacity="0.95" />
        <text x="148" y="104" textAnchor="middle" fontSize="34" fontWeight="800" fill="#EC4899">B</text>
      </g>
      <g className="qw-pulse">
        <circle cx="100" cy="92" r="20" fill="#0A0A0A" />
        <text x="100" y="99" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">VS</text>
      </g>
      {/* The crowd bar: the smaller side wins */}
      <rect x="24" y="150" width="152" height="14" rx="7" fill="#fff" opacity="0.3" />
      <rect x="24" y="150" width="96" height="14" rx="7" fill="#fff" className="qw-tug" />
      <text x="100" y="186" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">SMALLER SIDE WINS</text>
    </svg>
  );
}

function GoldenDrop() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-drop" from="#0F172A" to="#1E3A8A" />
      {/* Ten regions on a map grid */}
      <g opacity="0.9">
        {[0, 1, 2, 3, 4].map((c) =>
          [0, 1].map((r) => (
            <rect key={`${c}-${r}`} x={14 + c * 35} y={118 + r * 34} width="31" height="30" rx="7" fill={c === 2 && r === 0 ? "#FACC15" : "#fff"} opacity={c === 2 && r === 0 ? 1 : 0.16} />
          ))
        )}
      </g>
      <ellipse cx="100" cy="133" rx="18" ry="6" fill="none" stroke="#FACC15" strokeWidth="3" className="qw-ripple" />
      <path d="M100 52 C 100 52, 86 74, 86 84 a14 14 0 0 0 28 0 C 114 74, 100 52, 100 52 Z" fill="#FACC15" className="qw-drop" />
      <g fill="#fff" opacity="0.5">
        <circle cx="40" cy="40" r="16" />
        <circle cx="58" cy="34" r="20" />
        <circle cx="78" cy="42" r="14" />
        <circle cx="140" cy="30" r="14" />
        <circle cx="158" cy="26" r="18" />
        <circle cx="176" cy="34" r="12" />
      </g>
    </svg>
  );
}

function LastStanding() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-last" from="#B91C1C" to="#F97316" />
      {[38, 102].map((x, i) => (
        <g key={x}>
          <rect x={x} y="50" width="60" height="100" rx="8" fill="#0A0A0A" opacity="0.5" />
          <rect x={x + 4} y="54" width="52" height="92" rx="6" fill="#fff" className={i === 0 ? "qw-door" : ""} />
          <circle cx={x + 48} cy="102" r="3.5" fill="#0A0A0A" />
        </g>
      ))}
    </svg>
  );
}

function SpotKick() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-kick" from="#15803D" to="#4ADE80" />
      <g stroke="#fff" strokeWidth="2" opacity="0.35">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={60 + i * 16} y1="40" x2={60 + i * 16} y2="90" />
        ))}
        {[0, 1, 2].map((i) => (
          <line key={`h${i}`} x1="60" y1={52 + i * 14} x2="140" y2={52 + i * 14} />
        ))}
      </g>
      <path d="M56 92 V36 H144 V92" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
      <rect x="0" y="150" width="200" height="50" fill="#0A0A0A" opacity="0.15" />
      <g className="qw-kick">
        <circle cx="96" cy="148" r="13" fill="#fff" />
        <path d="M96 140 l6 4 -2 7 h-8 l-2 -7 z" fill="#0A0A0A" />
      </g>
    </svg>
  );
}

function DerbyTug() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-tug" from="#EA580C" to="#FACC15" />
      <g className="qw-tug">
        <line x1="20" y1="110" x2="180" y2="110" stroke="#78350F" strokeWidth="6" strokeLinecap="round" />
        <rect x="96" y="100" width="8" height="20" fill="#DC2626" />
        {[30, 54].map((x) => (
          <g key={x}>
            <circle cx={x} cy="84" r="9" fill="#0A0A0A" />
            <rect x={x - 7} y="94" width="14" height="22" rx="5" fill="#0A0A0A" />
          </g>
        ))}
        {[146, 170].map((x) => (
          <g key={x}>
            <circle cx={x} cy="84" r="9" fill="#fff" />
            <rect x={x - 7} y="94" width="14" height="22" rx="5" fill="#fff" />
          </g>
        ))}
      </g>
      <text x="100" y="170" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">TAP TAP TAP!</text>
    </svg>
  );
}

function MindReader() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-mind" from="#0D9488" to="#22D3EE" />
      <circle cx="100" cy="96" r="58" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 8" opacity="0.6" className="qw-spin" />
      <circle cx="100" cy="96" r="40" fill="#fff" opacity="0.95" />
      <text x="100" y="108" textAnchor="middle" fontSize="34" fontWeight="800" fill="#0D9488">⅔</text>
      {[
        [30, 40, "37"],
        [160, 50, "22"],
        [40, 160, "51"],
        [158, 156, "18"],
      ].map(([x, y, n], i) => (
        <text key={n} x={x} y={y} textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" className="qw-float" style={{ animationDelay: `${i * 0.6}s` }}>
          {n}
        </text>
      ))}
    </svg>
  );
}

function Squads() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-squad" from="#4338CA" to="#818CF8" />
      {[
        [64, 92, "#FACC15"],
        [100, 80, "#fff"],
        [136, 92, "#F472B6"],
      ].map(([x, y, c], i) => (
        <g key={x} className="qw-float" style={{ animationDelay: `${i * 0.4}s` }}>
          <circle cx={x} cy={y} r="16" fill={c} />
          <rect x={x - 18} y={y + 20} width="36" height="34" rx="14" fill={c} />
        </g>
      ))}
      <text x="100" y="178" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">PLAY AS A GROUP</text>
    </svg>
  );
}

function Die({ x, y, n, fill = "#fff", pip = "#0A0A0A", className = "", style }) {
  const spots = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  }[n];
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className} style={style}>
        <rect x="-22" y="-22" width="44" height="44" rx="10" fill={fill} />
        {spots.map(([dx, dy], i) => (
          <circle key={i} cx={dx * 11} cy={dy * 11} r="4.5" fill={pip} />
        ))}
      </g>
    </g>
  );
}

function Seven() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-seven" from="#FF2D55" to="#FF9500" />
      <text x="100" y="92" textAnchor="middle" fontSize="88" fontWeight="900" fill="#fff" className="qw-pulse" style={{ letterSpacing: "-6px" }}>
        7x
      </text>
      <Die x={52} y={150} n={6} className="qw-spin" style={{ animationDuration: "3s" }} />
      <Die x={100} y={146} n={5} className="qw-float" />
      <Die x={148} y={150} n={6} className="qw-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }} />
      {[18, 182].map((x) => (
        <circle key={x} cx={x} cy="30" r="5" fill="#FACC15" className="qw-glow" />
      ))}
    </svg>
  );
}

function Double() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-x2" from="#00C2FF" to="#7C3AED" />
      <text x="100" y="76" textAnchor="middle" fontSize="64" fontWeight="900" fill="#fff" className="qw-pulse" style={{ letterSpacing: "-3px" }}>
        x2
      </text>
      <g className="qw-tug">
        <text x="56" y="150" textAnchor="middle" fontSize="54">✊</text>
      </g>
      <g className="qw-tug" style={{ animationDelay: "0.6s" }}>
        <text x="144" y="150" textAnchor="middle" fontSize="54" transform="scale(-1 1) translate(-288 0)">✌️</text>
      </g>
      <circle cx="100" cy="132" r="16" fill="#0A0A0A" />
      <text x="100" y="138" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">VS</text>
      <text x="100" y="186" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" opacity="0.9">FIRST TO 2 WINS ALL</text>
    </svg>
  );
}

function BigWheel() {
  const colors = ["#EF4444", "#06B6D4", "#F59E0B", "#F97316", "#22C55E", "#EAB308", "#8B5CF6", "#DC2626", "#6366F1", "#0EA5E9", "#EC4899", "#14B8A6"];
  const slice = (Math.PI * 2) / colors.length;
  const r = 70;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-wheel" from="#4C1D95" to="#DB2777" />
      <g transform="translate(100 108)">
        <circle r={r + 8} fill="#1F1147" stroke="#FACC15" strokeWidth="2" />
        <g className="qw-spin" style={{ animationDuration: "6s" }}>
          {colors.map((c, i) => {
            const a0 = i * slice;
            const a1 = a0 + slice;
            return <path key={c} d={`M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`} fill={c} stroke="#fff" strokeWidth="1" />;
          })}
          <circle r="14" fill="#0A0A0A" stroke="#FACC15" strokeWidth="3" />
        </g>
        <polygon points="-10,-86 10,-86 0,-66" fill="#FACC15" stroke="#0A0A0A" strokeWidth="2" />
      </g>
    </svg>
  );
}

function Mega() {
  const coins = [
    [30, 158, 0], [62, 164, 0.4], [138, 164, 0.8], [170, 158, 1.2],
  ];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <Bg id="g-mega" from="#78350F" to="#F59E0B" />
      <g className="qw-spin" style={{ animationDuration: "18s" }} opacity="0.35">
        {Array.from({ length: 12 }, (_, i) => (
          <polygon key={i} points="100,92 94,-20 106,-20" fill="#FEF3C7" transform={`rotate(${i * 30} 100 92)`} />
        ))}
      </g>
      <g className="qw-bob">
        <path d="M58 92 L70 52 L88 76 L100 40 L112 76 L130 52 L142 92 Z" fill="#FDE047" stroke="#0A0A0A" strokeWidth="3" strokeLinejoin="round" />
        <rect x="58" y="90" width="84" height="14" rx="4" fill="#FACC15" stroke="#0A0A0A" strokeWidth="3" />
        <circle cx="100" cy="40" r="6" fill="#EC4899" stroke="#0A0A0A" strokeWidth="2" />
        <circle cx="70" cy="52" r="5" fill="#22D3EE" stroke="#0A0A0A" strokeWidth="2" />
        <circle cx="130" cy="52" r="5" fill="#22D3EE" stroke="#0A0A0A" strokeWidth="2" />
      </g>
      {coins.map(([x, y, d]) => (
        <g key={x + "-" + y} className="qw-pulse" style={{ animationDelay: `${d}s` }}>
          <circle cx={x} cy={y} r="13" fill="#FACC15" stroke="#92400E" strokeWidth="3" />
          <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="900" fill="#92400E">$</text>
        </g>
      ))}
      <text x="100" y="138" textAnchor="middle" fontSize="24" fontWeight="900" fill="#fff" stroke="#0A0A0A" strokeWidth="1">JACKPOT</text>
      <text x="100" y="190" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" opacity="0.95">$1 IN · LAST ONE TAKES ALL</text>
    </svg>
  );
}

export const ART = {
  mega: Mega,
  "big-wheel": BigWheel,
  seven: Seven,
  double: Double,
  "hop-off": HopOff,
  underdog: Underdog,
  "golden-drop": GoldenDrop,
  "last-standing": LastStanding,
  "spot-kick": SpotKick,
  "derby-tug": DerbyTug,
  "mind-reader": MindReader,
  squads: Squads,
};

function GameArt({ game }) {
  const Art = ART[game];
  return Art ? <Art /> : null;
}

export default GameArt;
