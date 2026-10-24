import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { api } from "../lib/api";
import { money } from "../lib/money";

// Real recent wins from the results log, scrolling past like a live feed.
async function loadWins() {
  const [hop, dog] = await Promise.all([api("/rounds/hop-off?limit=8"), api("/rounds/underdog?limit=8")]);
  const wins = [];
  hop.rounds.forEach((r) => r.riders.forEach((x) => x.payout > x.stake && wins.push({ name: x.name, amount: x.payout - x.stake, game: "Hop Off", at: r.settledAt })));
  dog.rounds.forEach((r) => r.bets.forEach((x) => x.payout > x.stake && wins.push({ name: x.name, amount: x.payout - x.stake, game: "Underdog", at: r.settledAt })));
  return wins.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 16);
}

function WinsTicker() {
  const [wins, setWins] = useState([]);
  useEffect(() => {
    const refresh = () => loadWins().then(setWins).catch(() => {});
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, []);

  const items = wins.length ? wins : [{ name: "You", amount: 0, game: "the next round" }];
  return (
    <div className="relative h-10 rounded-full bg-surface overflow-hidden flex items-center" aria-label="Recent wins">
      <span className="z-10 h-full pl-3 pr-2 bg-surface inline-flex items-center gap-1.5 text-xs font-bold text-brand">
        <Trophy size={14} /> WINS
      </span>
      <div className="flex-1 overflow-hidden">
        <div className="flex w-max qw-marquee">
          {[...items, ...items].map((w, i) => (
            <span key={i} className="px-3 text-sm whitespace-nowrap tabular">
              {w.amount ? (
                <>
                  <b>{w.name}</b> won <b className="text-brand">{money(w.amount, { sign: true })}</b> in {w.game}
                </>
              ) : (
                <>Be the first winner in {w.game}</>
              )}
              <span className="text-muted pl-3">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WinsTicker;
