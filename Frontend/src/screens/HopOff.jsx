import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Info, Users, Timer, X, Zap } from "lucide-react";
import Page from "../components/Page";
import StakeChips from "../components/StakeChips";
import { AnimatePresence, motion } from "motion/react";
import PixiCanvas from "../components/PixiCanvas";
import RouteBar from "../components/RouteBar";
import { flightScene } from "../scenes/flight";
import { sfx, useCountdownTicks } from "../lib/sound";
import WinBurst from "../components/WinBurst";
import { useSession } from "../contexts/SessionContext";
import { useCountdown, useGame } from "../lib/useGame";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { money, percent } from "../lib/money";
import { SKINS, saveSkin, savedSkin } from "../lib/skins";

const PHASE_LABEL = { boarding: "Take-off", riding: "Next city", settled: "Next flight" };

// Three pictures instead of a paragraph.
function HowItWorks({ feeRate, onClose }) {
  const steps = [
    ["1", "Board", "Pick a stake. Everyone's goes into one pool."],
    ["2", "Hop off", "Hop off at any city. Fly further, win a bigger share."],
    ["3", "Checkpoint", `Whoever is still aboard loses. Survivors share it (we keep ${percent(feeRate)}).`],
  ];
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-bg rounded-t-[28px] p-5 pb-8 animate-sheet-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold">How Hop Off works</div>
          <button type="button" aria-label="Close" onClick={onClose} className="w-9 h-9 rounded-full bg-surface inline-flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {steps.map(([n, title, text]) => (
            <div key={n} className="flex gap-3 items-start">
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-brand text-white font-extrabold inline-flex items-center justify-center">{n}</span>
              <div>
                <div className="font-bold">{title}</div>
                <div className="text-sm text-muted">{text}</div>
              </div>
            </div>
          ))}
        </div>
        <Link to="/fair" className="mt-4 inline-block text-sm font-semibold text-brand">
          Every checkpoint is fixed before boarding. Check any round →
        </Link>
      </div>
    </div>
  );
}

