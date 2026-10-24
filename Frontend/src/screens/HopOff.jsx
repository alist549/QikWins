import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Page from "../components/Page";
import Button from "../components/Button";
import StakeChips from "../components/StakeChips";
import Stat from "../components/Stat";
import RideScene from "../components/RideScene";
import { useSession } from "../contexts/SessionContext";
import { useCountdown, useGame } from "../lib/useGame";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { money, percent } from "../lib/money";
import { SKINS, saveSkin, savedSkin } from "../lib/skins";

function HopOff() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = useGame("hop-off");
  const [skinKey, setSkinKey] = useState(savedSkin);
  const [stake, setStake] = useState(100);
  const [preset, setPreset] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seconds = useCountdown(state?.endsAt);
  const skin = SKINS[skinKey];

  useEffect(() => setError(""), [state?.roundId, state?.phase]);

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

  const you = state?.you;
  const phase = state?.phase;
  const caughtMe = phase === "settled" && you && you.offAt == null;

  return (
    <Page title={`Hop Off · ${skin.city} ${skin.vehicle.toLowerCase()}`} back="/play">
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="radiogroup" aria-label="City">
        {Object.entries(SKINS).map(([key, s]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={key === skinKey}
            onClick={() => {
              setSkinKey(key);
              saveSkin(key);
            }}
            className={`h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap ${key === skinKey ? "bg-primary text-on-primary" : "bg-surface"}`}
          >
            {s.city}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-3xl bg-surface p-3">
        <RideScene stops={skin.stops} stop={state?.stop || 0} checkpoint={state?.checkpoint} myStop={you?.offAt ?? you?.presetStop} caught={phase === "settled"} />
      </div>

      <div className="mt-3 flex gap-2">
        <Stat label="Pool" value={money(state?.pool ?? 0)} />
        <Stat
          label={phase === "boarding" ? "Riders" : phase === "settled" ? "Caught" : "Still aboard"}
          value={phase === "boarding" ? state?.riders ?? 0 : phase === "settled" ? `${state.result.caught} of ${state.riders}` : state?.aboard ?? 0}
        />
        <Stat label={phase === "riding" ? "Next stop" : phase === "boarding" ? "Leaves in" : "Next ride"} value={`${seconds}s`} accent />
      </div>
      {state?.carryIn > 0 && phase !== "settled" && (
        <p className="mt-2 text-sm font-semibold text-brand">Loaded ride: {money(state.carryIn)} carried over from the last round.</p>
      )}

      <div className="mt-4 flex-1 flex flex-col gap-3">
        {phase === "boarding" && !you && (
          <>
            <div>
              <div className="text-sm font-medium mb-2">Your stake</div>
              {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Auto get off (for weak signal)</span>
              <select value={preset} onChange={(e) => setPreset(e.target.value)} className="h-10 px-3 rounded-full bg-surface font-medium">
                <option value="">I&apos;ll tap myself</option>
                {skin.stops.map((name, i) => (
                  <option key={name} value={i + 1}>
                    Stop {i + 1}, {name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              title={`Board for ${money(stake)}`}
              variant="brand"
              loading={busy}
              fun={() => act("/games/hop-off/join", { stake, presetStop: preset ? Number(preset) : null })}
            />
          </>
        )}

        {phase === "boarding" && you && (
          <div className="rounded-3xl border border-line p-4">
            <div className="font-semibold">You&apos;re aboard with {money(you.stake)}.</div>
            <div className="text-sm text-muted">
              {you.presetStop ? `You'll get off at stop ${you.presetStop}, ${skin.stops[you.presetStop - 1]}.` : `Tap ${skin.shout} once the ride is moving.`}
            </div>
          </div>
        )}

        {phase === "riding" && you && you.offAt == null && (
          <button
            type="button"
            onClick={() => act("/games/hop-off/off")}
            disabled={busy}
            className="w-full h-24 rounded-[32px] bg-brand text-white flex flex-col items-center justify-center active:scale-[0.98] transition shadow-float"
          >
            <span className="text-3xl font-extrabold tracking-tight">{skin.shout}</span>
            <span className="text-sm opacity-90">
              {skin.shoutHint} · stop {state.stop}, {skin.stops[state.stop - 1]}
            </span>
          </button>
        )}

        {phase === "riding" && you && you.offAt != null && (
          <div className="rounded-3xl border border-line p-4">
            <div className="font-semibold">You got off at stop {you.offAt}, {skin.stops[you.offAt - 1]}.</div>
            <div className="text-sm text-muted">Safe. You get your stake back plus a share of whatever the checkpoint catches.</div>
          </div>
        )}

        {phase === "riding" && !you && <p className="text-muted text-sm">This ride has left. Watch it, then board the next one.</p>}

        {phase === "settled" && (
          <div className="rounded-3xl bg-primary text-on-primary p-5 animate-pop" aria-live="polite">
            <div className="text-sm opacity-70">Checkpoint at stop {state.checkpoint}, {skin.stops[state.checkpoint - 1]}</div>
            {you ? (
              <div className="mt-1 text-2xl font-extrabold tracking-tight">
                {caughtMe
                  ? `Caught! You lose ${money(you.stake)}.`
                  : you.payout > you.stake
                    ? `Safe! You get back ${money(you.payout)} (${money(you.payout - you.stake, { sign: true })})`
                    : `Safe. Nobody was caught, so you get your ${money(you.stake)} back.`}
              </div>
            ) : (
              <div className="mt-1 text-2xl font-extrabold tracking-tight">{state.result.caught} caught, {state.result.survivors} safe</div>
            )}
            <div className="mt-2 text-sm opacity-70">
              {money(state.result.caughtPot)} caught · fee {money(state.result.fee)} ({percent(state.feeRate)} of caught money) · {money(state.result.paidOut)} paid out
              {state.result.carryOut > 0 && ` · ${money(state.result.carryOut)} rides on`}
            </div>
            <Link to="/fair" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
              Check this round
            </Link>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {state?.recentOff?.length > 0 && phase !== "settled" && (
          <div>
            <div className="text-sm font-medium mb-1.5">Just got off</div>
            <ul className="flex flex-wrap gap-1.5 text-sm">
              {state.recentOff.map((r, i) => (
                <li key={`${r.name}-${i}`} className="h-7 px-3 rounded-full bg-surface inline-flex items-center">
                  {r.name} · stop {r.stop}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-auto pt-4 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-fg">How the money works</summary>
          <p className="mt-2 leading-relaxed">
            Everyone&apos;s stake goes into one pool. Riders the checkpoint catches lose their stake. QikWins keeps {percent(state?.feeRate ?? 0.1)} of that caught money; the rest
            goes to riders who got off in time, on top of their own stake back, shared by stake times stops ridden. If everyone is caught, the money rides on to the next ride.
            The checkpoint is fixed before boarding: its fingerprint is <code className="break-all text-[11px]">{state?.hash}</code>
          </p>
        </details>
      </div>
    </Page>
  );
}

export default HopOff;
