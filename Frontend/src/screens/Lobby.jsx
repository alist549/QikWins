import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Users, BadgeCheck } from "lucide-react";
import Page from "../components/Page";
import HeroCarousel from "../components/HeroCarousel";
import WinsTicker from "../components/WinsTicker";
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
  const [category, setCategory] = useState("all");
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const live = {
    "hop-off": hop && { pool: hop.pool, people: hop.riders },
    underdog: dog && { pool: dog.pool, people: dog.players },
    double: duel && { people: sum(duel.waiting) + duel.live * 2 },
    seven: table && { people: sum(table.waiting) + table.live * table.seats },
    "big-wheel": wheel && { pool: wheel.pool + wheel.carryIn, people: wheel.players },
    "last-standing": knockout && { people: sum(knockout.waiting) + knockout.playing },
  };

  return (
    <Page>
      <HeroCarousel />
      <div className="mt-3">
        <WinsTicker />
      </div>

      <Link to="/why" className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold text-center">
        {[
          [Users, "Play people, not the house", "from-[#00C2FF] to-[#007DFE]"],
          [Eye, "Fee shown upfront", "from-[#22C55E] to-[#0EA5E9]"],
          [BadgeCheck, "Every round published", "from-[#F59E0B] to-[#EC4899]"],
        ].map(([Icon, label, tone]) => (
          <span key={label} className={`rounded-2xl py-2.5 px-1.5 flex flex-col items-center gap-1 leading-tight text-white bg-gradient-to-br ${tone} shadow-float`}>
            <Icon size={18} />
            {label}
          </span>
        ))}
      </Link>

      <div id="games" className="mt-5 flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="tablist">
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

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
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
