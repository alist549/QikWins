// Animated cover art for every game tile and banner. Plain SVG + CSS
// (index.css "Game motion"), so it costs a few KB, not images.
import { useId } from "react";
import { raceById } from "../lib/races";

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
        <radialGradient id={`${id}-glow`} gradientUnits="userSpaceOnUse" cx="100" cy="30" r="150">
          <stop offset="0" stopColor="#FFF4D6" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-vig`} gradientUnits="userSpaceOnUse" cx="100" cy="100" r="150">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.75" />
        </radialGradient>
      </defs>
      {/* Bleeds past the square so wide banners stay filled. */}
      <rect x="-400" y="-400" width="1000" height="1000" fill={`url(#${id})`} />
      <rect x="-400" y="-400" width="1000" height="1000" fill={`url(#${id}-glow)`} />
      <rect x="-400" y="-400" width="1000" height="1000" fill={`url(#${id}-vig)`} />
    </>
  );
}


// Shared pieces for the bold game-show look: twinkling sparkles, gold coins
// and big outlined headline text (dollar wins read better than multiples).
function Sparkles({ at, color = "#FEF9C3" }) {
  return at.map(([x, y, r = 6], i) => (
    <path
      key={`${x}-${y}`}
      d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`}
      fill={color}
      className="qw-twinkle"
      style={{ animationDelay: `${(i * 0.37) % 1.8}s` }}
    />
  ));
}

function Coin({ x, y, r = 12, delay = 0 }) {
  return (
    <g className="qw-pulse" style={{ animationDelay: `${delay}s` }}>
      <circle cx={x} cy={y} r={r} fill="#FACC15" stroke="#92400E" strokeWidth="3" />
      <text x={x} y={y + r * 0.4} textAnchor="middle" fontSize={r * 1.1} fontWeight="900" fill="#92400E">$</text>
    </g>
  );
}

function Big({ x = 100, y, size, children, fill, stroke = "#2A1A04", sw, style, ...rest }) {
  const id = `gold${useId().replace(/:/g, "")}`;
  const headline = size >= 24;
  return (
    <>
      {headline && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF8DC" />
            <stop offset="0.3" stopColor="#F7D774" />
            <stop offset="0.52" stopColor="#C9971C" />
            <stop offset="0.66" stopColor="#FFE9A3" />
            <stop offset="1" stopColor="#A97C1B" />
          </linearGradient>
        </defs>
      )}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        style={{ fontFamily: "Cinzel, Georgia, serif", ...style }}
        fontSize={size}
        fontWeight="900"
        fill={headline ? `url(#${id})` : fill || "#FFF8E7"}
        stroke={stroke}
        strokeWidth={sw ?? (headline ? 2.5 : 2.5)}
        strokeLinejoin="round"
        paintOrder="stroke"
        {...rest}
      >
        {children}
      </text>
    </>
  );
}

// Sky: sun rays, clouds, the jet and a skydiver.
function HopOff() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-hop" from="#0369A1" to="#38BDF8" />
      <g className="qw-spin" style={{ animationDuration: "24s" }} opacity="0.25">
        {Array.from({ length: 10 }, (_, i) => (
          <polygon key={i} points="160,36 154,-80 166,-80" fill="#FEF08A" transform={`rotate(${i * 36} 160 36)`} />
        ))}
      </g>
      <circle cx="160" cy="36" r="20" fill="#FDE047" />
      <g fill="#fff" opacity="0.85">
        <ellipse cx="34" cy="150" rx="40" ry="14" />
        <ellipse cx="70" cy="160" rx="34" ry="12" />
        <ellipse cx="170" cy="164" rx="44" ry="14" />
      </g>
      <g className="qw-float">
        <rect x="40" y="96" width="96" height="20" rx="10" fill="#FFFFFF" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <polygon points="134,96 156,106 134,116" fill="#FFFFFF" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="46,98 32,72 46,72 64,98" fill="#DC2626" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points="80,110 58,138 74,138 104,110" fill="#E4E4E7" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={62 + i * 11} cy="104" r="2.6" fill="#0369A1" />
        ))}
      </g>
      <g className="qw-bob">
        <path d="M150 112 a16 16 0 0 1 32 0 z" fill="#F97316" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <line x1="150" y1="112" x2="166" y2="132" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <line x1="182" y1="112" x2="166" y2="132" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="166" cy="134" r="3.5" fill="#0A0A0A" />
      </g>
      <Sparkles at={[[24, 30], [110, 22, 5], [96, 150, 5]]} />
      <Big y="70" size="30" className="qw-pulse">HOP OFF!</Big>
      <Big y="190" size="13" sw="3" className="qw-tagline">FLY FURTHER · WIN MORE</Big>
    </svg>
  );
}

