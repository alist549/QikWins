import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Flag, Timer, Users, Zap } from "lucide-react";
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
import { css, raceById } from "../lib/races";
import { raceScene } from "../scenes/race";
import { marbleScene } from "../scenes/marble";

const LABEL = { open: "Off in", spinning: "Racing", result: "Next race" };

// A race: back a racer while the gate is open; the winner was drawn before
// the first stake, and the race plays it out. Backers of the winner share
// the pool, less a 10% fee from the losing stakes.
function Race({ id }) {
  const theme = raceById(id);
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = useGame(id);
  const [stake, setStake] = useState(100);
  const [racer, setRacer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(null);
  const celebrated = useRef(null);
  const seconds = useCountdown(state?.endsAt);
  const phase = state?.phase;
  const you = state?.you;
  const runMs = rules?.races?.[id]?.runMs ?? 8000;
  useCountdownTicks(phase === "open" ? seconds : 0);

  const scene = useCallback((app, PIXI) => (theme.engine === "marble" ? marbleScene : raceScene)(app, PIXI, theme, { onStart: () => sfx("whoosh"), onFinish: () => sfx("reveal") }), [theme]);

  useEffect(() => {
    if (phase !== "result" || celebrated.current === state.roundId) return;
    celebrated.current = state.roundId;
    if (!you) return;
    if (you.payout > you.stake) {
      sfx(you.payout >= you.stake * 5 ? "bigWin" : "win");
      setBurst(you.payout - you.stake);
      const t = setTimeout(() => setBurst(null), 2800);
      return () => clearTimeout(t);
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
      setState(await api(`/games/${id}/stake`, { method: "POST", body: { segment: racer, stake }, token }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const mine = (i) => you?.bets?.filter((b) => b.segment === i).reduce((a, b) => a + b.stake, 0) || 0;
  const win = state?.winning;
  const showWin = phase === "result" && win != null;

  return (
    <Page title={theme.name} back="/" track="game" glow={theme.glow}>
      <div className={`relative rounded-[28px] overflow-hidden bg-gradient-to-br ${theme.bg} shadow-float`}>
        <div className="h-[17rem] lg:h-[26rem]">
          <PixiCanvas scene={scene} label={`${theme.name} track`} props={{ phase, winning: win, roundId: state?.roundId, endsAt: state?.endsAt, serverNow: state?.serverNow, runMs, selected: racer }} />
        </div>
        <div className="absolute top-3 left-3 right-3 flex justify-between z-10 pointer-events-none">
          <span className="h-8 px-3 rounded-full bg-black/60 text-white text-xs font-bold inline-flex items-center gap-1.5">
            {phase === "spinning" ? <Flag size={14} /> : <Timer size={14} />}
            {LABEL[phase] || "Loading"} {phase !== "spinning" && <span key={seconds} className="tabular qw-count inline-block">{seconds}s</span>}
          </span>
          <span className="h-8 px-3 rounded-full bg-white text-black text-sm font-extrabold inline-flex items-center tabular">
            <Counter value={(state?.pool ?? 0) + (state?.carryIn ?? 0)} />
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between z-10 pointer-events-none text-xs font-bold text-white">
          <span className="h-8 px-3 rounded-full bg-black/50 inline-flex items-center gap-1.5">
            <Users size={14} /> {state?.players ?? 0} in
          </span>
          {state?.carryIn > 0 && (
            <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="h-8 px-3 rounded-full bg-[#FACC15] text-black inline-flex items-center gap-1">
              <Zap size={14} /> Rollover +{money(state.carryIn)}
            </motion.span>
          )}
        </div>
        <AnimatePresence>
          {showWin && state.result && (
            <motion.div
              key={state.roundId}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.3 }}
              className="absolute inset-x-0 top-14 mx-auto w-max z-10 px-4 py-2 rounded-2xl bg-black/80 text-white text-center shadow-float"
            >
              <div className="text-lg font-extrabold">{theme.racers[win].name} wins</div>
              <div className="text-xs font-bold text-[#FACC15]">
                {state.result.multiplier ? `Paid ${state.result.multiplier}x` : `Nobody backed it · ${money(state.result.carryOut)} rolls over`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`mt-4 grid gap-2 ${theme.racers.length > 6 ? "grid-cols-4" : "grid-cols-3"}`}>
        {theme.racers.map((r, i) => {
          const pays = state?.pays?.[i];
          const isWin = showWin && win === i;
          const lost = showWin && win !== i;
          return (
            <motion.button
              key={r.name}
              type="button"
              aria-label={`${r.name}${pays ? `, pays ${pays}x` : ""}`}
              aria-pressed={racer === i}
              disabled={phase !== "open"}
              whileTap={{ scale: 0.92 }}
              animate={isWin ? { scale: [1, 1.12, 1.05] } : { scale: 1 }}
              onClick={() => {
                sfx("click");
                setRacer(i);
              }}
              style={{ background: `linear-gradient(160deg, ${css(r.color)}, ${css(r.color)}99)` }}
              className={`relative h-[68px] rounded-2xl text-white flex flex-col items-center justify-center shadow-float transition-opacity ${lost ? "opacity-35" : ""} ${
                racer === i || isWin ? "ring-[3px] ring-[#FACC15] ring-offset-2 ring-offset-bg" : ""
              }`}
            >
              <span className="text-sm font-black tracking-wide drop-shadow">
                {i + 1}. {r.name}
              </span>
              <span className="mt-0.5 text-[11px] font-extrabold tabular">{pays ? `${pays}x` : "Take all"}</span>
              {mine(i) > 0 && <span className="absolute -top-1.5 -right-1.5 h-5 px-1.5 rounded-full bg-[#FACC15] text-black text-[10px] font-extrabold inline-flex items-center tabular">{money(mine(i))}</span>}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 text-center text-xs text-muted">Every racer has the same chance. Fewer backers means a bigger win, and an empty one takes the whole pool.</div>

      <div className="mt-3 flex flex-col gap-3">
        {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy || phase !== "open"} />}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={busy || phase !== "open" || racer == null}
          onClick={place}
          className={`relative overflow-hidden qw-shine h-16 rounded-full bg-gradient-to-r ${theme.bg} text-white text-xl font-extrabold shadow-float disabled:opacity-50`}
        >
          {phase !== "open" ? "Race is on…" : racer == null ? theme.pick : `Back ${theme.racers[racer].name} · ${money(stake)}`}
        </motion.button>
        {you && phase === "result" && (
          <div className={`rounded-3xl p-4 text-center animate-pop ${you.payout > 0 ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white"}`} aria-live="polite">
            <div className="text-3xl font-extrabold">{you.payout > 0 ? `+${money(you.payout - you.stake)}` : "Not this race"}</div>
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
      </div>
      {burst && <WinBurst amount={burst} label="Winner!" />}
    </Page>
  );
}

export default Race;
