import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";
import { useSession } from "../contexts/SessionContext";
import { money } from "../lib/money";

// Every screen: a phone-width column, the demo notice, and a header with the
// back arrow (inner screens) or the logo, plus the player's balance.
function Page({ title, back, children, footer }) {
  const navigate = useNavigate();
  const { user } = useSession();
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="bg-primary text-on-primary text-center text-xs font-medium py-1.5 px-4">
        Demo mode: practice money only, no real cash. 18+.
      </div>
      <div className="w-full max-w-md mx-auto px-4 flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between gap-3">
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
              <h1 className="text-base font-semibold truncate">{title}</h1>
            </div>
          ) : (
            <Link to="/" aria-label="QikWins home">
              <Logo size="sm" />
            </Link>
          )}
          {user && (
            <Link to="/play-safe" className="h-9 px-3.5 rounded-full bg-surface inline-flex items-center text-sm font-semibold tabular" aria-label="Your balance">
              {money(user.balance)}
            </Link>
          )}
        </header>
        <main className="flex-1 flex flex-col pb-6">{children}</main>
      </div>
      {footer}
    </div>
  );
}

export default Page;
