import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import Logo from "./Logo";
import BottomNav from "./BottomNav";
import { useSession } from "../contexts/SessionContext";
import { money } from "../lib/money";

// Every screen: a phone-width column, the demo notice, a header with the back
// arrow (inner screens) or the logo, the balance, and the tab bar.
function Page({ title, back, children, nav = true }) {
  const navigate = useNavigate();
  const { user } = useSession();
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#F97316] text-white text-center text-[11px] font-bold tracking-wide py-1 px-4">DEMO · PRACTICE MONEY · 18+</div>
      <div className="w-full max-w-md mx-auto px-4 flex-1 flex flex-col">
        <header className="h-14 flex items-center justify-between gap-3">
          {back ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                aria-label="Back"
                onClick={() => navigate(back)}
                className="-ml-2 w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-surface"
              >
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-base font-bold truncate">{title}</h1>
            </div>
          ) : (
            <Link to="/" aria-label="QikWins home">
              <Logo size="sm" />
            </Link>
          )}
          {user ? (
            <Link to="/play-safe" className="h-9 pl-2 pr-3.5 rounded-full bg-surface inline-flex items-center gap-1.5 text-sm font-bold tabular" aria-label="Your balance">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#22C55E] to-[#0EA5E9] text-white inline-flex items-center justify-center">
                <Wallet size={13} />
              </span>
              {money(user.balance)}
            </Link>
          ) : (
            <Link to="/sign-in" className="relative overflow-hidden qw-shine h-9 px-4 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0EA5E9] text-white inline-flex items-center text-sm font-extrabold shadow-float">
              Play free
            </Link>
          )}
        </header>
        <main className="flex-1 flex flex-col pb-6">{children}</main>
      </div>
      {nav && <BottomNav />}
    </div>
  );
}

export default Page;
