// Plays the demo end to end in a phone-sized Chromium and saves screenshots
// to docs/screenshots. Needs the server (Backend, e.g. STORE=memory) and the
// website (Frontend) running:
//   API_URL=http://localhost:3000 WEB_URL=http://localhost:5173 node play.js
// A few bot players join every round so the pools look alive.
const path = require("path");
const { chromium } = require("playwright");

const API = process.env.API_URL || "http://localhost:3000";
const WEB = process.env.WEB_URL || "http://localhost:5173";
const OUT = process.env.OUT_DIR || path.join(__dirname, "..", "docs", "screenshots");
const BOTS = ["Rudo", "Wanjiru", "Chidi", "Amara", "Farai", "Kwame", "Thandi", "Tunde", "Nomsa", "Kofi"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

async function call(p, { method = "GET", body, token } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function startBots() {
  const bots = [];
  for (let i = 0; i < BOTS.length; i++) {
    const { token } = await call("/auth/demo", { method: "POST", body: { name: BOTS[i], phone: `+2637700001${String(i).padStart(2, "0")}`, over18: true } });
    bots.push(token);
  }
  let hopRound = null;
  let dogRound = null;
  let running = true;
  (async () => {
    while (running) {
      const hop = await call("/games/hop-off");
      if (hop.phase === "boarding" && hop.roundId !== hopRound) {
        hopRound = hop.roundId;
        for (const token of bots) {
          await call("/games/hop-off/join", { method: "POST", token, body: { stake: pick([25, 50, 100, 200]), presetStop: Math.random() < 0.4 ? null : 1 + Math.floor(Math.random() * 6) } });
          await sleep(300);
        }
      }
      const dog = await call("/games/underdog");
      if (dog.phase === "open" && dog.roundId !== dogRound) {
        dogRound = dog.roundId;
        for (const token of bots) {
          await call("/games/underdog/stake", { method: "POST", token, body: { side: pick(["a", "b"]), stake: pick([25, 50, 100]) } });
          await sleep(200);
        }
      }
      await sleep(500);
    }
  })();
  return () => (running = false);
}

async function waitFor(fn, timeout = 90000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await sleep(300);
  }
  throw new Error("Timed out waiting");
}

(async () => {
  const stopBots = await startBots();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light" });
  const shot = async (name, opts = {}) => {
    await sleep(700);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
    console.log("saved", name);
  };

  await page.goto(WEB);
  await page.getByText("Beat people,").waitFor();
  await shot("01-landing", { fullPage: true });

  await page.getByText("Play the free demo").click();
  await page.getByPlaceholder("Tendai").fill("Tendai");
  await page.getByPlaceholder("+263 77 123 4567").fill("+263 77 123 4567");
  await page.getByRole("checkbox").check();
  await shot("02-sign-in");
  await page.getByRole("button", { name: "Start playing" }).click();
  await page.getByText("pick a game").waitFor();
  await waitFor(async () => (await call("/games/hop-off")).riders > 3);
  await shot("03-lobby");

  // Hop Off: board with $2 and ride.
  await page.getByText("Hop Off").first().click();
  await waitFor(async () => {
    const s = await call("/games/hop-off");
    return s.phase === "boarding" && s.endsAt - Date.now() > 5000 && s.riders >= 6;
  });
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("04-hop-off-boarding");
  await page.getByRole("button", { name: /Board for/ }).click();
  await page.getByText("You're aboard").waitFor();
  await waitFor(async () => {
    const s = await call("/games/hop-off");
    return s.phase !== "boarding";
  });
  const riding = await call("/games/hop-off");
  if (riding.phase === "riding") {
    await sleep(2600);
    await shot("05-hop-off-riding");
    const getOff = page.getByRole("button", { name: /Ndiburuke!/ });
    if (await getOff.isVisible()) await getOff.click();
  }
  await page.locator('[aria-live="polite"]').waitFor({ timeout: 60000 });
  await shot("06-hop-off-result");

  // Underdog: back side A with $1.
  await page.goto(`${WEB}/play/underdog`);
  await waitFor(async () => {
    const s = await call("/games/underdog");
    return s.phase === "open" && s.endsAt - Date.now() > 6000 && s.players >= 6;
  });
  await page.getByText("Side A").click();
  await page.getByRole("button", { name: /Back .* with/ }).click();
  await page.getByText(/You've backed/).waitFor();
  await shot("07-underdog-open");
  await page.locator('[aria-live="polite"]').waitFor({ timeout: 60000 });
  await shot("08-underdog-result");

  await page.goto(`${WEB}/fair`);
  await page.getByRole("button", { name: "Verify this round" }).first().click();
  await page.getByText("Verified: seed matches").first().waitFor();
  await shot("09-results-log");

  await page.goto(`${WEB}/play-safe`);
  await page.getByText("Take a break").waitFor();
  await shot("10-play-safe");

  // Dark mode, as on a phone set to dark.
  const dark = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await dark.goto(WEB);
  await dark.getByText("Beat people,").waitFor();
  await sleep(700);
  await dark.screenshot({ path: path.join(OUT, "11-landing-dark.png") });
  console.log("saved", "11-landing-dark");

  stopBots();
  await browser.close();
  console.log("Done");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
