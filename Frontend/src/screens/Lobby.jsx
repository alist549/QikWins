import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Users, BadgeCheck } from "lucide-react";
import Page from "../components/Page";
import HeroCarousel from "../components/HeroCarousel";
import WinsTicker from "../components/WinsTicker";
import JackpotCard from "../components/JackpotCard";
import GameTile from "../components/GameTile";
import { useGame } from "../lib/useGame";
import { useLobby } from "../lib/usePersonal";
import { motion } from "motion/react";
import { CATEGORIES, GAMES, inCategory } from "../lib/games";

// The lobby, open to everyone: banners, live wins, and every game as a tile.
function Lobby() {
  const [hop] = useGame("hop-off");
  const [dog] = useGame("underdog");
  const [wheel] = useGame("big-wheel");
  const knockout = useLobby("last-standing");
  const duel = useLobby("double");
  const table = useLobby("seven");
  const cup = useLobby("penalties");
  const mega = useLobby("mega");
  const [category, setCategory] = useState("all");
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const live = {
    "hop-off": hop && { pool: hop.pool, people: hop.riders },
    underdog: dog && { pool: dog.pool, people: dog.players },
    double: duel && { people: sum(duel.waiting) + duel.live * 2 },
    seven: table && { people: sum(table.waiting) + table.live * table.seats },
    "big-wheel": wheel && { pool: wheel.pool + wheel.carryIn, people: wheel.players },
    "last-standing": knockout && { people: sum(knockout.waiting) + knockout.playing },
    mega: mega && { pool: Object.entries(mega.waiting || {}).reduce((n, [stake, seated]) => n + stake * seated, 0), people: sum(mega.waiting) + mega.playing },
    "spot-kick": cup && { people: sum(cup.waiting?.duel) + sum(cup.waiting?.cup) + cup.playing },
  };

  return (
    <Page layout="wide">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        <HeroCarousel />
        <JackpotCard className="hidden lg:block" />
      </div>
      <div className="mt-3 lg:mt-6">
        <WinsTicker />
      </div>
      <JackpotCard compact className="mt-3 lg:hidden" />

      <Link to="/why" className="mt-3 lg:mt-6 grid grid-cols-3 gap-2 lg:gap-4 text-[11px] lg:text-sm font-bold text-center">
        {[
          [Users, "Play people, not the house", "from-[#00C2FF] to-[#007DFE]"],
          [Eye, "Fee shown upfront", "from-[#22C55E] to-[#0EA5E9]"],
          [BadgeCheck, "Every round published", "from-[#F59E0B] to-[#EC4899]"],
        ].map(([Icon, label, tone]) => (
          <span key={label} className={`rounded-2xl py-2.5 lg:py-4 px-1.5 flex flex-col lg:flex-row lg:justify-center items-center gap-1 lg:gap-2 leading-tight text-white bg-gradient-to-br ${tone} shadow-float`}>
            <Icon size={18} />
            {label}
          </span>
        ))}
      </Link>

      <div id="games" className="mt-5 lg:mt-8 flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition ${category === c.id ? `bg-gradient-to-r ${c.tone} text-white shadow-float` : "bg-surface"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 lg:gap-x-5 gap-y-4 lg:gap-y-6">
        {GAMES.filter((g) => inCategory(g, category)).map((g, i) => (
          <motion.div key={`${category}-${g.id}`} initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22, delay: i * 0.05 }}>
            <GameTile game={g} live={live[g.id]} />
          </motion.div>
        ))}
      </div>
    </Page>
  );
}

export default Lobby;