// Split screen: a packed side A against a few on side B, and B gets the crown.
function Underdog() {
  const crowd = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) crowd.push([22 + c * 18 + (r % 2) * 6, 112 + r * 16]);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-dog" from="#6D28D9" to="#DB2777" />
      <polygon points="0,0 118,0 82,200 0,200" fill="#0A0A0A" opacity="0.3" />
      <polygon points="114,0 122,0 86,200 78,200" fill="#FDE047" />
      {crowd.map(([x, y], i) => (
        <g key={i} fill="#C4B5FD" opacity="0.85">
          <circle cx={x} cy={y} r="5" />
          <rect x={x - 6} y={y + 5} width="12" height="8" rx="4" />
        </g>
      ))}
      {[[134, 140], [160, 134]].map(([x, y]) => (
        <g key={x} fill="#fff" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2">
          <circle cx={x} cy={y} r="9" />
          <rect x={x - 11} y={y + 9} width="22" height="16" rx="7" />
        </g>
      ))}
      <path d="M134 108 l6 -14 l7 9 l7 -12 l7 12 l7 -9 l6 14 z" fill="#FDE047" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" className="qw-bob" />
      <Big x="50" y="80" size="40" fill="#C4B5FD">A</Big>
      <Big x="152" y="80" size="40">B</Big>
      <Sparkles at={[[118, 96, 5], [184, 100, 5], [176, 160, 4]]} />
      <Big y="34" size="17" sw="3" className="qw-tagline">SMALLER SIDE WINS</Big>
    </svg>
  );
}

function GoldenDrop() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
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

// Spotlight on one door: the knockout, in deep red.
function LastStanding() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-last" from="#450A0A" to="#DC2626" />
      <g className="qw-sweep">
        <polygon points="96,-10 104,-10 150,200 50,200" fill="#FEF3C7" opacity="0.22" />
      </g>
      <ellipse cx="100" cy="176" rx="70" ry="10" fill="#0A0A0A" opacity="0.35" />
      {[44, 104].map((x, i) => (
        <g key={x}>
          <rect x={x} y="76" width="52" height="96" rx="6" fill="#0A0A0A" stroke="#FACC15" strokeWidth="3" />
          <rect x={x + 4} y="80" width="44" height="88" rx="4" fill={i ? "#FEF3C7" : "#fff"} className={i === 0 ? "qw-door" : ""} />
          <circle cx={x + 40} cy="124" r="3.5" fill="#0A0A0A" />
        </g>
      ))}
      <Sparkles at={[[22, 90], [180, 84], [30, 160, 5], [172, 150, 5]]} />
      <Big y="64" size="38" fill="#FDE047" className="qw-pulse">$28.90</Big>
      <Big y="194" size="13" sw="3" className="qw-tagline">32 PLAYERS · LAST ONE WINS</Big>
    </svg>
  );
}

