import { useEffect, useState } from "react";
import { api } from "./api";

import { GAMES } from "./games";

// Real recent wins from every game's results log (the server's /wins):
// who won, how much on top of their stake, and the multiple they got back.
// Tiny wins are left out of the feed when there are bigger ones to show.
const NAMES = { mega: "Mega Jackpot", ...Object.fromEntries(GAMES.filter((g) => g.path).map((g) => [g.path.split("/").pop(), g.name])) };

export async function loadWins() {
  const { wins } = await api("/wins");
  const named = wins.map((w) => ({ ...w, game: NAMES[w.game] || w.game }));
  const big = named.filter((w) => w.amount >= 50 || w.multiple >= 3);
  return big.length >= 4 ? big : named;
}

// One shared poll for every component that shows wins.
let latest = [];
let timer = null;
const listeners = new Set();
const refresh = () =>
  loadWins()
    .then((wins) => {
      latest = wins;
      listeners.forEach((fn) => fn(wins));
    })
    .catch(() => {});

export function useRecentWins() {
  const [wins, setWins] = useState(latest);
  useEffect(() => {
    listeners.add(setWins);
    if (!timer) {
      refresh();
      timer = setInterval(refresh, 10000);
    }
    return () => {
      listeners.delete(setWins);
      if (!listeners.size) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return wins;
}

export const times = (m) => (m >= 10 ? `${Math.round(m)}x` : `${m.toFixed(1)}x`);
