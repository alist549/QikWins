import { Link, Navigate } from "react-router-dom";
import { ChevronRight, ShieldCheck, HeartHandshake } from "lucide-react";
import Page from "../components/Page";
import { useSession } from "../contexts/SessionContext";
import { useCountdown, useGame } from "../lib/useGame";
import { money } from "../lib/money";

const HOP_PHASE = { boarding: "Boarding now", riding: "On the road", settled: "Paying out" };
const DOG_PHASE = { open: "Open now", revealed: "Revealing" };

function GameCard({ to, name, pitch, phase, pool, people, endsAt }) {
  const seconds = useCountdown(endsAt);
  return (
    <Link to={to} className="block rounded-3xl bg-surface p-5 hover:opacity-90 transition">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold tracking-tight">{name}</div>
        <ChevronRight size={20} className="text-muted" />
      </div>
      <p className="mt-1 text-muted text-[15px]">{pitch}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-bg font-semibold whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" aria-hidden />
          {phase || "Connecting"}
          {seconds > 0 && <span className="text-muted tabular whitespace-nowrap">· {seconds}s</span>}
        </span>
        <span className="text-muted tabular">
          {money(pool ?? 0)} pool · {people ?? 0} playing
        </span>
      </div>
    </Link>
  );
}

function Lobby() {
  const { user, ready } = useSession();
  const [hop] = useGame("hop-off");
  const [dog] = useGame("underdog");
  if (ready && !user) return <Navigate to="/sign-in" replace />;

  return (
    <Page>
      <h1 className="pt-2 text-[28px] font-extrabold tracking-[-0.03em]">
        {user ? `Hi ${user.name.split(" ")[0]}, pick a game` : "Pick a game"}
      </h1>
      <p className="text-muted">Live rounds, real opponents, one shared pool.</p>
      <div className="mt-5 grid gap-3">
        <GameCard
          to="/play/hop-off"
          name="Hop Off"
          pitch="Get off before the checkpoint. Ride longer, win a bigger share."
          phase={hop && HOP_PHASE[hop.phase]}
          pool={hop?.pool}
          people={hop?.riders}
          endsAt={hop?.endsAt}
        />
        <GameCard
          to="/play/underdog"
          name="Underdog"
          pitch="The side with less money behind it wins."
          phase={dog && DOG_PHASE[dog.phase]}
          pool={dog?.pool}
          people={dog?.players}
          endsAt={dog?.endsAt}
        />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/fair" className="rounded-3xl border border-line p-4 hover:bg-surface">
          <ShieldCheck size={22} className="text-brand" />
          <div className="mt-2 font-semibold">Results log</div>
          <div className="text-sm text-muted">Every pool, fee and payout</div>
        </Link>
        <Link to="/play-safe" className="rounded-3xl border border-line p-4 hover:bg-surface">
          <HeartHandshake size={22} className="text-brand" />
          <div className="mt-2 font-semibold">Play safe</div>
          <div className="text-sm text-muted">Limits, breaks and pauses</div>
        </Link>
      </div>
    </Page>
  );
}

export default Lobby;
