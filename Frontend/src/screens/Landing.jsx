import { Check, X } from "lucide-react";
import Page from "../components/Page";
import Button from "../components/Button";
import { useSession } from "../contexts/SessionContext";

// The pitch: the house never plays. Short, upfront, one accent colour.
const COMPARE = [
  ["Who you play against", "The house", "Other players"],
  ["How the operator earns", "A hidden margin in the odds", "A fixed fee, shown upfront"],
  ["Who sets the odds", "The bookmaker", "The crowd, live"],
  ["Winning players", "Often limited", "Welcome"],
  ["Results", "Trust us", "Every round published"],
];

function Landing() {
  const { user } = useSession();
  return (
    <Page>
      <section className="pt-6 pb-8 animate-sheet-up">
        <p className="text-sm font-semibold text-brand">Wins done right!</p>
        <h1 className="mt-2 text-[40px] leading-[1.02] font-extrabold tracking-[-0.04em]">
          Beat people,
          <br />
          not the house.
        </h1>
        <p className="mt-4 text-[17px] text-muted leading-relaxed">
          Live games where everyone in the round puts into one pool and the winners share it. QikWins takes a fixed fee you see before you play, whoever wins.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Button type="link" path={user ? "/play" : "/sign-in"} title={user ? "Play now" : "Play the free demo"} />
          <Button type="link" path="/fair" variant="secondary" title="See every round's results" />
        </div>
      </section>

      <section aria-labelledby="games" className="pb-8">
        <h2 id="games" className="text-xl font-bold tracking-tight">Two games to start</h2>
        <div className="mt-3 grid gap-3">
          <div className="rounded-3xl bg-surface p-5">
            <div className="text-lg font-bold">Hop Off</div>
            <p className="mt-1 text-muted">Ride as far as you dare. A hidden checkpoint catches whoever is still aboard, and their stakes go to the riders who got off in time.</p>
          </div>
          <div className="rounded-3xl bg-surface p-5">
            <div className="text-lg font-bold">Underdog</div>
            <p className="mt-1 text-muted">Pick a side. The side with less money behind it wins and shares the other side&apos;s stakes. Outguess the crowd.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="better" className="pb-6">
        <h2 id="better" className="text-xl font-bold tracking-tight">Better than traditional betting</h2>
        <p className="mt-1 text-muted">The house never plays. You do.</p>
        <div className="mt-4 rounded-3xl border border-line overflow-hidden text-sm">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-surface font-semibold">
            <div className="p-3" />
            <div className="p-3">Traditional</div>
            <div className="p-3 text-brand">QikWins</div>
          </div>
          {COMPARE.map(([label, old, ours]) => (
            <div key={label} className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-line">
              <div className="p-3 font-medium">{label}</div>
              <div className="p-3 text-muted flex gap-1.5">
                <X size={14} className="mt-0.5 shrink-0" aria-hidden />
                {old}
              </div>
              <div className="p-3 flex gap-1.5">
                <Check size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                {ours}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted leading-relaxed">
          The fee comes out of every pool, so players as a group get back slightly less than they put in. The difference: the cost is fixed and shown upfront, not hidden in the odds.
        </p>
      </section>
    </Page>
  );
}

export default Landing;
