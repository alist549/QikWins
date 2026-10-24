import { NavLink } from "react-router-dom";
import { Gamepad2, House, ShieldCheck, UserRound } from "lucide-react";

// App-style tab bar on every main screen.
const TABS = [
  { to: "/", label: "Lobby", Icon: House, end: true },
  { to: "/play/mega-jackpot", label: "Jackpot", Icon: Gamepad2 },
  { to: "/fair", label: "Results", Icon: ShieldCheck },
  { to: "/play-safe", label: "Account", Icon: UserRound },
];

function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-30 bg-bg/95 border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? "text-brand" : "text-muted"}`}>
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
