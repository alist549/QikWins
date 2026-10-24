import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Skull, Trophy, Users } from "lucide-react";
import Page from "../components/Page";
import StakeChips from "../components/StakeChips";
import GameArt from "../components/GameArt";
import WinBurst from "../components/WinBurst";
import Counter from "../components/Counter";
import { useSession } from "../contexts/SessionContext";
import { useCountdown } from "../lib/useGame";
import { usePersonal } from "../lib/usePersonal";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { money } from "../lib/money";
import { sfx, useCountdownTicks } from "../lib/sound";

const TONES = ["#EF4444", "#F97316", "#FACC15", "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"];

// Everyone at the table as a dot: lit while still in, dark once knocked out.
function Crowd({ players }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {players.map((p, i) =>
        p.empty ? (
          <span key={`empty-${i}`} className="aspect-square rounded-full border-2 border-dashed border-line" />
        ) : (
        <motion.span
          key={`${p.name}-${i}`}
          layout
          initial={{ scale: 0 }}
          animate={{ scale: 1, opacity: p.out ? 0.25 : 1, filter: p.out ? "grayscale(1)" : "grayscale(0)" }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: (i % 8) * 0.02 }}
          title={p.name}
          className={`aspect-square rounded-full text-white text-xs font-extrabold inline-flex items-center justify-center ${p.you ? "ring-[3px] ring-[#FACC15]" : ""}`}
          style={{ background: TONES[i % TONES.length] }}
        >
          {p.out ? "✕" : p.name[0]}
        </motion.span>
        )
      )}
    </div>
  );
}

