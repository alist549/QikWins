import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import Page from "../components/Page";
import Button from "../components/Button";
import WinBurst from "../components/WinBurst";
import StakeChips from "../components/StakeChips";
import Stat from "../components/Stat";
import { useSession } from "../contexts/SessionContext";
import { useCountdown, useGame } from "../lib/useGame";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { sfx, useCountdownTicks } from "../lib/sound";
import { money, percent } from "../lib/money";

function Side({ label, side, picked, winner, revealed, total, count, onPick, disabled }) {
  const won = revealed && winner === side;
  const lost = revealed && winner && winner !== side;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={picked}
      className={`relative flex-1 min-h-[170px] rounded-[28px] p-4 text-left flex flex-col justify-between text-white bg-gradient-to-br transition-all duration-300 shadow-float ${
        side === "a" ? "from-[#5B21B6] to-[#8B5CF6]" : "from-[#BE185D] to-[#F472B6]"
      } ${picked ? "ring-4 ring-[#FACC15] scale-[1.02]" : ""} ${won ? "ring-4 ring-white scale-[1.04]" : ""} ${lost ? "opacity-40 grayscale" : ""} ${disabled && !revealed ? "cursor-default" : ""}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{side === "a" ? "Side A" : "Side B"}</span>
        {won && <span className="text-xs font-extrabold bg-white text-black rounded-full px-2.5 py-1 animate-pop">WINS</span>}
      </span>
      <span className="text-[30px] leading-tight font-extrabold tracking-tight drop-shadow">{label}</span>
      <span className="text-sm opacity-80 tabular">
        {revealed ? `${money(total)} · ${count}` : picked ? "Your side ✓" : "Tap to pick"}
      </span>
    </button>
  );
}

function Underdog() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = useGame("underdog");
  const [stake, setStake] = useState(100);
  const [side, setSide] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seconds = useCountdown(state?.endsAt);
  useCountdownTicks(state?.phase === "open" ? seconds : 0);
  const [burst, setBurst] = useState(null);
  const celebrated = useRef(null);

  useEffect(() => {
    setSide(null);
    setError("");
  }, [state?.roundId]);

  const you = state?.you;
  const revealed = state?.phase === "revealed";
  useEffect(() => {
    if (!revealed || celebrated.current === state.roundId) return;
    celebrated.current = state.roundId;
    if (!you) return sfx("reveal");
    sfx(you.payout > you.stake ? "win" : you.payout === you.stake ? "reveal" : "lose");
    if (you.payout > you.stake) {
      setBurst(you.payout - you.stake);
      const id = setTimeout(() => setBurst(null), 2600);
      return () => clearTimeout(id);
    }
  }, [revealed, you, state?.roundId]);

  if (ready && !user) return <Navigate to="/sign-in" replace />;
  const chosen = you?.side || side;

  const back = async () => {
    setBusy(true);
    setError("");
    try {
      sfx("join");
      setState(await api("/games/underdog/stake", { method: "POST", body: { side: chosen, stake }, token }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const [a, b] = state?.question || ["", ""];
  const share = revealed && state.totals ? state.totals.a / Math.max(1, state.totals.a + state.totals.b) : 0.5;

  return (
    <Page title="Underdog" back="/" track="game">
      <div className="text-center text-sm font-extrabold uppercase tracking-wider text-muted">The smaller side wins</div>
      <div className="relative mt-3 flex gap-3">
        <Side label={a} side="a" picked={chosen === "a"} winner={state?.winner} revealed={revealed} total={state?.totals?.a} count={state?.counts?.a} onPick={() => setSide("a")} disabled={revealed || Boolean(you)} />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-primary text-on-primary border-4 border-bg font-extrabold text-sm inline-flex items-center justify-center qw-pulse">VS</span>
        <Side label={b} side="b" picked={chosen === "b"} winner={state?.winner} revealed={revealed} total={state?.totals?.b} count={state?.counts?.b} onPick={() => setSide("b")} disabled={revealed || Boolean(you)} />
      </div>

      {revealed && (
        <div className="mt-3 h-4 rounded-full bg-gradient-to-r from-[#BE185D] to-[#F472B6] overflow-hidden flex" aria-hidden>
          <div className="h-full bg-gradient-to-r from-[#5B21B6] to-[#8B5CF6] transition-all duration-1000" style={{ width: `${share * 100}%` }} />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Stat label="Pool" value={money(state?.pool ?? 0)} />
        <Stat label="Players" value={state?.players ?? 0} />
        <Stat label={revealed ? "Next question" : "Closes in"} value={`${seconds}s`} accent />
      </div>
      {!revealed && <p className="mt-2 text-xs text-muted text-center">Totals hidden until the clock stops</p>}

      <div className="mt-4 flex flex-col gap-3">
        {!revealed && (
          <>
            <div>
              <div className="text-sm font-medium mb-2">{you ? `You've backed ${you.side === "a" ? a : b} with ${money(you.stake)}. Add more?` : "Your stake"}</div>
              {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
            </div>
            <Button title={chosen ? `Back ${chosen === "a" ? a : b} with ${money(stake)}` : "Pick a side first"} variant="brand" disabled={!chosen} loading={busy} fun={back} />
          </>
        )}

        {revealed && (
          <div className={`rounded-3xl p-5 animate-pop ${you && you.payout === 0 ? "bg-[#DC2626] text-white qw-shake" : "bg-primary text-on-primary"}`} aria-live="polite">
            {state.winner ? (
              <div className="text-sm opacity-70">
                {state.winner === "a" ? a : b} had less money behind it: {money(state.totals[state.winner])} against {money(state.totals[state.winner === "a" ? "b" : "a"])}.
              </div>
            ) : (
              <div className="text-sm opacity-70">A tie or a one-sided round: everyone gets their stake back, no fee.</div>
            )}
            <div className="mt-1 text-2xl font-extrabold tracking-tight">
              {you ? (you.payout > you.stake ? money(you.payout - you.stake, { sign: true }) : you.payout > 0 ? "Refunded" : "The crowd agreed with you!") : "Next question coming up"}
            </div>
            <div className="mt-2 text-sm opacity-70">
              Fee {money(state.result.fee)} ({percent(state.feeRate)} of the losing side) · {money(state.result.paidOut)} paid out
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {burst && <WinBurst amount={burst} />}
    </Page>
  );
}

export default Underdog;
