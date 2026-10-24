import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Crown, Dices } from "lucide-react";
import WinUpTo from "../components/WinUpTo";
import Page from "../components/Page";
import StakeChips from "../components/StakeChips";
import GameArt from "../components/GameArt";
import WinBurst from "../components/WinBurst";
import Die from "../components/Dice";
import Dice3D from "../components/Dice3D";
import { useSession } from "../contexts/SessionContext";
import { useCountdown } from "../lib/useGame";
import { usePersonal } from "../lib/usePersonal";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { motion } from "motion/react";
import { sfx, useCountdownTicks } from "../lib/sound";
import { money } from "../lib/money";

const TONES = ["from-[#FF2D55] to-[#FF9500]", "from-[#7C3AED] to-[#EC4899]", "from-[#00C2FF] to-[#007DFE]", "from-[#16A34A] to-[#4ADE80]", "from-[#F59E0B] to-[#FACC15]", "from-[#0D9488] to-[#22D3EE]", "from-[#4338CA] to-[#818CF8]", "from-[#0A0A0A] to-[#52525B]"];

// 7x: eight at a table, three dice each, one re-roll, highest total wins.
function Seven() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = usePersonal("seven");
  const [stake, setStake] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(null);
  const celebrated = useRef(null);
  const table = state?.table;
  const seconds = useCountdown(table?.endsAt);
  const me = table?.seats.find((s) => s.you);
  useCountdownTicks(state?.status === "rolling" ? seconds : 0);
  useEffect(() => {
    if (state?.status === "rolling") sfx("roll");
  }, [state?.status, me?.rerolled]);
  useEffect(() => {
    if (state?.status === "waiting") sfx("click");
  }, [state?.status, table?.seats.length]);

  useEffect(() => {
    if (state?.status !== "done" || !table || celebrated.current === table.id) return;
    celebrated.current = table.id;
    sfx(me?.payout > table.stake ? "bigWin" : "lose");
    if (me?.payout > table.stake) {
      setBurst(me.payout - table.stake);
      const id = setTimeout(() => setBurst(null), 2800);
      return () => clearTimeout(id);
    }
  }, [state?.status, table, me]);

  if (ready && !user) return <Navigate to="/sign-in" replace />;

  const act = async (path, body) => {
    setBusy(true);
    setError("");
    try {
      setState(await api(path, { method: "POST", body, token }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const status = state?.status || "idle";
  const feeRate = rules?.seven?.feeRate ?? 0.1;
  const winAmount = (s) => s + Math.floor(s * 7 * (1 - feeRate));
  const ranked = table ? [...table.seats].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)) : [];
  const best = ranked[0]?.total;
  const myRank = me ? ranked.findIndex((s) => s.you) + 1 : null;

  return (
    <Page title="7x" back="/" track="game" glow={["255 45 85", "255 149 0"]}>
      {(status === "idle" || !state) && (
        <div className="flex flex-col gap-4 animate-sheet-up">
          <div className="relative h-52 rounded-[28px] overflow-hidden shadow-float">
            <GameArt game="seven" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-extrabold tracking-tight">Beat 7 players. Take it all.</div>
            <div className="text-sm text-muted">3 dice · 1 re-roll · highest total wins</div>
          </div>
          {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
          <button
            type="button"
            disabled={busy}
            onClick={() => act("/games/seven/join", { stake })}
            className="relative overflow-hidden qw-shine h-16 rounded-full bg-gradient-to-r from-[#FF2D55] to-[#FF9500] text-white text-xl font-extrabold shadow-float active:scale-[0.98] transition disabled:opacity-50"
          >
            Take a seat · {money(stake)}
          </button>
          <WinUpTo amount={winAmount(stake)} label="Take the table" note="10% fee from the other 7 stakes" />
        </div>
      )}

      {status === "waiting" && table && (
        <div className="flex-1 flex flex-col items-center gap-6 py-6">
          <div className="relative w-72 h-72">
            <div className="absolute inset-10 rounded-full bg-gradient-to-br from-[#FF2D55] to-[#FF9500] shadow-float flex flex-col items-center justify-center text-white">
              <div className="text-xs font-bold opacity-80">POT</div>
              <div className="text-3xl font-extrabold tabular">{money(table.pot)}</div>
              <div className="text-sm font-bold">
                {table.seats.length}/{table.seatsTotal} seated
              </div>
            </div>
            {Array.from({ length: table.seatsTotal }, (_, i) => {
              const angle = (i / table.seatsTotal) * Math.PI * 2 - Math.PI / 2;
              const seat = table.seats[i];
              return (
                <span
                  key={i}
                  className={`absolute w-14 h-14 -ml-7 -mt-7 rounded-full inline-flex items-center justify-center text-white font-extrabold text-lg ${
                    seat ? `bg-gradient-to-br ${TONES[i]} animate-pop shadow-float` : "border-2 border-dashed border-line text-muted"
                  } ${seat?.you ? "ring-4 ring-[#FACC15]" : ""}`}
                  style={{ left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%` }}
                  title={seat?.name}
                >
                  {seat ? seat.name[0] : "?"}
                </span>
              );
            })}
          </div>
          <div className="text-center">
            <div className="text-xl font-extrabold">Filling the table…</div>
            <div className="text-sm text-muted">Dice roll the moment 8 are seated</div>
          </div>
          <button type="button" disabled={busy} onClick={() => act("/games/seven/leave")} className="h-11 px-6 rounded-full border border-line font-bold">
            Leave and refund
          </button>
        </div>
      )}

      {(status === "rolling" || status === "done") && table && me && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[28px] bg-gradient-to-br from-[#FF2D55] to-[#FF9500] p-4 text-white shadow-float">
            <div className="flex items-center justify-between text-sm font-extrabold">
              <span className="h-8 px-3 rounded-full bg-black/25 inline-flex items-center gap-1.5">
                <Crown size={14} /> #{myRank} of {table.seats.length}
              </span>
              <span className="h-8 px-3 rounded-full bg-white text-black inline-flex items-center tabular">{money(table.pot)}</span>
              {status === "rolling" && (
                <span key={seconds} className="h-8 px-3 rounded-full bg-black/25 inline-flex items-center tabular qw-count">
                  {seconds}s
                </span>
              )}
            </div>
            <div className="mt-4">
              <Dice3D dice={me.dice} rollKey={`${table.id}-${me.rerolled}`} label={`Your dice: ${me.dice.join(", ")}`} />
            </div>
            <div className="mt-3 text-center">
              <span className="text-5xl font-extrabold tabular">{me.total}</span>
              <span className="ml-2 text-sm font-bold opacity-80">your total</span>
            </div>
          </div>

          {status === "rolling" && (
            <button
              type="button"
              disabled={busy || me.rerolled}
              onClick={() => act("/games/seven/reroll")}
              className="relative overflow-hidden qw-shine h-16 rounded-full bg-primary text-on-primary text-xl font-extrabold shadow-float active:scale-[0.98] transition disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <Dices size={24} /> {me.rerolled ? "Re-roll used" : "Re-roll all 3"}
            </button>
          )}

          {status === "done" && (
            <div className={`rounded-3xl p-5 text-center animate-pop ${me.payout > 0 ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white qw-shake"}`} aria-live="polite">
              <div className="text-4xl font-extrabold tracking-tight">{me.payout > 0 ? `+${money(me.payout - table.stake)}` : `Beaten by ${best}`}</div>
              <div className="mt-1 text-sm opacity-80">
                Top total {best} · {table.result.winners > 1 ? `${table.result.winners} winners split` : "winner takes all"} · fee {money(table.result.fee)}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await act("/games/seven/dismiss");
                  await act("/games/seven/join", { stake: table.stake });
                }}
                className="mt-4 h-12 px-6 rounded-full bg-white text-black font-extrabold"
              >
                Play again · {money(table.stake)}
              </button>
            </div>
          )}

          {/* Live leaderboard */}
          <ol className="flex flex-col gap-1.5">
            {ranked.map((s, i) => (
              <motion.li key={`${s.name}-${table.seats.indexOf(s)}`} layout transition={{ type: "spring", stiffness: 380, damping: 30 }} className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition-all ${s.you ? "bg-[#FACC15]/25 ring-2 ring-[#FACC15]" : "bg-surface"}`}>
                <span className="w-5 text-sm font-extrabold text-muted tabular">{i + 1}</span>
                <span className="flex-1 font-bold truncate">
                  {s.you ? "You" : s.name}
                  {s.rerolled && <span className="ml-1.5 text-[10px] font-bold text-muted">RE-ROLLED</span>}
                </span>
                <span className="flex gap-1">
                  {s.dice.map((n, j) => (
                    <Die key={j} n={n} size={22} rollKey={`${s.rerolled}-${j}`} tone="bg-primary text-on-primary" />
                  ))}
                </span>
                <span className={`w-9 text-right text-lg font-extrabold tabular ${s.total === best ? "text-[#FF2D55]" : ""}`}>{s.total}</span>
                {status === "done" && s.payout > 0 && <span className="text-xs font-extrabold text-brand tabular">+{money(s.payout - table.stake)}</span>}
              </motion.li>
            ))}
          </ol>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger text-center">
          {error}
        </p>
      )}
      {burst && <WinBurst amount={burst} label="You took the table!" />}
    </Page>
  );
}

export default Seven;
