import { useEffect, useState } from "react";
import { api } from "./api";

// Real recent wins from every game's results log: who won, how much on top
// of their stake, and the multiple of their stake they got back.
const SOURCES = [
  ["mega", "Mega Jackpot", (r) => r.players, 2], // big rounds: fetch fewer
  ["big-wheel", "Big Wheel", (r) => r.bets],
  ["last-standing", "Last Standing", (r) => r.players],
  ["penalties", "Penalties", (r) => r.players],
  ["seven", "7x", (r) => r.players],
  ["double", "x2", (r) => r.players],
  ["hop-off", "Hop Off", (r) => r.riders],
  ["underdog", "Underdog", (r) => r.bets],
];

export async function loadWins() {
  const lists = await Promise.all(SOURCES.map(([id, , , limit = 8]) => api(`/rounds/${id}?limit=${limit}`).catch(() => ({ rounds: [] }))));
  const wins = [];
  lists.forEach(({ rounds }, i) => {
    const [, game, entries] = SOURCES[i];
    rounds.forEach((r) =>
      (entries(r) || []).forEach((x) => {
        const stake = x.stake ?? r.stake;
        if (x.payout > stake) wins.push({ name: x.name, amount: x.payout - stake, multiple: x.payout / stake, game, at: r.settledAt });
      })
    );
  });
  return wins.sort((a, b) => new Date(b.at) - new Date(a.at));
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
