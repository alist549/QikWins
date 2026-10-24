import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import Button from "../components/Button";
import { api } from "../lib/api";
import { useSession } from "../contexts/SessionContext";

const input = "w-full h-[52px] px-4 rounded-2xl bg-surface text-[16px] outline-none focus:ring-2 focus:ring-brand";

// Demo sign-in: name, phone with country code, and a confirmed age.
function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useSession();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [over18, setOver18] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/demo", { method: "POST", body: { name, phone, over18 } });
      signIn(data.token, data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Play the demo" back="/">
      <form onSubmit={submit} className="pt-2 flex flex-col gap-4 animate-sheet-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Get $100 of practice money</h2>
          <p className="mt-1 text-muted">No real cash in the demo. Same rules and maths as the real thing.</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Your name</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Tendai" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Phone number, with country code</span>
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+263 77 123 4567" required />
        </label>
        <label className="flex items-start gap-3 py-1 cursor-pointer">
          <input type="checkbox" checked={over18} onChange={(e) => setOver18(e.target.checked)} className="mt-1 w-5 h-5 accent-[rgb(var(--brand))]" />
          <span className="text-[15px]">I am 18 or older, or the legal age to play where I live.</span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" title="Start playing" loading={loading} disabled={!over18} />
      </form>
    </Page>
  );
}

export default SignIn;