function HopOff() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = useGame("hop-off");
  const [skinKey, setSkinKey] = useState(savedSkin);
  const [stake, setStake] = useState(100);
  const [preset, setPreset] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(false);
  const [burst, setBurst] = useState(null);
  const celebrated = useRef(null);
  const seconds = useCountdown(state?.endsAt);
  const skin = SKINS[skinKey];
  useCountdownTicks(state?.phase === "boarding" ? seconds : 0);

  useEffect(() => setError(""), [state?.roundId, state?.phase]);
  useEffect(() => {
    if (state?.phase === "riding" && state.stop > 0) sfx("whoosh");
  }, [state?.phase, state?.stop]);

  // Celebrate a win once per round.
  const you = state?.you;
  const phase = state?.phase;
  useEffect(() => {
    if (phase !== "settled" || !you || celebrated.current === state.roundId) return;
    celebrated.current = state.roundId;
    sfx(you.offAt == null ? "lose" : you.payout > you.stake ? "win" : "reveal");
    if (you.payout > you.stake) {
      setBurst(you.payout - you.stake);
      const id = setTimeout(() => setBurst(null), 2600);
      return () => clearTimeout(id);
    }
  }, [phase, you, state?.roundId]);

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

  const caughtMe = phase === "settled" && you && you.offAt == null;

  return (
    <Page title="Hop Off" back="/" track="game">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto flex-1 -ml-1 pl-1" role="radiogroup" aria-label="Route">
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
              className={`h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap ${key === skinKey ? "bg-gradient-to-r from-[#007DFE] to-[#00C2FF] text-white" : "bg-surface"}`}
            >
              {s.city}
            </button>
          ))}
        </div>
        <button type="button" aria-label="How it works" onClick={() => setInfo(true)} className="w-8 h-8 shrink-0 rounded-full bg-surface inline-flex items-center justify-center">
          <Info size={16} />
        </button>
      </div>

      {/* The stage: the sky (PixiJS), then the route of cities. */}
      <div className={`relative mt-3 rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0050C8] via-[#007DFE] to-[#00B4FF] shadow-float ${caughtMe ? "qw-shake" : ""}`}>
        <div className="h-52 lg:h-80">
          <PixiCanvas
            scene={flightScene}
            label={phase === "riding" ? `Flying over ${skin.stops[(state?.stop || 1) - 1]}` : "The jet is waiting to take off"}
            props={{
              stop: state?.stop || 0,
              stops: skin.stops,
              sky: skin.sky,
              moving: phase === "riding",
              caught: phase === "settled" && state?.result?.caught > 0,
              hops: phase === "riding" ? (state?.riders ?? 0) - (state?.aboard ?? 0) : 0,
              myHop: phase !== "boarding" && you?.offAt != null,
            }}
          />
        </div>
        <div className="absolute top-3 left-3 right-3 flex justify-between z-10">
          <span className="h-8 px-3 rounded-full bg-black/35 text-white text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur">
            <Timer size={14} />
            {PHASE_LABEL[phase] || "Loading"} <span key={seconds} className="tabular qw-count inline-block">{seconds}s</span>
          </span>
          <span className="h-8 px-3 rounded-full bg-white text-black text-sm font-extrabold inline-flex items-center tabular">{money(state?.pool ?? 0)}</span>
        </div>
        <AnimatePresence>
          {phase === "riding" && state.stop > 0 && (
            <motion.div
              key={state.stop}
              initial={{ x: 120, opacity: 0, scale: 0.8 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="absolute left-3 top-14 z-10 h-9 px-3 rounded-xl bg-[#FACC15] text-black text-sm font-extrabold inline-flex items-center gap-1.5 shadow-float"
            >
              Stop {state.stop} · {skin.stops[state.stop - 1]}
            </motion.div>
          )}
          {phase === "settled" && (
            <motion.div
              key="checkpoint"
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="absolute left-1/2 top-[38%] -translate-x-1/2 z-10 h-11 px-4 rounded-2xl bg-[#DC2626] text-white text-base font-extrabold inline-flex items-center whitespace-nowrap shadow-float"
            >
              Checkpoint · {skin.stops[state.checkpoint - 1]}
            </motion.div>
          )}
        </AnimatePresence>
        <RouteBar stops={skin.stops} stop={state?.stop || 0} checkpoint={state?.checkpoint} myStop={you?.offAt ?? you?.presetStop} />
        <div className="flex gap-2 px-3 pb-3 text-white text-xs font-bold">
          <span className="h-8 px-3 rounded-full bg-black/25 inline-flex items-center gap-1.5">
            <Users size={14} />
            {phase === "settled" ? `${state.result.caught} caught · ${state.result.survivors} safe` : phase === "riding" ? `${state.aboard} aboard` : `${state?.riders ?? 0} flying`}
          </span>
          <span className="h-8 px-3 rounded-full bg-black/25 inline-flex items-center gap-1.5">{skin.city}</span>
          {state?.carryIn > 0 && phase !== "settled" && (
            <span className="h-8 px-3 rounded-full bg-[#FACC15] text-black inline-flex items-center gap-1">
              <Zap size={14} /> +{money(state.carryIn)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {phase === "boarding" && !you && (
          <>
            {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
            <div className="flex gap-2">
              <select
                aria-label="Auto get off"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="h-[56px] w-28 shrink-0 px-3 rounded-full bg-surface text-sm font-bold"
              >
                <option value="">Auto: off</option>
                {skin.stops.map((name, i) => (
                  <option key={name} value={i + 1}>
                    Auto: {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  sfx("join");
                  act("/games/hop-off/join", { stake, presetStop: preset ? Number(preset) : null });
                }}
                className="relative overflow-hidden qw-shine flex-1 h-[56px] rounded-full bg-gradient-to-r from-[#22C55E] to-[#0EA5E9] text-white shadow-float text-lg font-extrabold disabled:opacity-50 active:scale-[0.98] transition"
              >
                Fly · {money(stake)}
              </button>
            </div>
          </>
        )}

        {phase === "boarding" && you && (
          <div className="rounded-3xl bg-surface p-4 flex items-center gap-3 animate-pop">
            <span className="w-11 h-11 rounded-2xl bg-brand text-white inline-flex items-center justify-center font-extrabold">✓</span>
            <div>
              <div className="font-extrabold">Aboard · {money(you.stake)}</div>
              <div className="text-sm text-muted">{you.presetStop ? `Auto hop off at ${skin.stops[you.presetStop - 1]}` : "Get ready to hop off"}</div>
            </div>
          </div>
        )}

        {phase === "riding" && you && you.offAt == null && (
          <button
            type="button"
            onClick={() => {
              sfx("hit");
              act("/games/hop-off/off");
            }}
            disabled={busy}
            className="relative overflow-hidden qw-shine w-full h-28 rounded-[32px] bg-gradient-to-br from-[#FACC15] to-[#F59E0B] text-black flex flex-col items-center justify-center active:scale-[0.97] transition shadow-float qw-pulse"
          >
            <span className="text-4xl font-extrabold tracking-tight">{skin.shout}</span>
            <span className="text-sm font-bold opacity-80">
              Stop {state.stop} · {skin.stops[state.stop - 1]}
            </span>
          </button>
        )}

        {phase === "riding" && you && you.offAt != null && (
          <div className="rounded-3xl bg-surface p-4 flex items-center gap-3 animate-pop">
            <span className="w-11 h-11 rounded-2xl bg-brand text-white inline-flex items-center justify-center font-extrabold">✓</span>
            <div>
              <div className="font-extrabold">Hopped off at {skin.stops[you.offAt - 1]}. Safe!</div>
              <div className="text-sm text-muted">Now watch who gets caught.</div>
            </div>
          </div>
        )}

        {phase === "riding" && !you && <div className="rounded-3xl bg-surface p-4 font-bold text-center">Flight in progress. Catch the next one!</div>}

        {phase === "settled" && (
          <div className={`rounded-3xl p-5 animate-pop ${caughtMe ? "bg-[#DC2626] text-white" : "bg-primary text-on-primary"}`} aria-live="polite">
            <div className="text-xs font-bold uppercase tracking-wider opacity-70">
              Checkpoint · {skin.stops[state.checkpoint - 1]}
            </div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight">
              {!you ? `${state.result.caught} caught!` : caughtMe ? "Caught!" : you.payout > you.stake ? money(you.payout - you.stake, { sign: true }) : "Safe!"}
            </div>
            <div className="mt-1 text-sm opacity-80">
              {you && (caughtMe ? `−${money(you.stake)}` : `${money(you.payout)} back`)}
              {you && " · "}fee {money(state.result.fee)} · paid {money(state.result.paidOut)}
              {state.result.carryOut > 0 && ` · ${money(state.result.carryOut)} rides on`}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        {state?.recentOff?.length > 0 && phase !== "settled" && (
          <div className="flex -space-x-2 items-center" aria-label="Just got off">
            {state.recentOff.map((r, i) => (
              <span
                key={`${r.name}-${i}`}
                title={`${r.name}, ${skin.stops[r.stop - 1]}`}
                className="w-10 h-10 rounded-full border-2 border-bg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white text-sm font-extrabold inline-flex items-center justify-center animate-pop"
              >
                {r.name[0]}
              </span>
            ))}
            <span className="pl-4 text-sm font-semibold text-muted">hopped off</span>
          </div>
        )}
      </div>
      {info && <HowItWorks feeRate={state?.feeRate ?? 0.1} onClose={() => setInfo(false)} />}
      {burst && <WinBurst amount={burst} label="Big win!" />}
    </Page>
  );
}

export default HopOff;
