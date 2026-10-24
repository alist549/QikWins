import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import Button from "../components/Button";
import { api } from "../lib/api";
import { useSession } from "../contexts/SessionContext";
import { useRules } from "../lib/useRules";
import { money } from "../lib/money";

const input = "w-full h-[52px] px-4 rounded-2xl bg-surface text-[16px] outline-none focus:ring-2 focus:ring-brand";

// The latest date of birth that is 18 today, for the date picker.
const adultBy = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
};

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

// Create an account (first name, surname, date of birth, phone, email) or
// sign in with a phone number. Either way the phone gets a 6-digit SMS code,
// and the account is only created once the code is entered.
function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useSession();
  const rules = useRules();
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({ firstName: "", surname: "", dob: "", phone: "", email: "" });
  const [sent, setSent] = useState(null); // { requestId, phone, devCode }
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const run = async (fn) => {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const data =
        mode === "signup"
          ? await api("/auth/signup/start", { method: "POST", body: form })
          : await api("/auth/login/start", { method: "POST", body: { phone: form.phone } });
      setSent(data);
      setCode("");
      setWait(30);
    });

  const verify = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await api("/auth/verify", { method: "POST", body: { requestId: sent.requestId, code } });
      signIn(data.token, data.user);
      navigate("/", { replace: true });
    });
  };

  const switchTo = (next) => {
    setMode(next);
    setSent(null);
    setError("");
  };

  const alert = error && (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  );

  if (sent) {
    return (
      <Page title="Check your phone" back="/" layout="narrow">
        <form onSubmit={verify} className="pt-2 flex flex-col gap-4 animate-sheet-up">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Enter the code we texted you</h2>
            <p className="mt-1 text-muted">
              We sent a 6-digit code to <span className="font-semibold text-fg">{sent.phone}</span>. It lasts 10 minutes.
            </p>
          </div>
          {sent.devCode && (
            <div className="rounded-2xl border border-dashed border-[#F97316]/60 bg-[#F97316]/10 p-3 text-sm">
              Text messages are not switched on for this site yet, so here is your code: <span data-testid="dev-code" className="font-black tracking-[0.2em] text-[#F97316]">{sent.devCode}</span>
            </div>
          )}
          <Field label="6-digit code">
            <input
              className={`${input} text-center text-2xl font-bold tracking-[0.5em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              autoFocus
              required
            />
          </Field>
          {alert}
          <Button type="submit" variant="brand" title={mode === "signup" ? "Verify and create account" : "Verify and sign in"} loading={loading} disabled={code.length !== 6} />
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="font-semibold text-muted hover:text-fg" onClick={() => setSent(null)}>
              Change details
            </button>
            <button type="button" className="font-semibold text-brand disabled:text-muted" disabled={wait > 0 || loading} onClick={sendCode}>
              {wait > 0 ? `Send again in ${wait}s` : "Send a new code"}
            </button>
          </div>
        </form>
      </Page>
    );
  }

  const signup = mode === "signup";
  const ready = signup ? Object.values(form).every((v) => v.trim()) : form.phone.trim();
  return (
    <Page title={signup ? "Create your account" : "Sign in"} back="/" layout="narrow">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendCode();
        }}
        className="pt-2 flex flex-col gap-4 animate-sheet-up"
      >
        <div className="grid grid-cols-2 p-1 rounded-full bg-surface" role="tablist">
          {[
            ["signup", "Create account"],
            ["login", "Sign in"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => switchTo(key)}
              className={`h-11 rounded-full text-sm font-bold transition ${mode === key ? "bg-fg text-bg" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{signup ? "Join and start winning" : "Welcome back"}</h2>
          <p className="mt-1 text-muted">
            {signup
              ? `We'll text a code to your phone to confirm it's you. ${rules?.realMoney ? "" : `New accounts start with ${money(rules?.startBalance ?? 10000)} in play credits, and fill-in players take empty seats so you never wait.`}`
              : "Enter your phone number and we'll text you a sign-in code."}
          </p>
        </div>
        {signup && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input className={input} value={form.firstName} onChange={set("firstName")} autoComplete="given-name" placeholder="Tendai" required />
              </Field>
              <Field label="Surname">
                <input className={input} value={form.surname} onChange={set("surname")} autoComplete="family-name" placeholder="Moyo" required />
              </Field>
            </div>
            <Field label="Date of birth (18+ only)">
              <input className={input} value={form.dob} onChange={set("dob")} type="date" max={adultBy()} autoComplete="bday" required />
            </Field>
          </>
        )}
        <Field label="Phone number, with country code">
          <input className={input} value={form.phone} onChange={set("phone")} type="tel" autoComplete="tel" placeholder="+263 77 123 4567" required />
        </Field>
        {signup && (
          <Field label="Email">
            <input className={input} value={form.email} onChange={set("email")} type="email" autoComplete="email" placeholder="you@example.com" required />
          </Field>
        )}
        {alert}
        <Button type="submit" variant="brand" title="Text me a code" loading={loading} disabled={!ready} />
        {signup && <p className="text-xs text-muted text-center">Other players only see your first name and surname initial.</p>}
      </form>
    </Page>
  );
}

export default SignIn;
