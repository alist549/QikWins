import { BadgeCheck, Ban, Eye, Users } from "lucide-react";
import Page from "../components/Page";
import Button from "../components/Button";
import { useSession } from "../contexts/SessionContext";

// Why pool games beat traditional betting: big icons, few words.
const POINTS = [
  { Icon: Users, title: "You play people", text: "Not the house. Winners are paid from the round's pool." },
  { Icon: Eye, title: "Fee shown upfront", text: "A fixed cut, the same whoever wins. No hidden margin." },
  { Icon: Ban, title: "Winners welcome", text: "Nobody gets limited for winning." },
  { Icon: BadgeCheck, title: "Every round published", text: "Pools, fees, payouts, and checkable results." },
];

function Why() {
  const { user } = useSession();
  return (
    <Page title="Why QikWins" back="/" layout="narrow">
      <h2 className="pt-2 text-[34px] leading-[1.02] font-extrabold tracking-[-0.04em]">
        The house never plays.
        <br />
        <span className="text-brand">You do.</span>
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {POINTS.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-3xl bg-surface p-4 animate-pop">
            <span className="w-11 h-11 rounded-2xl bg-brand text-white inline-flex items-center justify-center">
              <Icon size={22} />
            </span>
            <div className="mt-3 font-bold leading-tight">{title}</div>
            <div className="mt-1 text-sm text-muted">{text}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">The fee comes out of every pool, so players as a group get back slightly less than they put in. The cost is fixed and visible, not hidden in odds.</p>
      <Button classes="mt-6" type="link" path={user ? "/" : "/sign-in"} variant="brand" title={user ? "Back to the games" : "Create your account"} />
    </Page>
  );
}

export default Why;