// Stadium at night: floodlights, the goal, the ball and the cup.
function SpotKick() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-kick" from="#022C22" to="#059669" />
      {[[16, 0], [184, 0]].map(([x], i) => (
        <g key={x} className="qw-sweep" style={{ animationDelay: `${i * 2}s` }}>
          <polygon points={`${x - 4},0 ${x + 4},0 ${x + (i ? -60 : 80)},150 ${x + (i ? -120 : 20)},150`} fill="#ECFCCB" opacity="0.16" />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 50} y="140" width="25" height="60" fill="#fff" opacity="0.06" />
      ))}
      <g stroke="#fff" strokeWidth="1.5" opacity="0.4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`v${i}`} x1={50 + i * 14} y1="76" x2={50 + i * 14} y2="126" />
        ))}
        {[0, 1, 2].map((i) => (
          <line key={`h${i}`} x1="46" y1={88 + i * 14} x2="138" y2={88 + i * 14} />
        ))}
      </g>
      <path d="M44 128 V72 H140 V128" fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" />
      <g className="qw-kick">
        <circle cx="86" cy="160" r="12" fill="#fff" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <path d="M86 152 l6 4 -2 7 h-8 l-2 -7 z" fill="#0A0A0A" />
      </g>
      <g transform="translate(164 104)">
        <g className="qw-bob">
          <path d="M-14 -22 h28 v8 a14 14 0 0 1 -28 0 z" fill="#FACC15" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
          <rect x="-4" y="0" width="8" height="10" fill="#FACC15" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
          <rect x="-11" y="10" width="22" height="6" rx="2" fill="#92400E" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        </g>
      </g>
      <Sparkles at={[[24, 70], [176, 60], [150, 110, 5]]} />
      <Big y="62" size="36" fill="#FDE047" className="qw-pulse">$13.04</Big>
      <Big y="194" size="13" sw="3" className="qw-tagline">WIN THE CUP FROM $1</Big>
    </svg>
  );
}

function DerbyTug() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
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
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
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
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
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

// Neon casino: glowing rings, gold dollars and tumbling dice.
function Seven() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-seven" from="#9F1239" to="#F97316" />
      {[78, 62, 46].map((r, i) => (
        <circle key={r} cx="100" cy="74" r={r} fill="none" stroke={["#F0ABFC", "#FDE047", "#67E8F9"][i]} strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" className="qw-spin" style={{ animationDuration: `${10 + i * 4}s`, animationDirection: i % 2 ? "reverse" : "normal" }} />
      ))}
      <Big y="90" size="46" fill="#FDE047" className="qw-pulse">$7.30</Big>
      <Big y="118" size="12" sw="3" className="qw-tagline">FROM $1 · BEAT 7 PLAYERS</Big>
      <Die x={52} y={158} n={6} className="qw-spin" style={{ animationDuration: "3s" }} />
      <Die x={100} y={154} n={5} className="qw-float" />
      <Die x={148} y={158} n={6} className="qw-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }} />
      <Coin x={18} y={120} r={10} />
      <Coin x={182} y={116} r={10} delay={0.6} />
      <Sparkles at={[[20, 26], [180, 30], [34, 186, 5], [168, 190, 5]]} />
    </svg>
  );
}

// Fight night: a lightning split, two fists and the prize.
function Double() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-x2" from="#0E7490" to="#4C1D95" />
      <polygon points="0,0 112,0 92,96 116,96 80,200 0,200" fill="#0A0A0A" opacity="0.28" />
      <polyline points="112,0 92,96 116,96 80,200" fill="none" stroke="#FDE047" strokeWidth="5" strokeLinejoin="round" className="qw-glow" />
      <g className="qw-tug">
        <text x="50" y="150" textAnchor="middle" fontSize="54">✊</text>
      </g>
      <g className="qw-tug" style={{ animationDelay: "0.6s" }}>
        <text x="150" y="150" textAnchor="middle" fontSize="54" transform="scale(-1 1) translate(-300 0)">✌️</text>
      </g>
      <circle cx="100" cy="128" r="16" fill="#0A0A0A" stroke="#FDE047" strokeWidth="2.5" />
      <text x="100" y="134" textAnchor="middle" fontSize="14" fontWeight="900" fill="#FDE047">VS</text>
      <Sparkles at={[[22, 24], [178, 70], [170, 180, 5]]} />
      <Big y="72" size="44" fill="#67E8F9" className="qw-pulse">$1.90</Big>
      <Big y="190" size="12" sw="3" className="qw-tagline">BEAT ONE PLAYER · $1 IN</Big>
    </svg>
  );
}

