// Plays the site end to end in a phone-sized Chromium and saves screenshots
// to docs/screenshots, plus a screen recording cut into short clips of each
// game in motion (docs/clips, needs ffmpeg). Needs the server (Backend, e.g. STORE=memory) and the
// website (Frontend) running:
//   API_URL=http://localhost:3000 WEB_URL=http://localhost:5173 node play.js
// A few bot players join every round so the pools look alive.
const path = require("path");
const { chromium } = require("playwright");

const API = process.env.API_URL || "http://localhost:3000";
const WEB = process.env.WEB_URL || "http://localhost:5173";
const OUT = process.env.OUT_DIR || path.join(__dirname, "..", "docs", "screenshots");
const CLIPS = process.env.CLIP_DIR || path.join(__dirname, "..", "docs", "clips");
const fs = require("fs");
const { execFileSync } = require("child_process");
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
    const { token } = await call("/auth/test", { method: "POST", body: { name: BOTS[i], phone: `+2637700001${String(i).padStart(2, "0")}`, over18: true } });
    bots.push(token);
  }
  let hopRound = null;
  let dogRound = null;
  let running = true;
  (async () => {
    while (running) {
      try {
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
      } catch {
        // The server can drop a keep-alive connection; try again.
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
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(CLIPS, { recursive: true });
  const rawDir = path.join(CLIPS, "raw");
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    recordVideo: { dir: rawDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const clips = [];
  let clipStart = null;
  const startClip = () => (clipStart = (Date.now() - t0) / 1000);
  const endClip = (name) => {
    clips.push({ name, from: clipStart, to: (Date.now() - t0) / 1000 });
    clipStart = null;
  };

  let n = 0;
  const shot = async (name, { wait = 700, target = page } = {}) => {
    await sleep(wait);
    n += 1;
    const file = `${String(n).padStart(2, "0")}-${name}.png`;
    await target.screenshot({ path: path.join(OUT, file) });
    console.log("saved", file);
  };
  const result = (timeout = 90000) => page.locator('[aria-live="polite"]').first().waitFor({ timeout });

  // Lobby, signed out, then sign-up: details, then the SMS code.
  await page.goto(WEB);
  startClip();
  await page.getByText("All games").waitFor();
  await shot("lobby", { wait: 1800 });
  await page.getByRole("link", { name: "Join now" }).click();
  await page.getByPlaceholder("Tendai").fill("Tendai");
  await page.getByPlaceholder("Moyo").fill("Moyo");
  await page.locator('input[type="date"]').fill("1995-04-12");
  await page.getByPlaceholder("+263 77 123 4567").fill(`+263 77 ${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  await page.getByPlaceholder("you@example.com").fill(`tendai${Date.now()}@example.com`);
  await shot("sign-up");
  await page.getByRole("button", { name: "Text me a code" }).click();
  const devCode = page.getByTestId("dev-code");
  await devCode.waitFor();
  await page.getByPlaceholder("••••••").fill(await devCode.innerText());
  await shot("sign-up-code");
  await page.getByRole("button", { name: "Verify and create account" }).click();
  await page.getByText("All games").waitFor();
  await waitFor(async () => (await call("/games/hop-off")).riders > 3);
  await page.locator("#games").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 260);
  await sleep(1500);
  endClip("lobby");
  await shot("lobby-games", { wait: 200 });

  // Mega Jackpot: $1 into a 2,500-player knockout, play until out or done.
  await page.goto(`${WEB}/play/mega-jackpot`);
  await page.getByRole("radio", { name: "$1.00" }).click();
  await shot("mega-jackpot-join");
  startClip();
  await page.getByRole("button", { name: /Play for the jackpot/ }).click();
  await page.getByText(/starts when full/).waitFor();
  await shot("mega-jackpot-filling", { wait: 3500 });
  await page.getByText(/Round 1/).waitFor({ timeout: 60000 });
  await shot("mega-jackpot-question", { wait: 600 });
  let megaReveal = false;
  const megaEnd = Date.now() + 240000;
  while (Date.now() < megaEnd) {
    if (await page.locator('[aria-live="polite"]').isVisible()) break;
    if (await page.getByText("Leave and start a new one").isVisible().catch(() => false)) break;
    const sides = page.locator("button.h-32:not([disabled])");
    if ((await sides.count()) === 2) await sides.nth(Math.random() < 0.5 ? 0 : 1).click().catch(() => {});
    if (!megaReveal && (await page.getByText(/· survives/).first().isVisible().catch(() => false))) {
      megaReveal = true;
      await shot("mega-jackpot-reveal", { wait: 900 });
    }
    await sleep(400);
  }
  await shot("mega-jackpot-result", { wait: 1500 });
  endClip("mega-jackpot");
  await page.getByRole("button", { name: /Leave and start a new one/ }).click().catch(() => {});

  // Big Wheel: back a segment, watch it spin.
  await page.goto(`${WEB}/play/big-wheel`);
  await waitFor(async () => {
    const s = await call("/games/big-wheel");
    return s.phase === "open" && s.endsAt - Date.now() > 7000;
  });
  startClip();
  await sleep(2500);
  const wheel = await call("/games/big-wheel");
  const empty = wheel.pays.findIndex((x) => x == null);
  await page.getByRole("button", { name: /^(Cherry|Diamond|Star|Fire|Clover|Crown|Bolt|Target|Moon|Dice|Rocket|Rainbow)/ }).nth(empty >= 0 ? empty : 3).click();
  await page.getByRole("radio", { name: "$2.00" }).click();
  await page.getByRole("button", { name: /^Stake / }).click();
  await shot("big-wheel-staked", { wait: 1200 });
  await waitFor(async () => (await call("/games/big-wheel")).phase === "spinning", 30000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await shot("big-wheel-spinning", { wait: 1800 });
  await waitFor(async () => (await call("/games/big-wheel")).phase === "result", 30000);
  await shot("big-wheel-result", { wait: 2500 });
  endClip("big-wheel");

  // Last Standing: join the knockout and play it out.
  await page.goto(`${WEB}/play/last-standing`);
  await page.getByRole("radio", { name: "$1.00" }).click();
  await shot("last-standing-join");
  startClip();
  await page.getByRole("button", { name: /Join the knockout/ }).click();
  await page.getByText(/starts when full/).waitFor();
  await shot("last-standing-filling", { wait: 1500 });
  await page.getByText(/Round 1/).waitFor({ timeout: 30000 });
  await shot("last-standing-question", { wait: 600 });
  let shotReveal = false;
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    if (await page.locator('[aria-live="polite"]').isVisible()) break;
    const sides = page.locator("button.h-32:not([disabled])");
    if ((await sides.count()) === 2) {
      await sides.nth(Math.random() < 0.5 ? 0 : 1).click().catch(() => {});
    }
    if (!shotReveal && (await page.getByText(/survives|Knocked out!/).first().isVisible().catch(() => false))) {
      shotReveal = true;
      await shot("last-standing-reveal", { wait: 900 });
    }
    await sleep(400);
  }
  await result(30000);
  await shot("last-standing-result", { wait: 2500 });
  endClip("last-standing");

  // Penalties: enter the World Cup, shoot and keep, then play on or cash out.
  // A loss before the first cash-out choice re-enters, so the run shows it.
  const SPOTS = ["Left", "Centre", "Right"];
  await page.goto(`${WEB}/play/penalties`);
  await page.getByRole("radio", { name: "$1.00" }).click();
  await shot("penalties-pick-mode");
  startClip();
  let choices = 0;
  let shotKick = false;
  for (let attempt = 0; attempt < 4 && choices === 0; attempt += 1) {
    await page.getByRole("button", { name: /Enter the cup/ }).click();
    await page.getByText(/kick-off when full/).waitFor();
    if (attempt === 0) await shot("penalties-filling-cup", { wait: 1200 });
    await page.getByText(/You shoot|You keep/).first().waitFor({ timeout: 30000 });
    if (attempt === 0) await shot("penalties-your-kick", { wait: 400 });
    const stop = Date.now() + 240000;
    while (Date.now() < stop) {
      const body = await page.textContent("body");
      if (/decide in/.test(body)) {
        choices += 1;
        await shot(`penalties-cash-out-or-play-on`, { wait: 600 });
        const cash = choices >= 2;
        await page.getByRole("button", { name: cash ? /Cash out/ : /Play on/ }).click({ force: true }).catch(() => {});
        if (cash) break;
        await page.getByText(/decide in/).waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
        continue;
      }
      if (/Leave the cup|Play again/.test(body) && !/You shoot|You keep/.test(body)) break;
      const spot = page.getByRole("button", { name: pick(SPOTS), exact: true });
      if ((await spot.count()) && (await spot.isEnabled().catch(() => false))) {
        await spot.click({ force: true }).catch(() => {});
        if (!shotKick) {
          await page.getByText(/GOAL!|SAVED!/).waitFor({ timeout: 15000 }).catch(() => {});
          shotKick = true;
          await shot("penalties-goal-or-save", { wait: 900 });
        }
      }
      await sleep(400);
    }
    if (choices === 0) {
      await call("/games/penalties/dismiss", { method: "POST", token: await page.evaluate(() => localStorage.getItem("qikwins.token")) });
      await page.goto(`${WEB}/play/penalties`);
      await page.getByRole("radio", { name: "$1.00" }).click();
    }
  }
  await page.getByText(/Cashed out|Knocked out|Play again/).first().waitFor({ timeout: 30000 });
  await shot("penalties-result", { wait: 1500 });
  endClip("penalties");
  await page.getByRole("button", { name: /Leave the cup/ }).click().catch(() => {});

  // 7x: take a seat, players join, practice players fill the rest, roll.
  await page.goto(`${WEB}/play/seven`);
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("7x-pick-stake");
  startClip();
  await page.getByRole("button", { name: /Take a seat/ }).click();
  await page.getByText("Filling the table").waitFor();
  for (const token of bots.slice(0, 3)) await call("/games/seven/join", { method: "POST", token, body: { stake: 200 } });
  await shot("7x-filling-table", { wait: 900 });
  await page.getByText("your total").waitFor({ timeout: 30000 });
  await shot("7x-rolling", { wait: 1200 });
  await page.getByRole("button", { name: /Re-roll all 3/ }).click();
  await shot("7x-re-rolled", { wait: 1500 });
  await result();
  await shot("7x-result", { wait: 3000 });
  endClip("7x");

  // x2: find an opponent and play rock-paper-scissors to the end.
  await page.goto(`${WEB}/play/double`);
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("x2-pick-stake");
  startClip();
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
        await shot("x2-throw-revealed", { wait: 600 });
      }
    }
    await sleep(500);
  }
  await shot("x2-result", { wait: 3000 });
  endClip("x2");

  // Hop Off: fly the world tour and hop off.
  await page.goto(`${WEB}/play/hop-off`);
  await waitFor(async () => {
    const s = await call("/games/hop-off");
    return s.phase === "boarding" && s.endsAt - Date.now() > 5000 && s.riders >= 6;
  });
  await page.getByRole("radio", { name: "$2.00" }).click();
  await shot("hop-off-boarding");
  startClip();
  await page.getByRole("button", { name: /Fly ·/ }).click();
  await page.getByText(/Aboard ·/).waitFor();
  await waitFor(async () => (await call("/games/hop-off")).phase !== "boarding");
  if ((await call("/games/hop-off")).phase === "riding") {
    await sleep(2800);
    await shot("hop-off-flying", { wait: 0 });
    const getOff = page.locator("button.qw-pulse");
    if (await getOff.isVisible()) await getOff.click({ force: true, timeout: 3000 }).catch(() => {});
  }
  await result();
  await shot("hop-off-result", { wait: 2500 });
  endClip("hop-off");

  // Underdog: back side A.
  await page.goto(`${WEB}/play/underdog`);
  await waitFor(async () => {
    const s = await call("/games/underdog");
    return s.phase === "open" && s.endsAt - Date.now() > 6000 && s.players >= 6;
  });
  startClip();
  await page.getByText("Side A").click();
  await page.getByRole("button", { name: /Back .* with/ }).click();
  await page.getByText(/You've backed/).waitFor();
  await shot("underdog-backed");
  await result();
  await shot("underdog-result", { wait: 3000 });
  endClip("underdog");

  await page.goto(`${WEB}/fair`);
  await page.getByText(/won · /).first().waitFor();
  await shot("results-log");

  await page.goto(`${WEB}/play-safe`);
  await page.getByText("Take a break").waitFor();
  await shot("account-play-safe");

  // Dark mode, as on a phone set to dark.
  const dark = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await dark.goto(WEB);
  await dark.getByText("All games").waitFor();
  await shot("lobby-dark", { wait: 1800, target: dark });

  stopBots();
  const video = page.video();
  await context.close();
  const raw = await video.path();
  // Cut the recording into one short MP4 per game.
  for (const c of clips) {
    const out = path.join(CLIPS, `${c.name}.mp4`);
    const length = Math.min(c.to - c.from, 40);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", c.from.toFixed(2), "-i", raw, "-t", length.toFixed(2), "-vf", "scale=390:-2,fps=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "veryfast", "-movflags", "+faststart", "-an", out]);
    console.log("clip", out, `${length.toFixed(1)}s`);
  }
  fs.rmSync(rawDir, { recursive: true, force: true });
  await browser.close();
  console.log("Done");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
