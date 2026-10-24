import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Timer, Users, Zap } from "lucide-react";
import Page from "../components/Page";
import StakeChips from "../components/StakeChips";
import PixiCanvas from "../components/PixiCanvas";
import WinBurst from "../components/WinBurst";
import Counter from "../components/Counter";
import { useSession } from "../contexts/SessionContext";
import { useCountdown, useGame } from "../lib/useGame";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { money } from "../lib/money";
import { sfx, useCountdownTicks } from "../lib/sound";
import { SEGMENTS, cssColor, wheelScene } from "../scenes/wheel";

const scene = (app, PIXI) => wheelScene(app, PIXI, { onTick: () => sfx("spinTick") });
const LABEL = { open: "Spins in", spinning: "Spinning", result: "Next spin" };

// Big Wheel: stake on any segments; the segments fewest people backed pay
// the most. Live multipliers show what each would pay right now.
function BigWheel() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = useGame("big-wheel");
  const [stake, setStake] = useState(100);
  const [segment, setSegment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(null);
  const celebrated = useRef(null);
  const seconds = useCountdown(state?.endsAt);
  const phase = state?.phase;
  const you = state?.you;
  useCountdownTicks(phase === "open" ? seconds : 0);

  useEffect(() => {
    if (phase !== "result" || celebrated.current === state.roundId) return;
    celebrated.current = state.roundId;
    if (!you) return sfx("reveal");
    if (you.payout > you.stake) {
      sfx(you.payout >= you.stake * 10 ? "bigWin" : "win");
      setBurst(you.payout - you.stake);
      const id = setTimeout(() => setBurst(null), 2800);
      return () => clearTimeout(id);
    }
    sfx("lose");
  }, [phase, you, state?.roundId]);

  useEffect(() => {
    if (phase === "open") setError("");
  }, [phase, state?.roundId]);

  if (ready && !user) return <Navigate to="/sign-in" replace />;

  const place = async () => {
    setBusy(true);
    setError("");
    try {
      sfx("join");
      setState(await api("/games/big-wheel/stake", { method: "POST", body: { segment, stake }, token }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const mine = (i) => you?.bets?.filter((b) => b.segment === i).reduce((a, b) => a + b.stake, 0) || 0;
  const win = state?.winning;
  const best = state?.pays ? Math.max(...state.pays.filter(Boolean), 0) : 0;

  return (
    <Page title="Big Wheel" back="/" track="game">
      {/* The stage */}
      <div className="relative rounded-[28px] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#4C1D95,#1E1B4B_70%)] shadow-float">
        <div className="h-[19rem] lg:h-[26rem]">
          <PixiCanvas scene={scene} label="The Big Wheel" props={{ phase, winning: win, selected: segment, spinMs: rules?.bigWheel?.spinMs }} />
        </div>
        <div className="absolute top-3 left-3 right-3 flex justify-between z-10 pointer-events-none">
          <span className="h-8 px-3 rounded-full bg-black/40 text-white text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur">
            <Timer size={14} />
            {LABEL[phase] || "Loading"} {phase !== "spinning" && <span key={seconds} className="tabular qw-count inline-block">{seconds}s</span>}
          </span>
          <span className="h-8 px-3 rounded-full bg-white text-black text-sm font-extrabold inline-flex items-center tabular">
            <Counter value={(state?.pool ?? 0) + (state?.carryIn ?? 0)} />
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between z-10 pointer-events-none text-xs font-bold text-white">
          <span className="h-8 px-3 rounded-full bg-black/40 inline-flex items-center gap-1.5">
            <Users size={14} /> {state?.players ?? 0} playing
          </span>
          {state?.carryIn > 0 && (
            <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="h-8 px-3 rounded-full bg-[#FACC15] text-black inline-flex items-center gap-1">
              <Zap size={14} /> Jackpot +{money(state.carryIn)}
            </motion.span>
          )}
        </div>
        <AnimatePresence>
          {phase === "result" && state.result && (
            <motion.div
              key={state.roundId}
              initial={{ scale: 0.3, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.2 }}
              className="absolute left-1/2 bottom-14 -translate-x-1/2 z-10 px-4 py-2 rounded-2xl bg-black/80 text-white text-center shadow-float whitespace-nowrap"
            >
              <div className="text-lg font-extrabold">
                {SEGMENTS[win].icon} {SEGMENTS[win].name} wins
              </div>
              <div className="text-xs font-bold text-[#FACC15]">
                {state.result.multiplier ? `Paid ${state.result.multiplier}x` : `Nobody on it · ${money(state.result.carryOut)} rolls over`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Segments: tap one, see what it pays right now. */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {SEGMENTS.map((s, i) => {
          const pays = state?.pays?.[i];
          const isWin = phase !== "open" && win === i;
          const lost = phase === "result" && win !== i;
          return (
            <motion.button
              key={s.name}
              type="button"
              aria-label={`${s.name}${pays ? `, pays ${pays}x` : ""}`}
              aria-pressed={segment === i}
              disabled={phase !== "open"}
              whileTap={{ scale: 0.9 }}
              animate={isWin ? { scale: [1, 1.12, 1.05] } : { scale: 1 }}
              onClick={() => {
                sfx("click");
                setSegment(i);
              }}
              style={{ background: `linear-gradient(160deg, ${cssColor(s.color)}, ${cssColor(s.color)}aa)` }}
              className={`relative h-[74px] rounded-2xl text-white flex flex-col items-center justify-center shadow-float transition-opacity ${lost ? "opacity-35" : ""} ${
                segment === i || isWin ? "ring-[3px] ring-[#FACC15] ring-offset-2 ring-offset-bg" : ""
              }`}
            >
              <span className="text-2xl leading-none">{s.icon}</span>
              <span className={`mt-1 text-[11px] font-extrabold tabular ${pays === best && pays ? "text-[#FEF08A]" : ""}`}>{pays ? `${pays}x` : "Take all"}</span>
              {mine(i) > 0 && <span className="absolute -top-1.5 -right-1.5 h-5 px-1.5 rounded-full bg-[#FACC15] text-black text-[10px] font-extrabold inline-flex items-center tabular">{money(mine(i))}</span>}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 text-center text-xs text-muted">Fewer people on a segment means a bigger win. Back an empty one and, if it lands, the whole wheel is yours.</div>

      <div className="mt-3 flex flex-col gap-3">
        {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy || phase !== "open"} />}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={busy || phase !== "open" || segment == null}
          onClick={place}
          className="relative overflow-hidden qw-shine h-16 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#F97316] text-white text-xl font-extrabold shadow-float disabled:opacity-50"
        >
          {phase !== "open" ? "Wheel is spinning…" : segment == null ? "Pick a segment" : `Stake ${money(stake)} on ${SEGMENTS[segment].icon} ${SEGMENTS[segment].name}`}
        </motion.button>
        {you && phase === "result" && (
          <div className={`rounded-3xl p-4 text-center animate-pop ${you.payout > 0 ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white"}`} aria-live="polite">
            <div className="text-3xl font-extrabold">{you.payout > 0 ? `+${money(you.payout - you.stake)}` : "Not this spin"}</div>
            <div className="text-sm opacity-80">
              You staked {money(you.stake)} · back {money(you.payout)} · fee {money(state.result.fee)}
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger text-center">
            {error}
          </p>
        )}
        {state?.recent?.length > 0 && phase === "open" && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            <AnimatePresence initial={false}>
              {state.recent.map((r) => (
                <motion.span
                  key={`${r.name}-${r.segment}-${r.stake}`}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-7 px-2.5 rounded-full bg-surface text-xs font-bold inline-flex items-center gap-1"
                >
                  {r.name} {SEGMENTS[r.segment].icon} {money(r.stake)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      {burst && <WinBurst amount={burst} label="Winner!" />}
    </Page>
  );
}

export default BigWheel;