// Game show: a ring of marquee bulbs, the wheel on a gold rim, confetti.
function BigWheel() {
  const colors = ["#EF4444", "#06B6D4", "#F59E0B", "#F97316", "#22C55E", "#EAB308", "#8B5CF6", "#DC2626", "#6366F1", "#0EA5E9", "#EC4899", "#14B8A6"];
  const slice = (Math.PI * 2) / colors.length;
  const r = 48;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-wheel" from="#3B0764" to="#C026D3" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={100 + Math.cos(a) * 92} cy={112 + Math.sin(a) * 92} r="3.5" fill="#FDE047" className={i % 2 ? "qw-blink" : ""} style={{ animationDelay: "0.45s" }} />;
      })}
      {[[20, 40, "#22D3EE"], [182, 52, "#F472B6"], [26, 178, "#FDE047"], [176, 170, "#4ADE80"]].map(([x, y, c], i) => (
        <g key={x} transform={`rotate(${i * 40 + 20} ${x} ${y})`}>
          <rect x={x} y={y} width="7" height="11" rx="1.5" fill={c} className="qw-float" style={{ animationDelay: `${i * 0.5}s` }} />
        </g>
      ))}
      <g transform="translate(100 128)">
        <circle r={r + 9} fill="#FACC15" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <g className="qw-spin" style={{ animationDuration: "6s" }}>
          {colors.map((c, i) => {
            const a0 = i * slice;
            const a1 = a0 + slice;
            return <path key={c} d={`M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`} fill={c} stroke="#fff" strokeWidth="1" />;
          })}
          <circle r="12" fill="#0A0A0A" stroke="#FACC15" strokeWidth="3" />
        </g>
        <polygon points="-10,-64 10,-64 0,-46" fill="#fff" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      <Big y="62" size="34" fill="#FDE047" className="qw-pulse">$50+</Big>
    </svg>
  );
}

function Mega() {
  const coins = [
    [30, 158, 0], [62, 164, 0.4], [138, 164, 0.8], [170, 158, 1.2],
  ];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-mega" from="#78350F" to="#F59E0B" />
      <g className="qw-spin" style={{ animationDuration: "18s" }} opacity="0.35">
        {Array.from({ length: 12 }, (_, i) => (
          <polygon key={i} points="100,92 94,-20 106,-20" fill="#FEF3C7" transform={`rotate(${i * 30} 100 92)`} />
        ))}
      </g>
      <g className="qw-bob">
        <path d="M58 92 L70 52 L88 76 L100 40 L112 76 L130 52 L142 92 Z" fill="#FDE047" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="58" y="90" width="84" height="14" rx="4" fill="#FACC15" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="100" cy="40" r="6" fill="#B91C1C" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="70" cy="52" r="5" fill="#1E3A8A" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="130" cy="52" r="5" fill="#1E3A8A" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
      </g>
      {coins.map(([x, y, d]) => (
        <g key={x + "-" + y} className="qw-pulse" style={{ animationDelay: `${d}s` }}>
          <circle cx={x} cy={y} r="13" fill="#FACC15" stroke="#92400E" strokeWidth="3" />
          <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="900" fill="#92400E">$</text>
        </g>
      ))}
      <Big y="140" size="26">JACKPOT</Big>
      <Big y="190" size="11" sw="2.5" className="qw-tagline">$1 IN · LAST ONE TAKES ALL</Big>
    </svg>
  );
}

// Race art: each race is its own scene, in its own colours.
function RaceHead({ id }) {
  const race = raceById(id);
  return (
    <>
      <Big y="58" size="40" fill="#FDE047" className="qw-pulse">{race.max}</Big>
      <Big y="190" size="14" sw="3" letterSpacing="1" className="qw-tagline">{race.name.toUpperCase()}</Big>
    </>
  );
}

// A neon funnel: glowing marbles spiral down to the gold hole.
function MarbleMadness() {
  const marbles = [["#F43F5E", 0], ["#22D3EE", 1.2], ["#FDE047", 2.4], ["#A3E635", 3.6]];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-mm" from="#701A75" to="#DB2777" />
      {[78, 60, 42, 24].map((r, i) => (
        <ellipse key={r} cx="100" cy="128" rx={r} ry={r * 0.42} fill="none" stroke={["#F0ABFC", "#C084FC", "#818CF8", "#67E8F9"][i]} strokeWidth="5" opacity="0.9" />
      ))}
      <ellipse cx="100" cy="128" rx="10" ry="4" fill="#0A0A0A" stroke="#FDE047" strokeWidth="3" />
      <g>
        {marbles.map(([c, d], i) => {
          const a = (i / marbles.length) * Math.PI * 2;
          const r = [78, 60, 42, 24][i];
          return <circle key={c} cx={100 + Math.cos(a) * r} cy={128 + Math.sin(a) * r * 0.42} r="8" fill={c} stroke="#fff" strokeWidth="2" className="qw-pulse" style={{ animationDelay: `${d / 3}s` }} />;
        })}
      </g>
      <Sparkles at={[[24, 82], [176, 86], [150, 176, 5], [44, 176, 5]]} />
      <RaceHead id="marble-madness" />
    </svg>
  );
}

