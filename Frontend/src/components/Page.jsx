import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, Wallet } from "lucide-react";
import Logo from "./Logo";
import BottomNav from "./BottomNav";
import GameRail from "./GameRail";
import BigWinsFeed from "./BigWinsFeed";
import JackpotCard from "./JackpotCard";
import { useSession } from "../contexts/SessionContext";
import Counter from "./Counter";
import { setSoundEnabled, useSoundEnabled, useTrack } from "../lib/sound";

const DESKTOP_LINKS = [
  ["/", "Lobby"],
  ["/play/mega-jackpot", "Jackpot"],
  ["/fair", "Results"],
  ["/why", "Why QikWins"],
  ["/play-safe", "Account"],
];

// Every screen: the demo notice, a header with the back arrow (inner screens)
// or the logo, the balance, and the tab bar. On a phone it's one column. On a
// desktop the header carries the links, and `layout` picks the body:
//   "wide": the full width (the lobby lays itself out),
//   "game": the game list on the left, the game in the middle and live wins
//           and the jackpot on the right,
//   "narrow": one centred column (forms and settings).
// `track` is the background music for the screen ("lobby" or "game").
function Page({ title, back, children, nav = true, track = "lobby", layout = "game" }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const sound = useSoundEnabled();
  useTrack(track);
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#F97316] text-white text-center text-[11px] font-bold tracking-wide py-1 px-4">DEMO · PRACTICE MONEY · 18+</div>
      <div className="w-full max-w-md lg:max-w-[1440px] mx-auto px-4 lg:px-8 flex-1 flex flex-col">
        <header className="h-14 lg:h-20 flex items-center justify-between gap-3">
          {back ? (
            <div className="flex items-center gap-2 min-w-0 lg:hidden">
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
            <Link to="/" aria-label="QikWins home" className="lg:hidden">
              <Logo size="sm" />
            </Link>
          )}
          <div className="hidden lg:flex items-center gap-8">
            <Link to="/" aria-label="QikWins home">
              <Logo size="sm" />
            </Link>
            <nav className="flex items-center gap-1">
              {DESKTOP_LINKS.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) => `h-10 px-4 rounded-full inline-flex items-center text-sm font-bold transition ${isActive ? "bg-fg text-bg" : "hover:bg-surface"}`}
                >
                  {label === "Jackpot" ? <span className="text-[#F97316]">🔥 {label}</span> : label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={sound ? "Mute sound and music" : "Turn on sound and music"}
            aria-pressed={sound}
            onClick={() => setSoundEnabled(!sound)}
            className={`w-9 h-9 rounded-full inline-flex items-center justify-center ${sound ? "bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white" : "bg-surface text-muted"}`}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          {user ? (
            <Link to="/play-safe" className="h-9 pl-2 pr-3.5 rounded-full bg-surface inline-flex items-center gap-1.5 text-sm font-bold tabular" aria-label="Your balance">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#22C55E] to-[#0EA5E9] text-white inline-flex items-center justify-center">
                <Wallet size={13} />
              </span>
              <Counter value={user.balance} />
            </Link>
          ) : (
            <Link to="/sign-in" className="relative overflow-hidden qw-shine h-9 px-4 rounded-full bg-gradient-to-r from-[#22C55E] to-[#0EA5E9] text-white inline-flex items-center text-sm font-extrabold shadow-float">
              Play free
            </Link>
          )}
          </div>
        </header>
        {layout === "game" ? (
          <div className="flex-1 lg:grid lg:grid-cols-[250px_minmax(0,1fr)_300px] lg:gap-8 lg:pt-2">
            <aside className="hidden lg:block">
              <div className="sticky top-4">
                <GameRail />
              </div>
            </aside>
            <main className="flex-1 flex flex-col pb-6 w-full lg:max-w-[720px] lg:mx-auto">
              {title && <h1 className="hidden lg:block text-4xl font-black tracking-tight mb-4">{title}</h1>}
              {children}
            </main>
            <aside className="hidden lg:flex flex-col gap-4">
              <JackpotCard />
              <BigWinsFeed />
            </aside>
          </div>
        ) : (
          <main className={`flex-1 flex flex-col pb-6 lg:pb-12 ${layout === "narrow" ? "w-full lg:max-w-2xl lg:mx-auto lg:pt-6" : ""}`}>
            {title && layout === "narrow" && <h1 className="hidden lg:block text-4xl font-black tracking-tight mb-4">{title}</h1>}
            {children}
          </main>
        )}
      </div>
      {nav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}

export default Page;
