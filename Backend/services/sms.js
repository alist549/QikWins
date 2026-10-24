// Sends the sign-up and sign-in codes by SMS. Pick a provider with
// SMS_PROVIDER; with none set, codes are written to the server log and shown
// on screen instead, so the site still works before SMS is connected.
//   SMS_PROVIDER=twilio  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//   SMS_PROVIDER=africastalking  AT_USERNAME, AT_API_KEY, AT_FROM (optional)
const providers = {
  async twilio(to, text) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: text }),
    });
    if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
  },
  async africastalking(to, text) {
    const { AT_USERNAME: username, AT_API_KEY: apiKey, AT_FROM: from } = process.env;
    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, to, message: text, ...(from ? { from } : {}) }),
    });
    if (!res.ok) throw new Error(`Africa's Talking ${res.status}: ${(await res.text()).slice(0, 200)}`);
  },
};

function createSms({ provider = process.env.SMS_PROVIDER, log = console.log } = {}) {
  const send = providers[provider];
  return {
    live: Boolean(send),
    async send(to, text) {
      if (send) return send(to, text);
      if (process.env.ENVIRONMENT !== "test") log(`SMS to ${to}: ${text}`);
    },
  };
}

module.exports = { createSms };