// A red race car flat out past the kerbs, chequered flag waving.
function GrandPrix() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-gp" from="#7F1D1D" to="#F97316" />
      <rect x="-20" y="138" width="240" height="40" fill="#27272A" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 20 - 10} y="132" width="10" height="6" fill={i % 2 ? "#fff" : "#DC2626"} className="qw-road" />
      ))}
      <line x1="-20" y1="158" x2="220" y2="158" stroke="#fff" strokeWidth="3" strokeDasharray="16 10" className="qw-road" />
      <g className="qw-streak" opacity="0.6">
        {[96, 112, 124].map((y, i) => <rect key={y} x={i * 30} y={y} width="50" height="3" rx="1.5" fill="#fff" />)}
      </g>
      <g className="qw-bob">
        <path d="M40 128 L58 112 H96 L112 100 H132 L136 112 H162 L170 128 Z" fill="#DC2626" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="150" y="104" width="22" height="6" rx="2" fill="#0A0A0A" />
        <rect x="30" y="112" width="16" height="6" rx="2" fill="#0A0A0A" />
        <path d="M104 104 q10 -10 22 0" fill="#FDE047" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        {[62, 146].map((x) => (
          <g key={x}>
            <circle cx={x} cy="130" r="13" fill="#0A0A0A" />
            <circle cx={x} cy="130" r="5" fill="#A1A1AA" />
          </g>
        ))}
      </g>
      <g transform="translate(170 26)">
        <line x1="0" y1="0" x2="0" y2="60" stroke="#fff" strokeWidth="3" />
        <g className="qw-tug">
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={2 + (k % 4) * 7} y={2 + Math.floor(k / 4) * 7} width="7" height="7" fill={(k + Math.floor(k / 4)) % 2 ? "#fff" : "#0A0A0A"} />
          ))}
        </g>
      </g>
      <RaceHead id="grand-prix" />
    </svg>
  );
}

// Rockets climbing on fire trails past a ringed planet.
function RocketRace() {
  const rockets = [[56, "#F43F5E", 0], [100, "#22D3EE", 0.4], [144, "#FDE047", 0.8]];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-rr" from="#1E1B4B" to="#4338CA" />
      {[[20, 20], [60, 80], [170, 90], [140, 20], [30, 120], [180, 150]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#fff" className="qw-glow" />)}
      <circle cx="176" cy="176" r="22" fill="#F59E0B" />
      <ellipse cx="176" cy="176" rx="34" ry="7" fill="none" stroke="#FDE68A" strokeWidth="3" transform="rotate(-20 176 176)" />
      {rockets.map(([x, c, d]) => (
        <g key={x} transform={`translate(${x} ${x === 100 ? 88 : 104})`}>
          <g className="qw-float" style={{ animationDelay: `${d}s` }}>
            <path d="M-6 30 Q0 64 6 30 Z" fill="#F97316" className="qw-glow" />
            <path d="M-3 30 Q0 50 3 30 Z" fill="#FDE047" />
            <path d="M0 -12 Q10 0 9 26 H-9 Q-10 0 0 -12 Z" fill="#fff" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="0" cy="6" r="4" fill={c} stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
            <path d="M-9 16 L-16 30 H-9 Z M9 16 L16 30 H9 Z" fill={c} stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
        </g>
      ))}
      <RaceHead id="rocket-race" />
    </svg>
  );
}

// Racing drones through neon gates over a night city.
function DroneDash() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-dd" from="#083344" to="#0891B2" />
      <g fill="#0A0A0A" opacity="0.55">
        {[[0, 140, 26, 60], [28, 120, 20, 80], [50, 150, 30, 50], [84, 130, 18, 70], [106, 112, 24, 88], [134, 146, 26, 54], [162, 124, 22, 76], [186, 150, 20, 50]].map(([x, y, w, h]) => <rect key={x} x={x} y={y} width={w} height={h} />)}
      </g>
      {[[64, 108, "#F0ABFC"], [140, 96, "#A3E635"]].map(([x, y, c]) => (
        <ellipse key={x} cx={x} cy={y} rx="14" ry="26" fill="none" stroke={c} strokeWidth="5" className="qw-glow" />
      ))}
      {[[40, 104, "#F43F5E", 0], [110, 92, "#FDE047", 0.5], [160, 112, "#fff", 1]].map(([x, y, c, d]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <g className="qw-float" style={{ animationDelay: `${d}s` }}>
            <rect x="-9" y="-4" width="18" height="9" rx="4" fill={c} stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
            <line x1="-14" y1="-7" x2="14" y2="-7" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
            <ellipse cx="-14" cy="-8" rx="8" ry="2" fill="#E0F2FE" opacity="0.9" />
            <ellipse cx="14" cy="-8" rx="8" ry="2" fill="#E0F2FE" opacity="0.9" />
          </g>
        </g>
      ))}
      <Sparkles at={[[24, 80], [180, 70, 5]]} />
      <RaceHead id="drone-dash" />
    </svg>
  );
}

