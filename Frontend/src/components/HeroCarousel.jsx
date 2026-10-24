import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GameArt from "./GameArt";

// The lobby's banner: slides that change every few seconds, swipe-free.
const SLIDES = [
  { art: "mega", kicker: "Mega Jackpot · 2,500 players", winLabel: "JACKPOT FROM $1", win: "$2,250", title: "Outlast them all and it's yours. Play now!", cta: "Play for $1", to: "/play/mega-jackpot", bg: "from-[#78350F] via-[#CA8A04] to-[#DB2777]" },
  { art: "big-wheel", kicker: "Jackpot rolls over", title: "Back the lonely segment. Take it all.", win: "$50+", cta: "Spin to win", to: "/play/big-wheel", bg: "from-[#4C1D95] via-[#DB2777] to-[#F97316]" },
  { art: "spot-kick", kicker: "1 v 1 or a 16-player World Cup", title: "Win the cup. Lift the pot.", win: "$13.04", cta: "Take your shot", to: "/play/penalties", bg: "from-[#065F46] via-[#16A34A] to-[#CA8A04]" },
  { art: "last-standing", kicker: "32 players · 1 pot", title: "Outlast them all.", win: "$28.90", cta: "Join the knockout", to: "/play/last-standing", bg: "from-[#7F1D1D] to-[#F97316]" },
  { art: "seven", kicker: "8 players · 1 table", title: "Out-roll 7 players.", win: "$7.30", cta: "Roll now", to: "/play/seven", bg: "from-[#F97316] via-[#EC4899] to-[#7C3AED]" },
  { art: "double", kicker: "Head to head", title: "Rock, paper, double up!", win: "$1.90", cta: "Play x2", to: "/play/double", bg: "from-[#00C2FF] to-[#7C3AED]" },
  { art: "hop-off", kicker: "Fly the world", title: "Fly further. Win bigger. Hop off in time!", cta: "Play Hop Off", to: "/play/hop-off", bg: "from-[#0040A0] to-[#007DFE]" },
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
    <div className="relative rounded-[28px] overflow-hidden h-48 lg:h-full lg:min-h-[340px] qw-frame qw-bulbs bg-black">
      {SLIDES.map((s, i) => (
        <div
          key={s.title}
          aria-hidden={i !== index}
          className={`absolute inset-0 bg-gradient-to-br ${s.bg} text-white flex before:absolute before:inset-0 before:bg-[radial-gradient(120%_100%_at_30%_0%,transparent_30%,rgba(0,0,0,0.7)_100%)] transition-all duration-700 ${i === index ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6 pointer-events-none"}`}
        >
          <div className="flex-1 p-6 lg:p-12 flex flex-col justify-between z-10 min-w-0">
            <div>
              <div className="text-[10px] lg:text-sm font-bold uppercase tracking-[0.2em] text-[#F2D27A]">{s.kicker}</div>
              {s.win && (
                <div className="mt-0.5 flex items-baseline gap-2 leading-none">
                  <span className="text-[11px] lg:text-base font-black tracking-wider">{s.winLabel || (s.win.endsWith("+") ? "FROM $1, WIN" : "FROM $1, WIN UP TO")}</span>
                  <span className="text-[38px] lg:text-[92px] font-black tracking-tight qw-gold-text">{s.win}</span>
                </div>
              )}
              <div className={`${s.win ? "mt-1 text-[15px] lg:text-3xl" : "mt-1 text-xl lg:text-5xl"} leading-[1.1] font-display font-bold`}>{s.title}</div>
            </div>
            <Link to={s.to} tabIndex={i === index ? 0 : -1} className="self-start h-9 lg:h-14 px-4 lg:px-8 rounded-full qw-gold-btn text-sm lg:text-lg font-black inline-flex items-center hover:brightness-110 qw-shine relative overflow-hidden">
              {s.cta}
            </Link>
          </div>
          <div className="relative hidden sm:block w-36 lg:w-80 shrink-0 mr-3 lg:mr-6 rotate-3 rounded-3xl overflow-hidden self-center qw-frame qw-gloss z-10">
            <GameArt game={s.art} />
          </div>
        </div>
      ))}
      <div className="absolute bottom-3 lg:bottom-5 right-5 lg:right-auto lg:left-10 flex gap-1.5 z-20">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Banner ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-[#F2D27A]" : "w-1.5 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroCarousel;
