import { useState } from "react";
import { Navigate } from "react-router-dom";
import Page from "../components/Page";
import Button from "../components/Button";
import { useSession } from "../contexts/SessionContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api";
import { money } from "../lib/money";

// Responsible play: the balance, a demo top-up, and a pause on all play.
function PlaySafe() {
  const { user, token, setUser, signOut, ready } = useSession();
  const { theme, setTheme } = useTheme();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (ready && !user) return <Navigate to="/sign-in" replace />;
  if (!user) return null;

  const call = async (key, path, body) => {
    setBusy(key);
    setError("");
    try {
      const data = await api(path, { method: "POST", body, token });
      setUser(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const paused = user.excludedUntil && new Date(user.excludedUntil) > new Date();

  return (
    <Page title="Your account and play safe" back="/" layout="narrow">
      <div className="rounded-3xl bg-surface p-5">
        <div className="text-sm text-muted">Practice balance</div>
        <div className="text-[34px] font-extrabold tracking-tight tabular">{money(user.balance)}</div>
        <div className="text-sm text-muted">
          {user.name} · {user.phone}
        </div>
        <Button classes="mt-4" variant="secondary" title="Reset to $100" loading={busy === "reset"} fun={() => call("reset", "/me/reset-demo")} />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Take a break</h2>
        <p className="text-sm text-muted">Pause all play. You can still watch, but no stakes are accepted until the pause ends.</p>
        {paused ? (
          <p className="mt-3 font-semibold">Paused until {new Date(user.excludedUntil).toLocaleString()}.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 7, 30].map((d) => (
              <Button key={d} variant="secondary" title={`${d} day${d > 1 ? "s" : ""}`} loading={busy === `p${d}`} fun={() => call(`p${d}`, "/me/pause", { days: d })} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 text-sm text-muted leading-relaxed">
        <h2 className="text-lg font-bold text-fg">Play safe</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Only play with money you can afford to lose. Stakes are capped per round.</li>
          <li>The fee comes out of every pool, so over time players as a group lose a little.</li>
          <li>If play stops being fun, pause it above and talk to someone you trust or a local gambling support line.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Appearance</h2>
        <div className="mt-2 flex gap-2">
          {["system", "light", "dark"].map((t) => (
            <button key={t} type="button" onClick={() => setTheme(t)} className={`h-9 px-4 rounded-full text-sm font-semibold capitalize ${theme === t ? "bg-primary text-on-primary" : "bg-surface"}`}>
              {t === "system" ? "Match phone" : t === "dark" ? "night" : t}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <Button classes="mt-8" variant="danger" title="Sign out" fun={signOut} />
    </Page>
  );
}

export default PlaySafe;
