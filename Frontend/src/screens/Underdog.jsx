import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Page from "../components/Page";
import Button from "../components/Button";
import StakeChips from "../components/StakeChips";
import Stat from "../components/Stat";
import { useSession } from "../contexts/SessionContext";
import { useCountdown, useGame } from "../lib/useGame";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
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
      className={`relative flex-1 min-h-[150px] rounded-[28px] p-4 text-left flex flex-col justify-between transition ${
        won ? "bg-brand text-white" : picked ? "bg-primary text-on-primary" : "bg-surface"
      } ${lost ? "opacity-50" : ""} ${disabled && !revealed ? "cursor-default" : ""}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{side === "a" ? "Side A" : "Side B"}</span>
        {won && <span className="text-xs font-bold bg-white text-brand rounded-full px-2.5 py-1">Wins</span>}
      </span>
      <span className="text-[28px] leading-tight font-extrabold tracking-tight">{label}</span>
      <span className="text-sm opacity-80 tabular">
        {revealed ? `${money(total)} · ${count} ${count === 1 ? "player" : "players"}` : picked ? "Your side" : "Tap to back"}
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

  useEffect(() => {
    setSide(null);
    setError("");
  }, [state?.roundId]);

  if (ready && !user) return <Navigate to="/sign-in" replace />;

  const you = state?.you;
  const revealed = state?.phase === "revealed";
  const chosen = you?.side || side;

  const back = async () => {
    setBusy(true);
    setError("");
    try {
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
    <Page title="Underdog" back="/play">
      <p className="text-muted">Back a side. When the clock stops, the side with less money behind it wins.</p>
      <div className="mt-4 flex gap-3">
        <Side label={a} side="a" picked={chosen === "a"} winner={state?.winner} revealed={revealed} total={state?.totals?.a} count={state?.counts?.a} onPick={() => setSide("a")} disabled={revealed || Boolean(you)} />
        <Side label={b} side="b" picked={chosen === "b"} winner={state?.winner} revealed={revealed} total={state?.totals?.b} count={state?.counts?.b} onPick={() => setSide("b")} disabled={revealed || Boolean(you)} />
      </div>

      {revealed && (
        <div className="mt-3 h-3 rounded-full bg-line overflow-hidden flex" aria-hidden>
          <div className="h-full bg-fg transition-all duration-700" style={{ width: `${share * 100}%` }} />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Stat label="Pool" value={money(state?.pool ?? 0)} />
        <Stat label="Players" value={state?.players ?? 0} />
        <Stat label={revealed ? "Next question" : "Closes in"} value={`${seconds}s`} accent />
      </div>
      {!revealed && <p className="mt-2 text-xs text-muted">Side totals stay hidden until the clock stops, so nobody can just copy the smaller side.</p>}

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
          <div className="rounded-3xl bg-primary text-on-primary p-5 animate-pop" aria-live="polite">
            {state.winner ? (
              <div className="text-sm opacity-70">
                {state.winner === "a" ? a : b} had less money behind it: {money(state.totals[state.winner])} against {money(state.totals[state.winner === "a" ? "b" : "a"])}.
              </div>
            ) : (
              <div className="text-sm opacity-70">A tie or a one-sided round: everyone gets their stake back, no fee.</div>
            )}
            <div className="mt-1 text-2xl font-extrabold tracking-tight">
              {you ? (you.payout > 0 ? `You get back ${money(you.payout)} (${money(you.payout - you.stake, { sign: true })})` : `The crowd agreed with you. You lose ${money(you.stake)}.`) : "Next question coming up"}
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
    </Page>
  );
}

export default Underdog;
