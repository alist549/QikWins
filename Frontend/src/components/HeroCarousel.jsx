import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GameArt from "./GameArt";

// The lobby's banner: slides that change every few seconds, swipe-free.
const SLIDES = [
  { art: "seven", kicker: "8 players · 1 table", title: "Out-roll 7 players. Win 7x.", cta: "Play 7x", to: "/play/seven", bg: "from-[#F97316] via-[#EC4899] to-[#7C3AED]" },
  { art: "double", kicker: "Head to head", title: "Rock, paper, x2!", cta: "Play x2", to: "/play/double", bg: "from-[#00C2FF] to-[#7C3AED]" },
  { art: "hop-off", kicker: "Live now", title: "Ride. Dare. Jump off!", cta: "Play Hop Off", to: "/play/hop-off", bg: "from-[#0040A0] to-[#007DFE]" },
  { art: "underdog", kicker: "Beat the crowd", title: "The smaller side wins.", cta: "Play Underdog", to: "/play/underdog", bg: "from-[#4C1D95] to-[#DB2777]" },
  { art: "last-standing", kicker: "Why QikWins", title: "The house never plays. You do.", cta: "See why", to: "/why", bg: "from-[#0A0A0A] to-[#3F3F46]" },
];

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-[28px] overflow-hidden h-44 shadow-float">
      {SLIDES.map((s, i) => (
        <div
          key={s.title}
          aria-hidden={i !== index}
          className={`absolute inset-0 bg-gradient-to-br ${s.bg} text-white flex transition-all duration-700 ${i === index ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 pointer-events-none"}`}
        >
          <div className="flex-1 p-5 flex flex-col justify-between z-10">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{s.kicker}</div>
              <div className="mt-1 text-[22px] leading-[1.1] font-extrabold tracking-tight">{s.title}</div>
            </div>
            <Link to={s.to} tabIndex={i === index ? 0 : -1} className="self-start h-9 px-4 rounded-full bg-white text-black text-sm font-bold inline-flex items-center hover:opacity-90">
              {s.cta}
            </Link>
          </div>
          <div className="w-40 shrink-0 -mr-4 -my-2 rotate-6 rounded-3xl overflow-hidden self-center shadow-float">
            <GameArt game={s.art} />
          </div>
        </div>
      ))}
      <div className="absolute bottom-3 left-5 flex gap-1.5 z-20">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Banner ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroCarousel;
