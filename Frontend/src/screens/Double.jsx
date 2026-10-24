import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import WinUpTo from "../components/WinUpTo";
import Page from "../components/Page";
import StakeChips from "../components/StakeChips";
import GameArt from "../components/GameArt";
import WinBurst from "../components/WinBurst";
import { useSession } from "../contexts/SessionContext";
import { useCountdown } from "../lib/useGame";
import { usePersonal } from "../lib/usePersonal";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { sfx, useCountdownTicks } from "../lib/sound";
import { motion } from "motion/react";
import { money } from "../lib/money";

const HAND = { rock: "✊", paper: "✋", scissors: "✌️" };
const MOVES = ["rock", "paper", "scissors"];

function Avatar({ name, tone }) {
  return (
    <span className={`w-14 h-14 rounded-full text-white text-xl font-extrabold inline-flex items-center justify-center shadow-float bg-gradient-to-br ${tone}`}>
      {name?.[0] || "?"}
    </span>
  );
}

function Pips({ wins, need, tone }) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={`w-3 h-3 rounded-full ${i < wins ? tone : "bg-line"}`} />
      ))}
    </span>
  );
}

// x2: Double or Nothing. Rock-paper-scissors against another player at the
// same stake; first to two wins takes the pot.
function Double() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = usePersonal("double");
  const [stake, setStake] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(null);
  const celebrated = useRef(null);
  const match = state?.match;
  const seconds = useCountdown(match?.endsAt);
  const queuedFor = useCountdown(state?.status === "queued" ? Date.now() + 1 : null);
  const throws = match?.history?.length || 0;
  const lastResult = match?.history?.[throws - 1]?.result;
  useCountdownTicks(state?.status === "playing" && !match?.picked ? seconds : 0);
  useEffect(() => {
    if (state?.status === "playing" && throws === 0) sfx("join");
  }, [state?.status, match?.id, throws]);
  useEffect(() => {
    if (throws > 0) sfx(lastResult === "win" ? "hit" : lastResult === "lose" ? "lose" : "reveal");
  }, [throws, lastResult]);

  useEffect(() => {
    if (state?.status !== "done" || !match || celebrated.current === match.id) return;
    celebrated.current = match.id;
    sfx(match.result.won ? "bigWin" : "lose");
    if (match.result.won) {
      setBurst(match.result.payout - match.stake);
      const id = setTimeout(() => setBurst(null), 2600);
      return () => clearTimeout(id);
    }
  }, [state?.status, match]);

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
  const last = match?.history?.[match.history.length - 1];
  const waiting = state?.lobby?.waiting || {};

  return (
    <Page title="x2 · Double or Nothing" back="/" track="game" glow={["0 194 255", "124 58 237"]}>
      {(status === "idle" || !state) && (
        <div className="flex flex-col gap-4 animate-sheet-up">
          <div className="relative h-48 rounded-[28px] overflow-hidden shadow-float">
            <GameArt game="double" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-extrabold tracking-tight">Beat one player. Double up.</div>
            <div className="text-sm text-muted">Rock-paper-scissors · first to 2 wins the pot</div>
          </div>
          {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
          {Object.keys(waiting).length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center text-xs font-bold">
              {Object.entries(waiting).map(([s, n]) => (
                <button key={s} type="button" onClick={() => setStake(Number(s))} className="h-7 px-3 rounded-full bg-brand/10 text-brand">
                  {n} waiting at {money(Number(s))}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => act("/games/double/queue", { stake })}
            className="relative overflow-hidden qw-shine h-16 rounded-full bg-gradient-to-r from-[#00C2FF] to-[#7C3AED] text-white text-xl font-extrabold shadow-float active:scale-[0.98] transition disabled:opacity-50"
          >
            Find opponent · {money(stake)}
          </button>
          <WinUpTo amount={stake * 2 - Math.floor(stake * (rules?.double?.feeRate ?? 0.1))} label="Win" note="Beat one player · 10% fee from the loser's stake" />
        </div>
      )}

      {status === "queued" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {[0, 0.6, 1.2].map((d) => (
              <span key={d} className="absolute inset-0 rounded-full border-4 border-brand" style={{ animation: `qw-ripple 1.8s ease-out ${d}s infinite` }} />
            ))}
            <Avatar name={user?.name} tone="from-[#00C2FF] to-[#007DFE]" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-extrabold">Finding an opponent…</div>
            <div className="text-muted font-semibold">Stake {money(state.stake)} · {queuedFor >= 0 ? "any second now" : ""}</div>
          </div>
          <button type="button" disabled={busy} onClick={() => act("/games/double/cancel")} className="h-11 px-6 rounded-full border border-line font-bold">
            Cancel and refund
          </button>
        </div>
      )}

      {(status === "playing" || status === "done") && match && (
        <div className={`flex flex-col gap-4 ${status === "done" && !match.result.won ? "qw-shake" : ""}`}>
          {/* Scoreboard */}
          <div className="rounded-[28px] bg-gradient-to-r from-[#00C2FF] to-[#7C3AED] p-4 text-white shadow-float">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center gap-1.5 w-24">
                <Avatar name={match.you.name} tone="from-[#0A0A0A] to-[#3F3F46]" />
                <span className="text-sm font-bold truncate max-w-full">You</span>
                <Pips wins={match.wins[0]} need={match.winsNeeded} tone="bg-[#FACC15]" />
              </div>
              <div className="text-center">
                <div className="text-xs font-bold opacity-80">POT</div>
                <div className="text-3xl font-extrabold tabular">{money(match.stake * 2)}</div>
                {status === "playing" && (
                  <div key={seconds} className="mt-1 text-sm font-extrabold tabular qw-count">
                    {seconds}s
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-1.5 w-24">
                <Avatar name={match.opponent.name} tone="from-[#EC4899] to-[#F97316]" />
                <span className="text-sm font-bold truncate max-w-full">{match.opponent.name}</span>
                <Pips wins={match.wins[1]} need={match.winsNeeded} tone="bg-[#FACC15]" />
              </div>
            </div>
          </div>

          {/* Arena: the last throw, then the next one */}
          <div className="rounded-[28px] bg-surface h-40 flex items-center justify-around relative overflow-hidden">
            {last ? (
              <>
                <motion.span key={`y${match.history.length}`} className="text-7xl inline-block" initial={{ x: -90, rotate: -40, scale: 0.4 }} animate={{ x: 0, rotate: 0, scale: last.result === "win" ? 1.25 : 1 }} transition={{ type: "spring", stiffness: 420, damping: 14 }}>
                  {HAND[last.you]}
                </motion.span>
                <span className={`absolute top-3 left-1/2 -translate-x-1/2 h-7 px-3 rounded-full text-xs font-extrabold inline-flex items-center ${last.result === "win" ? "bg-[#FACC15] text-black" : last.result === "lose" ? "bg-[#DC2626] text-white" : "bg-primary text-on-primary"}`}>
                  {last.result === "win" ? "YOU WIN THE THROW" : last.result === "lose" ? "THEY WIN THE THROW" : "TIE · AGAIN!"}
                </span>
                <span className="inline-block -scale-x-100">
                  <motion.span key={`t${match.history.length}`} className="text-7xl inline-block" initial={{ x: -90, rotate: -40, scale: 0.4 }} animate={{ x: 0, rotate: 0, scale: last.result === "lose" ? 1.25 : 1 }} transition={{ type: "spring", stiffness: 420, damping: 14 }}>
                    {HAND[last.them]}
                  </motion.span>
                </span>
              </>
            ) : (
              <>
                <motion.span className="text-7xl inline-block" animate={{ y: [0, -22, 0], rotate: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 0.55 }}>
                  ✊
                </motion.span>
                <span className="text-3xl font-extrabold text-muted">VS</span>
                <span className="inline-block -scale-x-100">
                  <motion.span className="text-7xl inline-block" animate={{ y: [0, -22, 0], rotate: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 0.55 }}>
                    ✊
                  </motion.span>
                </span>
              </>
            )}
          </div>

          {status === "playing" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {MOVES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-label={m}
                    disabled={busy || match.picked}
                    onClick={() => act("/games/double/move", { move: m })}
                    className="h-24 rounded-[24px] bg-primary text-on-primary text-5xl shadow-float active:scale-95 transition disabled:opacity-40 hover:-translate-y-0.5"
                  >
                    {HAND[m]}
                  </button>
                ))}
              </div>
              <div className="text-center text-sm font-bold text-muted h-5">
                {match.picked ? `Locked in · waiting for ${match.opponent.name}` : match.opponentPicked ? `${match.opponent.name} has picked. Your move!` : "Pick your move"}
              </div>
            </>
          )}

          {status === "done" && (
            <div className={`rounded-3xl p-5 text-center animate-pop ${match.result.won ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white"}`} aria-live="polite">
              <div className="text-4xl font-extrabold tracking-tight">{match.result.won ? `+${money(match.result.payout - match.stake)}` : "Beaten!"}</div>
              <div className="mt-1 text-sm opacity-80">
                {match.wins[0]}–{match.wins[1]} · pot {money(match.stake * 2)} · fee {money(match.result.fee)}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await act("/games/double/dismiss");
                  await act("/games/double/queue", { stake: match.stake });
                }}
                className="mt-4 h-12 px-6 rounded-full bg-white text-black font-extrabold"
              >
                Play again · {money(match.stake)}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger text-center">
          {error}
        </p>
      )}
      {burst && <WinBurst amount={burst} label="Doubled!" />}
    </Page>
  );
}

export default Double;
