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

const bots = [];

async function startBots() {
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
  let n = 0;
  const shot = async (name, { wait = 700, target = page } = {}) => {
    await sleep(wait);
    n += 1;
    const file = `${String(n).padStart(2, "0")}-${name}.png`;
    await target.screenshot({ path: path.join(OUT, file) });
    console.log("saved", file);
  };
  const result = () => page.locator('[aria-live="polite"]').waitFor({ timeout: 60000 });

  // Lobby, signed out, then the demo sign-in.
  await page.goto(WEB);
  await page.getByText("All games").waitFor();
  await shot("lobby", { wait: 1500 });
  await page.getByRole("link", { name: "Play free" }).click();
  await page.getByPlaceholder("Tendai").fill("Tendai");
  await page.getByPlaceholder("+263 77 123 4567").fill("+263 77 123 4567");
  await page.getByRole("checkbox").check();
  await shot("sign-in");
  await page.getByRole("button", { name: "Start playing" }).click();
  await page.getByText("All games").waitFor();
  await waitFor(async () => (await call("/games/hop-off")).riders > 3);
  await page.locator("#games").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 260);
  await shot("lobby-games", { wait: 1200 });

  // 7x: take a seat, two players join, demo players fill the rest, roll.
  await page.goto(`${WEB}/play/seven`);
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("7x-pick-stake");
  await page.getByRole("button", { name: /Take a seat/ }).click();
  await page.getByText("Filling the table").waitFor();
  for (const token of bots.slice(0, 3)) await call("/games/seven/join", { method: "POST", token, body: { stake: 200 } });
  await shot("7x-filling-table", { wait: 900 });
  await page.getByText("your total").waitFor({ timeout: 30000 });
  await shot("7x-rolling", { wait: 1200 });
  await page.getByRole("button", { name: /Re-roll all 3/ }).click();
  await shot("7x-re-rolled", { wait: 1200 });
  await result();
  await shot("7x-result", { wait: 3000 });

  // x2: find an opponent and play rock-paper-scissors to the end.
  await page.goto(`${WEB}/play/double`);
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("x2-pick-stake");
  await page.getByRole("button", { name: /Find opponent/ }).click();
  await page.getByText("Finding an opponent").waitFor();
  await shot("x2-finding-opponent", { wait: 900 });
  await page.getByText("Pick your move").waitFor({ timeout: 30000 });
  await shot("x2-your-move");
  let throws = 0;
  while (!(await page.locator('[aria-live="polite"]').isVisible())) {
    const btn = page.getByRole("button", { name: pick(["rock", "paper", "scissors"]), exact: true });
    if (await btn.isEnabled().catch(() => false)) {
      await btn.click().catch(() => {});
      throws += 1;
      if (throws === 1) {
        await page.getByText(/THE THROW|TIE/).waitFor({ timeout: 20000 });
        await shot("x2-throw-revealed", { wait: 300 });
      }
    }
    await sleep(500);
  }
  await shot("x2-result", { wait: 3000 });

  // Hop Off: board with $2 and ride.
  await page.goto(`${WEB}/play/hop-off`);
  await waitFor(async () => {
    const s = await call("/games/hop-off");
    return s.phase === "boarding" && s.endsAt - Date.now() > 5000 && s.riders >= 6;
  });
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("hop-off-boarding");
  await page.getByRole("button", { name: /Board ·/ }).click();
  await page.getByText(/Aboard ·/).waitFor();
  await waitFor(async () => (await call("/games/hop-off")).phase !== "boarding");
  if ((await call("/games/hop-off")).phase === "riding") {
    await sleep(2600);
    await shot("hop-off-riding", { wait: 0 });
    const getOff = page.locator("button.qw-pulse");
    if (await getOff.isVisible()) await getOff.click({ force: true, timeout: 3000 }).catch(() => {});
  }
  await result();
  await shot("hop-off-result", { wait: 3000 });

  // Underdog: back side A.
  await page.goto(`${WEB}/play/underdog`);
  await waitFor(async () => {
    const s = await call("/games/underdog");
    return s.phase === "open" && s.endsAt - Date.now() > 6000 && s.players >= 6;
  });
  await page.getByText("Side A").click();
  await page.getByRole("button", { name: /Back .* with/ }).click();
  await page.getByText(/You've backed/).waitFor();
  await shot("underdog-backed");
  await result();
  await shot("underdog-result", { wait: 3000 });

  await page.goto(`${WEB}/fair`);
  await page.getByText("Best roll").first().waitFor();
  await shot("results-log");

  await page.goto(`${WEB}/play-safe`);
  await page.getByText("Take a break").waitFor();
  await shot("account-play-safe");

  // Dark mode, as on a phone set to dark.
  const dark = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await dark.goto(WEB);
  await dark.getByText("All games").waitFor();
  await shot("lobby-dark", { wait: 1500, target: dark });

  stopBots();
  await browser.close();
  console.log("Done");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
