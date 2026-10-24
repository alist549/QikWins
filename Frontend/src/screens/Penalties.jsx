import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Swords, Trophy, Wallet } from "lucide-react";
import WinUpTo from "../components/WinUpTo";
import Page from "../components/Page";
import StakeChips from "../components/StakeChips";
import GameArt from "../components/GameArt";
import Goal, { SPOT_NAMES } from "../components/Goal";
import WinBurst from "../components/WinBurst";
import Counter from "../components/Counter";
import { useSession } from "../contexts/SessionContext";
import { useCountdown } from "../lib/useGame";
import { usePersonal } from "../lib/usePersonal";
import { useRules } from "../lib/useRules";
import { api } from "../lib/api";
import { money } from "../lib/money";
import { sfx, useCountdownTicks } from "../lib/sound";

// Kick dots: one per kick each, filled green for a goal, red for a miss.
function Kicks({ history, mine, kicksEach }) {
  const taken = history.filter((k) => (mine ? k.you === "shoot" : k.you === "keep"));
  const slots = Math.max(kicksEach, taken.length);
  return (
    <span className="flex gap-1">
      {Array.from({ length: slots }, (_, i) => {
        const k = taken[i];
        return <span key={i} className={`w-3 h-3 rounded-full ${!k ? "bg-white/30" : k.goal ? "bg-[#22C55E]" : "bg-[#DC2626]"}`} />;
      })}
    </span>
  );
}