// A speedboat cutting across bright water, spray flying.
function Powerboat() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-pb" from="#0369A1" to="#2DD4BF" />
      <circle cx="160" cy="80" r="16" fill="#FDE047" opacity="0.9" />
      <rect x="-20" y="120" width="240" height="90" fill="#0E7490" />
      {[128, 146, 166].map((y, i) => (
        <path key={y} d={`M-20 ${y} q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0`} fill="none" stroke="#A5F3FC" strokeWidth="3" opacity={0.8 - i * 0.2} className="qw-road" />
      ))}
      <g className="qw-bob">
        <path d="M44 124 H150 L170 108 H120 L108 96 H76 L68 108 H44 Z" fill="#fff" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M44 124 H150 L162 114 H50 Z" fill="#DC2626" />
        <rect x="84" y="100" width="18" height="8" rx="2" fill="#0EA5E9" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <path d="M36 122 q-14 -14 -24 -4 q10 -18 26 -8" fill="#E0F2FE" opacity="0.95" className="qw-glow" />
      </g>
      <Sparkles at={[[24, 86], [130, 150, 5], [184, 136, 5]]} color="#fff" />
      <RaceHead id="powerboat" />
    </svg>
  );
}

// Warp tunnel: star streaks rushing out from the centre, a pod in the middle.
function Hyperdrive() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full qw-art">
      <Bg id="g-hd" from="#2E1065" to="#BE185D" />
      <g className="qw-spin" style={{ animationDuration: "14s" }}>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r0 = 26 + (i % 3) * 8;
          const r1 = 90 + (i % 4) * 12;
          return <line key={i} x1={100 + Math.cos(a) * r0} y1={118 + Math.sin(a) * r0} x2={100 + Math.cos(a) * r1} y2={118 + Math.sin(a) * r1} stroke={i % 3 ? "#F0ABFC" : "#67E8F9"} strokeWidth={i % 2 ? 2 : 3} strokeLinecap="round" opacity="0.8" />;
        })}
      </g>
      <circle cx="100" cy="118" r="22" fill="#fff" opacity="0.18" className="qw-pulse" />
      <g className="qw-bob">
        <ellipse cx="100" cy="122" rx="30" ry="11" fill="#E5E7EB" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <ellipse cx="100" cy="116" rx="13" ry="8" fill="#22D3EE" stroke="#000" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="74" cy="124" r="3" fill="#F472B6" />
        <circle cx="126" cy="124" r="3" fill="#F472B6" />
      </g>
      <RaceHead id="hyperdrive" />
    </svg>
  );
}

const RACE_ART = {
  "marble-madness": MarbleMadness,
  "grand-prix": GrandPrix,
  "rocket-race": RocketRace,
  "drone-dash": DroneDash,
  powerboat: Powerboat,
  hyperdrive: Hyperdrive,
};

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
  const Art = ART[game] || RACE_ART[game];
  return Art ? <Art /> : null;
}

export default GameArt;
