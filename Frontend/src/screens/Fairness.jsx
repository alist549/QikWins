import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import Page from "../components/Page";
import { api } from "../lib/api";
import { money, percent } from "../lib/money";

const TABS = [
  ["seven", "7x"],
  ["double", "x2"],
  ["hop-off", "Hop Off"],
  ["underdog", "Underdog"],
];

const HAND = { rock: "✊", paper: "✋", scissors: "✌️" };

function DoubleRound({ r }) {
  const [a, b] = r.players;
  return (
    <li className="rounded-3xl border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {a.name} {a.wins}–{b.wins} {b.name}
        </span>
        <span className="text-xs text-muted">{new Date(r.settledAt).toLocaleTimeString()}</span>
      </div>
      <div className="mt-1 text-sm text-muted tabular">
        Stake {money(r.stake)} each · pot {money(r.pool)} · fee {money(r.fee)} · winner paid {money(r.paidOut)}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-lg">
        {r.throws.map((t, i) => (
          <span key={i} className="h-8 px-2 rounded-full bg-surface inline-flex items-center gap-1">
            {HAND[t.moves[0]]}
            <span className="text-[10px] font-bold text-muted">v</span>
            {HAND[t.moves[1]]}
          </span>
        ))}
      </div>
    </li>
  );
}

function SevenRound({ r }) {
  const ranked = [...r.players].sort((x, y) => y.total - x.total);
  return (
    <li className="rounded-3xl border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Best roll {ranked[0]?.total}</span>
        <span className="text-xs text-muted">{new Date(r.settledAt).toLocaleTimeString()}</span>
      </div>
      <div className="mt-1 text-sm text-muted tabular">
        {r.players.length} players · {money(r.stake)} each · table {money(r.pool)} · fee {money(r.fee)} · paid {money(r.paidOut)}
      </div>
      <ul className="mt-2 text-sm divide-y divide-line">
        {ranked.map((x, i) => (
          <li key={i} className="py-1.5 flex justify-between tabular">
            <span>
              {x.name} · {x.dice.join(" + ")} = {x.total}
              {x.rerolled ? " (re-rolled)" : ""}
            </span>
            <span className={x.payout > 0 ? "font-semibold" : "text-muted"}>{money(x.payout)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

const ROUND = { "hop-off": HopOffRound, underdog: UnderdogRound, double: DoubleRound, seven: SevenRound };

function HopOffRound({ r }) {
  const [check, setCheck] = useState(null);
  const verify = async () => {
    const res = await api(`/fair/verify?seed=${r.seed}&hash=${r.hash}&roundId=${encodeURIComponent(r.id)}&stop=${r.checkpoint}`).catch(() => null);
    setCheck(res);
  };
  return (
    <li className="rounded-3xl border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Checkpoint at stop {r.checkpoint}</span>
        <span className="text-xs text-muted">{new Date(r.settledAt).toLocaleTimeString()}</span>
      </div>
      <div className="mt-1 text-sm text-muted tabular">
        {r.riders.length} riders · pool {money(r.pool)} · {r.caught} caught · fee {money(r.fee)} ({percent(r.feeRate)} of {money(r.caughtPot)}) · paid {money(r.paidOut)}
        {r.carryIn > 0 && ` · ${money(r.carryIn)} carried in`}
        {r.carryOut > 0 && ` · ${money(r.carryOut)} carried out`}
      </div>
      <ul className="mt-2 text-sm divide-y divide-line">
        {r.riders.map((x, i) => (
          <li key={i} className="py-1.5 flex justify-between tabular">
            <span>
              {x.name} · {money(x.stake)} · {x.offAt ? `off at stop ${x.offAt}` : <span className="text-danger font-medium">caught</span>}
            </span>
            <span className={x.payout > 0 ? "font-semibold" : "text-muted"}>{money(x.payout)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-[11px] text-muted break-all">
        Round {r.id} · hash {r.hash} · seed {r.seed}
      </div>
      <button type="button" onClick={verify} className="mt-2 h-9 px-4 rounded-full bg-surface text-sm font-semibold inline-flex items-center gap-1.5">
        <BadgeCheck size={16} className="text-brand" />
        {check ? (check.ok ? "Verified: seed matches, stop matches" : "Does not match") : "Verify this round"}
      </button>
    </li>
  );
}

function UnderdogRound({ r }) {
  const [a, b] = r.question;
  return (
    <li className="rounded-3xl border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {a} vs {b}: {r.winner ? `${r.winner === "a" ? a : b} won` : "refunded"}
        </span>
        <span className="text-xs text-muted">{new Date(r.settledAt).toLocaleTimeString()}</span>
      </div>
      <div className="mt-1 text-sm text-muted tabular">
        {a} {money(r.totals.a)} · {b} {money(r.totals.b)} · fee {money(r.fee)} · paid {money(r.paidOut)}
      </div>
      <ul className="mt-2 text-sm divide-y divide-line">
        {r.bets.map((x, i) => (
          <li key={i} className="py-1.5 flex justify-between tabular">
            <span>
              {x.name} · {x.side === "a" ? a : b} · {money(x.stake)}
            </span>
            <span className={x.payout > 0 ? "font-semibold" : "text-muted"}>{money(x.payout)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

// The public settlement log: every finished round, its pool, the fee and
// every payout. Hop Off rounds can be re-checked from their revealed seed.
function Fairness() {
  const [tab, setTab] = useState("seven");
  const Round = ROUND[tab];
  const [rounds, setRounds] = useState(null);

  useEffect(() => {
    setRounds(null);
    api(`/rounds/${tab}?limit=20`)
      .then((d) => setRounds(d.rounds))
      .catch(() => setRounds([]));
  }, [tab]);

  return (
    <Page title="Results log" back="/">
      <p className="text-muted">
        Every finished round, with the pool, the fee and every payout. For Hop Off, the checkpoint&apos;s fingerprint (hash) is shown before boarding; the seed is revealed after, so you
        can check nothing changed.
      </p>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`h-9 px-4 rounded-full text-sm font-semibold ${tab === key ? "bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white" : "bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {rounds === null && <li className="text-muted">Loading…</li>}
        {rounds?.length === 0 && <li className="text-muted">No finished rounds yet.</li>}
        {rounds?.map((r) => (
          <Round key={r.id} r={r} />
        ))}
      </ul>
      <details className="mt-6 text-sm text-muted">
        <summary className="cursor-pointer font-medium text-fg">Check a round yourself</summary>
        <p className="mt-2 leading-relaxed">
          sha256(seed) must equal the hash. Then HMAC-SHA256 with the seed as key and &quot;hop-off:&lt;round ID&gt;&quot; as message; take the first 8 hex characters as a number;
          the checkpoint is 1 + (that number mod 10).
        </p>
      </details>
    </Page>
  );
}

export default Fairness;
