const crypto = require("crypto");

// One-time codes for proving a phone number. A code is 6 digits, kept only as
// a hash, lasts 10 minutes and allows 5 tries. Each number can ask for a new
// code every 30 seconds and at most 5 times an hour.
const TTL_MS = 10 * 60 * 1000;
const MAX_TRIES = 5;
const COOLDOWN_MS = 30 * 1000;
const PER_HOUR = 5;

const hash = (id, code) => crypto.createHash("sha256").update(`${id}:${code}`).digest("hex");

function createOtp({ now = Date.now } = {}) {
  const requests = new Map(); // id -> { phone, hash, expiresAt, tries, data }
  const sent = new Map(); // phone -> [times]

  const sweep = () => {
    for (const [id, r] of requests) if (r.expiresAt < now()) requests.delete(id);
  };

  return {
    // Returns { id, code } or { wait } (seconds until another code may be sent).
    issue(phone, data) {
      sweep();
      const recent = (sent.get(phone) || []).filter((t) => t > now() - 60 * 60 * 1000);
      const last = recent[recent.length - 1];
      if (last && last > now() - COOLDOWN_MS) return { wait: Math.ceil((last + COOLDOWN_MS - now()) / 1000) };
      if (recent.length >= PER_HOUR) return { wait: Math.ceil((recent[0] + 60 * 60 * 1000 - now()) / 1000) };
      sent.set(phone, [...recent, now()]);
      for (const [id, r] of requests) if (r.phone === phone) requests.delete(id);
      const id = crypto.randomBytes(12).toString("hex");
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
      requests.set(id, { phone, hash: hash(id, code), expiresAt: now() + TTL_MS, tries: 0, data });
      return { id, code };
    },
    // Returns { ok: true, phone, data } or { ok: false, message }.
    check(id, code) {
      const r = requests.get(String(id));
      if (!r || r.expiresAt < now()) return { ok: false, message: "That code has expired. Ask for a new one." };
      r.tries += 1;
      const given = Buffer.from(hash(id, String(code).trim()));
      if (!crypto.timingSafeEqual(given, Buffer.from(r.hash))) {
        if (r.tries >= MAX_TRIES) requests.delete(id);
        const left = MAX_TRIES - r.tries;
        return { ok: false, message: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one." };
      }
      requests.delete(id);
      return { ok: true, phone: r.phone, data: r.data };
    },
  };
}

module.exports = { createOtp };