function Bracket({ bracket }) {
  if (!bracket?.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {bracket.map((r) => (
        <div key={r.round}>
          <div className="text-xs font-bold uppercase tracking-wider text-muted">{r.name}</div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {r.matches.map((m, i) => (
              <div key={i} className={`rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center justify-between gap-1 ${m.live ? "bg-[#16A34A]/15" : "bg-surface"}`}>
                <span className={`truncate ${m.winner === 0 ? "" : m.winner === 1 ? "opacity-40 line-through" : ""}`}>{m.a}</span>
                <span className="tabular shrink-0">
                  {m.score[0]}–{m.score[1]}
                </span>
                <span className={`truncate text-right ${m.winner === 1 ? "" : m.winner === 0 ? "opacity-40 line-through" : ""}`}>{m.b}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Penalties: a 1 v 1 duel or a World Cup-style knockout of shootouts.
function Penalties() {
  const { user, token, ready } = useSession();
  const rules = useRules();
  const [state, setState] = usePersonal("penalties");
  const [mode, setMode] = useState("cup");
  const [stake, setStake] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(null);
  const [mySpot, setMySpot] = useState({});
  const told = useRef({});
  const status = state?.status || "idle";
  const table = state?.table;
  const match = state?.match;
  const seconds = useCountdown(match?.phase === "aim" ? match.endsAt : table?.endsAt);
  useCountdownTicks((match?.phase === "aim" && !match.picked) || status === "choice" ? seconds : 0);

  const last = match?.history?.[match.history.length - 1];
  const kickKey = `${match?.id}:${match?.history?.length || 0}`;

  // Sounds and confetti, once per moment.
  useEffect(() => {
    const once = (key, fn) => {
      if (told.current[key]) return;
      told.current[key] = true;
      fn();
    };
    if (match?.phase === "reveal" && last) {
      once(`kick:${kickKey}`, () => {
        sfx("hit");
        const good = (last.you === "shoot" && last.goal) || (last.you === "keep" && !last.goal);
        setTimeout(() => sfx(good ? "win" : "lose"), 450);
      });
    }
    if (status === "choice") once(`choice:${table.id}:${table.round}`, () => sfx("bigWin"));
    if (status === "done" && table?.you?.payout > table.stake) {
      once(`done:${table.id}`, () => {
        sfx("bigWin");
        setBurst(table.you.payout - table.stake);
        setTimeout(() => setBurst(null), 2800);
      });
    }
  }, [match?.phase, kickKey, last, status, table]);

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

  const fee = rules?.penalties?.feeRate ?? 0.1;
  const cupSeats = rules?.penalties?.cupSeats ?? 16;
  const duelWin = stake * 2 - Math.floor(stake * fee);
  const cupWin = Array.from({ length: Math.log2(cupSeats) }).reduce((b) => b * 2 - Math.floor(b * fee), stake);
  const you = table?.you;

  return (
    <Page title="Penalties" back="/" glow={["22 163 74", "202 138 4"]} track={status === "idle" ? "lobby" : "game"}>
      {status === "idle" && (
        <div className="flex flex-col gap-4 animate-sheet-up">
          <div className="relative h-44 rounded-[28px] overflow-hidden shadow-float">
            <GameArt game="spot-kick" />
          </div>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Mode">
            {[
              ["duel", "1 v 1", "One shootout", `Win ${money(duelWin)}`, "from-[#0EA5E9] to-[#4338CA]", Swords],
              ["cup", "World Cup", `${cupSeats}-player knockout`, `Win up to ${money(cupWin)}`, "from-[#16A34A] to-[#CA8A04]", Trophy],
            ].map(([key, title, sub, win, tone, Icon]) => (
              <motion.button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                whileTap={{ scale: 0.96 }}
                animate={{ scale: mode === key ? 1.03 : 1 }}
                onClick={() => {
                  sfx("click");
                  setMode(key);
                }}
                className={`rounded-[24px] p-4 text-left text-white bg-gradient-to-br ${tone} shadow-float ${mode === key ? "ring-4 ring-[#FACC15]" : "opacity-75"}`}
              >
                <Icon size={22} />
                <div className="mt-2 text-xl font-extrabold">{title}</div>
                <div className="text-xs font-semibold opacity-85">{sub}</div>
                <div className="mt-2 text-sm font-extrabold text-[#FEF08A]">{win}</div>
              </motion.button>
            ))}
          </div>
          <div className="text-center text-sm text-muted">
            {mode === "cup" ? "Win a shootout to go through. After each round, cash out or play on for double." : "Take turns to shoot and keep. 3 kicks each, then sudden death."}
          </div>
          {rules && <StakeChips chips={rules.stakeChips} value={stake} onChange={setStake} disabled={busy} />}
          <WinUpTo
            amount={mode === "cup" ? cupWin : duelWin}
            label={mode === "cup" ? "Win up to" : "Win"}
            note={mode === "cup" ? "Lift the cup, or cash out after any round" : "Win the shootout · 10% fee from the loser's stake"}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => {
              sfx("join");
              act("/games/penalties/join", { mode, stake });
            }}
            className="relative overflow-hidden qw-shine h-16 rounded-full bg-gradient-to-r from-[#16A34A] to-[#0EA5E9] text-white text-xl font-extrabold shadow-float disabled:opacity-50"
          >
            {mode === "cup" ? "Enter the cup" : "Find a rival"} · {money(stake)}
          </motion.button>
        </div>
      )}

      {status === "waiting" && table && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{table.mode === "cup" ? "World Cup" : "1 v 1"} · pot</div>
            <div className="text-4xl font-extrabold">
              <Counter value={table.pot} />
            </div>
            <div className="text-sm font-bold text-muted">
              {table.seated}/{table.seatsTotal} players · kick-off when full
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5 w-full">
            {Array.from({ length: table.seatsTotal }, (_, i) => {
              const p = table.players[i];
              return p ? (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`aspect-square rounded-full bg-gradient-to-br from-[#16A34A] to-[#0EA5E9] text-white text-xs font-extrabold inline-flex items-center justify-center ${p.you ? "ring-[3px] ring-[#FACC15]" : ""}`}>
                  {p.name[0]}
                </motion.span>
              ) : (
                <span key={i} className="aspect-square rounded-full border-2 border-dashed border-line" />
              );
            })}
          </div>
          <button type="button" disabled={busy} onClick={() => act("/games/penalties/leave")} className="h-11 px-6 rounded-full border border-line font-bold">
            Leave and refund
          </button>
        </div>
      )}

      {(status === "playing" || status === "watching") && match && table && (
        <div className="flex flex-col gap-3">
          {/* Scoreboard */}
          <div className="rounded-[24px] p-3 text-white shadow-float bg-gradient-to-r from-[#14532D] via-[#16A34A] to-[#14532D]">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-85">
              <span>{table.roundName}</span>
              <span>{match.suddenDeath ? "Sudden death" : `Kick ${Math.min(match.kick + 1, match.kicksEach * 2)} of ${match.kicksEach * 2}`}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-col items-start gap-1">
                <span className="font-extrabold">You</span>
                <Kicks history={match.history} mine kicksEach={match.kicksEach} />
              </div>
              <div className="text-4xl font-black tabular">
                {match.score[0]} – {match.score[1]}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-extrabold truncate max-w-[110px]">{match.opponent.name}</span>
                <Kicks history={match.history} mine={false} kicksEach={match.kicksEach} />
              </div>
            </div>
          </div>

          {match.won == null && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${match.kick}-${match.phase}`}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`h-11 rounded-2xl px-4 flex items-center justify-between font-extrabold ${
                  match.phase === "reveal"
                    ? (last?.you === "shoot") === Boolean(last?.goal)
                      ? "bg-[#22C55E] text-white"
                      : "bg-[#DC2626] text-white"
                    : match.role === "shoot"
                      ? "bg-[#FACC15] text-black"
                      : "bg-[#DC2626] text-white"
                }`}
              >
                <span>
                  {match.phase === "reveal"
                    ? last?.goal
                      ? last.you === "shoot"
                        ? "You scored!"
                        : `${match.opponent.name} scored`
                      : last?.you === "keep"
                        ? "What a save!"
                        : "Saved!"
                    : match.role === "shoot"
                      ? match.picked
                        ? "Locked in. Here we go…"
                        : "You shoot: pick a side"
                      : match.picked
                        ? "Locked in. Dive!"
                        : "You keep: pick a dive"}
                </span>
                {match.phase === "aim" && (
                  <span key={seconds} className="tabular qw-count inline-block">
                    {seconds}s
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <div className="rounded-[24px] overflow-hidden shadow-float">
            <Goal
              kickKey={kickKey}
              role={match.role}
              picked={mySpot[kickKey] ?? null}
              disabled={busy || match.picked || match.phase !== "aim" || match.won != null}
              reveal={match.phase === "reveal" || match.won != null ? last : null}
              onPick={(i) => {
                sfx("chip");
                setMySpot({ [kickKey]: i });
                act("/games/penalties/kick", { spot: i });
              }}
            />
          </div>
          {match.phase === "aim" && match.won == null && (
            <div className="text-center text-xs text-muted">
              {match.role === "shoot" ? "Shoot left, centre or right. If the keeper dives that way, it's saved." : "Pick which way to dive. Guess their side to save it."}
              {match.opponentPicked && !match.picked && <span className="font-bold text-fg"> {match.opponent.name} is ready!</span>}
            </div>
          )}

          {match.won != null && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className={`rounded-3xl p-4 text-center ${match.won ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white qw-shake"}`}
            >
              <div className="text-2xl font-extrabold">{match.won ? "You're through!" : "Knocked out"}</div>
              <div className="text-sm opacity-80">{match.won ? `Bank ${money(you.bank)} · waiting for the other matches` : `${match.opponent.name} goes through`}</div>
            </motion.div>
          )}
          {table.mode === "cup" && <Bracket bracket={table.bracket} />}
          {status === "watching" && (
            <button type="button" onClick={() => act("/games/penalties/dismiss")} className="self-center h-10 px-5 rounded-full border border-line text-sm font-bold">
              Leave the cup
            </button>
          )}
        </div>
      )}

      {status === "watching" && !match && table && (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl p-4 text-center bg-surface">
            <div className="text-xl font-extrabold">{you.state === "cashed" ? `Cashed out ${money(you.payout)}` : "Knocked out"}</div>
            <div className="text-sm text-muted">{table.stillIn} still in the cup · {table.roundName}</div>
          </div>
          <Bracket bracket={table.bracket} />
          <button type="button" onClick={() => act("/games/penalties/dismiss")} className="self-center h-10 px-5 rounded-full border border-line text-sm font-bold">
            Leave the cup
          </button>
        </div>
      )}

      {status === "choice" && table && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col gap-4">
          <div className="rounded-[28px] p-5 text-center text-white bg-gradient-to-br from-[#16A34A] to-[#CA8A04] shadow-float">
            <div className="text-xs font-bold uppercase tracking-wider opacity-85">You won the {table.bracket[table.bracket.length - 1]?.name}</div>
            <div className="mt-1 text-sm font-bold">Your bank</div>
            <div className="text-5xl font-black">
              <Counter value={you.bank} />
            </div>
            <div className="mt-1 text-sm font-bold opacity-90">{table.stillIn} players left · decide in {seconds}s</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={busy || Boolean(you.choice)}
              onClick={() => {
                sfx("win");
                act("/games/penalties/choose", { choice: "cashout" });
              }}
              className="h-28 rounded-[24px] bg-primary text-on-primary flex flex-col items-center justify-center gap-1 shadow-float disabled:opacity-50"
            >
              <Wallet size={22} />
              <span className="text-lg font-extrabold">Cash out</span>
              <span className="text-sm font-bold tabular">{money(you.bank)}</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={busy || Boolean(you.choice)}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              onClick={() => {
                sfx("join");
                act("/games/penalties/choose", { choice: "continue" });
              }}
              className="relative overflow-hidden qw-shine h-28 rounded-[24px] bg-gradient-to-br from-[#FACC15] to-[#F97316] text-black flex flex-col items-center justify-center gap-1 shadow-float disabled:opacity-50"
            >
              <Trophy size={22} />
              <span className="text-lg font-extrabold">Play on</span>
              <span className="text-sm font-bold tabular">Win {money(you.nextBank)}</span>
            </motion.button>
          </div>
          <div className="text-center text-xs text-muted">
            {you.choice === "continue" ? "You're playing on. Waiting for the others…" : "No answer means cash out. Lose the next shootout and the bank is gone."}
          </div>
          <Bracket bracket={table.bracket} />
        </motion.div>
      )}

      {status === "done" && table && (
        <div className="flex flex-col gap-4">
          <div className={`rounded-3xl p-5 text-center animate-pop ${you.payout > 0 ? "bg-primary text-on-primary" : "bg-[#DC2626] text-white"}`} aria-live="polite">
            <div className="text-4xl font-extrabold tracking-tight inline-flex items-center gap-2">
              {you.state === "champion" ? <Trophy /> : null}
              {you.payout > 0 ? `+${money(you.payout - table.stake)}` : "Knocked out"}
            </div>
            <div className="mt-1 text-sm opacity-80">
              {you.state === "champion" ? (table.mode === "cup" ? "Champions! " : "You won the shootout. ") : you.state === "cashed" ? "Cashed out. " : ""}
              Paid {money(you.payout)} · {table.result?.champion ? `${table.result.champion} won it` : "everyone cashed out"}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                await act("/games/penalties/dismiss");
                await act("/games/penalties/join", { mode: table.mode, stake: table.stake });
              }}
              className="mt-4 h-12 px-6 rounded-full bg-white text-black font-extrabold"
            >
              Play again · {money(table.stake)}
            </button>
          </div>
          {table.mode === "cup" && <Bracket bracket={table.bracket} />}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger text-center">
          {error}
        </p>
      )}
      {burst && <WinBurst amount={burst} label={table?.mode === "cup" ? "Champions!" : "You win!"} />}
      <span className="sr-only">{SPOT_NAMES.join(", ")}</span>
    </Page>
  );
}

export default Penalties;