// Last Standing: a knockout where only the side fewer people pick survives.
function LastStanding() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = usePersonal("last-standing");
  const [stake, setStake] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(null);
  const told = useRef({});
  const table = state?.table;
  const status = state?.status || "idle";
  const seconds = useCountdown(status === "picking" ? table?.endsAt : null);
  useCountdownTicks(status === "picking" && !table?.you?.pick ? seconds : 0);

  // Sounds and confetti, once per moment.
  useEffect(() => {
    if (!table) return;
    const key = `${table.id}:${status}:${table.round}`;
    if (told.current[key]) return;
    told.current[key] = true;
    if (status === "picking" && table.round === 1) sfx("join");
    if (status === "reveal") sfx(table.you?.outAt === table.round ? "lose" : "reveal");
    if (status === "done" && table.you?.payout > 0) {
      sfx("bigWin");
      setBurst(table.you.payout - table.stake);
      setTimeout(() => setBurst(null), 2800);
    }
  }, [status, table]);

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

  const seats = rules?.lastStanding?.seats ?? 32;
  const fee = rules?.lastStanding?.feeRate ?? 0.1;
  const topWin = (s) => s * seats - Math.floor((seats - 1) * s * fee);
  const me = table?.you;
  const last = table?.last;

  return (
    <Page title="Last Standing" back="/" track={status === "idle" ? "lobby" : "game"}>
      {status === "idle" && (
        <div className="flex flex-col gap-4 animate-sheet-up">
          <div className="relative h-52 rounded-[28px] overflow-hidden shadow-float">
            <GameArt game="last-standing" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-extrabold tracking-tight">Outlast {seats - 1} players.</div>
            <div className="text-sm text-muted">Each round, only the side fewer people pick survives</div>
          </div>
          {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => {
              sfx("join");
              act("/games/last-standing/join", { stake });
            }}
            className="relative overflow-hidden qw-shine h-16 rounded-full bg-gradient-to-r from-[#B91C1C] to-[#F97316] text-white text-xl font-extrabold shadow-float disabled:opacity-50"
          >
            Join the knockout · {money(stake)}
          </motion.button>
          <div className="text-center text-sm font-bold">
            Last one standing wins <span className="text-[#F97316]">{money(topWin(stake))}</span>
            <span className="text-muted font-medium"> · about {Math.round(topWin(stake) / stake)}x</span>
          </div>
        </div>
      )}

      {status === "waiting" && table && (
        <div className="flex flex-col gap-5 py-4">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Pot</div>
            <div className="text-4xl font-extrabold">
              <Counter value={table.pot} />
            </div>
            <div className="text-sm font-bold text-muted">
              {table.seated}/{table.seatsTotal} in · starts when full
            </div>
          </div>
          <Crowd players={[...table.players, ...Array.from({ length: table.seatsTotal - table.players.length }, () => null)].map((p) => p || { empty: true })} />
          <button type="button" disabled={busy} onClick={() => act("/games/last-standing/leave")} className="self-center h-11 px-6 rounded-full border border-line font-bold">
            Leave and refund
          </button>
        </div>
      )}

      {(status === "picking" || status === "reveal" || status === "done") && table && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[28px] p-4 text-white shadow-float bg-gradient-to-br from-[#7F1D1D] via-[#B91C1C] to-[#F97316]">
            <div className="flex items-center justify-between gap-2 text-sm font-extrabold whitespace-nowrap">
              <span className="h-8 px-3 rounded-full bg-black/25 inline-flex items-center gap-1.5">
                <Users size={14} /> {table.alive}/{table.seated} left
              </span>
              <span className="h-8 px-3 rounded-full bg-white text-black inline-flex items-center">
                <Counter value={table.pot} />
              </span>
              <span className="h-8 px-3 rounded-full bg-black/25 inline-flex items-center">
                Round {table.round}
                {status === "picking" && (
                  <span key={seconds} className="ml-1.5 tabular qw-count inline-block">
                    · {seconds}s
                  </span>
                )}
              </span>
            </div>
            <div className="mt-3">
              <Crowd players={table.players} />
            </div>
          </div>

          {status === "picking" && table.question && (
            <>
              <div className="text-center text-sm font-bold text-muted">{me?.out ? "You're out. Watch who survives." : me?.pick ? "Locked in. Hope you're in the smaller crowd!" : "Pick the side you think fewer people will pick"}</div>
              <div className="grid grid-cols-2 gap-3">
                {["a", "b"].map((side, i) => (
                  <motion.button
                    key={side}
                    type="button"
                    disabled={busy || me?.out || Boolean(me?.pick)}
                    whileTap={{ scale: 0.94 }}
                    animate={me?.pick === side ? { scale: 1.04 } : { scale: 1 }}
                    onClick={() => {
                      sfx("hit");
                      act("/games/last-standing/pick", { side });
                    }}
                    className={`h-32 rounded-[26px] text-white text-2xl font-extrabold shadow-float disabled:cursor-default bg-gradient-to-br ${
                      i === 0 ? "from-[#7C3AED] to-[#4338CA]" : "from-[#EC4899] to-[#BE123C]"
                    } ${me?.pick === side ? "ring-4 ring-[#FACC15]" : ""} ${me?.pick && me.pick !== side ? "opacity-40" : ""}`}
                  >
                    {table.question[i]}
                  </motion.button>
                ))}
              </div>
            </>
          )}

          <AnimatePresence mode="wait">
            {status === "reveal" && last && (
              <motion.div key={last.round} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
                {["a", "b"].map((side, i) => {
                  const n = last.counts[side];
                  const total = last.counts.a + last.counts.b || 1;
                  const safe = last.safe === "both" || last.safe === side;
                  return (
                    <div key={side} className="relative h-12 rounded-2xl bg-surface overflow-hidden">
                      <motion.div
                        className={`absolute inset-y-0 left-0 ${safe ? "bg-[#22C55E]" : "bg-[#DC2626]"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(n / total) * 100}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                      />
                      <div className="relative h-full px-4 flex items-center justify-between font-extrabold">
                        <span>
                          {last.question[i]} {safe ? "· survives" : "· out"}
                        </span>
                        <span className="tabular">{n}</span>
                      </div>
                    </div>
                  );
                })}
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 12 }}
                  className={`mt-1 rounded-3xl p-4 text-center font-extrabold text-2xl ${me?.outAt === last.round ? "bg-[#DC2626] text-white qw-shake" : me?.out ? "bg-surface" : "bg-primary text-on-primary"}`}
                >
                  {me?.outAt === last.round ? (
                    <span className="inline-flex items-center gap-2">
                      <Skull /> Knocked out!
                    </span>
                  ) : me?.out ? (
                    `${last.left} still standing`
                  ) : (
                    `You survive! ${last.left} left`
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {status === "done" && table.result && (
            <div className={`rounded-3xl p-5 text-center animate-pop ${me?.payout > 0 ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white"}`} aria-live="polite">
              <div className="text-4xl font-extrabold tracking-tight inline-flex items-center gap-2">
                {me?.payout > 0 ? (
                  <>
                    <Trophy /> +{money(me.payout - table.stake)}
                  </>
                ) : (
                  "Knocked out"
                )}
              </div>
              <div className="mt-1 text-sm opacity-80">
                {table.result.survivors} standing after {table.result.rounds} rounds · each won {money(table.result.each)} ({table.result.multiplier}x) · fee {money(table.result.fee)}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await act("/games/last-standing/dismiss");
                  await act("/games/last-standing/join", { stake: table.stake });
                }}
                className="mt-4 h-12 px-6 rounded-full bg-white text-black font-extrabold"
              >
                Play again · {money(table.stake)}
              </button>
            </div>
          )}
          {me?.out && status !== "done" && (
            <button type="button" onClick={() => act("/games/last-standing/dismiss")} className="self-center h-10 px-5 rounded-full border border-line text-sm font-bold">
              Leave and start a new one
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger text-center">
          {error}
        </p>
      )}
      {burst && <WinBurst amount={burst} label="Last one standing!" />}
    </Page>
  );
}

export default LastStanding;
