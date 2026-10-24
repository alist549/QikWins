// Desktop screenshots (1440 x 900) of the wide layout, saved to
// docs/screenshots/desktop. Needs the server and website running, like play.js:
//   API_URL=http://localhost:3000 WEB_URL=http://localhost:5173 node desktop.js
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const API = process.env.API_URL || "http://localhost:3000";
const WEB = process.env.WEB_URL || "http://localhost:5173";
const OUT = process.env.OUT_DIR || path.join(__dirname, "..", "docs", "screenshots", "desktop");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const res = await fetch(`${API}/auth/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tendai", phone: `+1555${Math.floor(Math.random() * 1e7)}`, over18: true }),
  });
  const { token } = await res.json();
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let n = 0;
  const shot = async (name, wait = 1500) => {
    await sleep(wait);
    n += 1;
    const file = `${String(n).padStart(2, "0")}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    console.log("saved", file);
  };

  await page.goto(`${WEB}/sign-in`);
  await page.getByPlaceholder("Tendai").fill("Tendai");
  await page.getByPlaceholder("Moyo").fill("Moyo");
  await page.locator('input[type="date"]').fill("1995-04-12");
  await page.getByPlaceholder("+263 77 123 4567").fill("+263 77 123 4567");
  await page.getByPlaceholder("you@example.com").fill("tendai@example.com");
  await shot("sign-up", 800);

  await page.goto(WEB);
  await page.evaluate((t) => localStorage.setItem("qikwins.token", t), token);
  await page.goto(WEB);
  await page.getByText("All games").waitFor();
  await shot("lobby", 1200);
  await page.mouse.wheel(0, 520);
  await shot("lobby-games");

  await page.goto(`${WEB}/play/mega-jackpot`);
  await page.getByRole("radio", { name: "$1.00" }).click();
  await shot("mega-jackpot");
  await page.getByRole("button", { name: /Play for the jackpot/ }).click();
  await page.getByText(/Round 1/).waitFor({ timeout: 60000 });
  await shot("mega-jackpot-round", 800);
  await page.locator("button.h-32").first().click().catch(() => {});
  await page.getByText(/· survives/).first().waitFor({ timeout: 30000 });
  await shot("mega-jackpot-reveal", 900);
  await fetch(`${API}/games/mega/dismiss`, { method: "POST", headers: { token } });

  await page.goto(`${WEB}/play/big-wheel`);
  await page.getByRole("button", { name: /Take all/ }).first().click().catch(() => {});
  await shot("big-wheel");

  for (const race of ["marble-madness", "grand-prix", "hyperdrive"]) {
    await page.goto(`${WEB}/play/${race}`);
    await shot(race, 2500);
  }

  await page.goto(`${WEB}/play/penalties`);
  await page.getByRole("radio", { name: "$1.00" }).click();
  await shot("penalties");
  await page.getByRole("button", { name: /Enter the cup/ }).click();
  await page.getByText(/You shoot|You keep/).first().waitFor({ timeout: 30000 });
  await shot("penalties-cup", 600);
  await fetch(`${API}/games/penalties/dismiss`, { method: "POST", headers: { token } });

  await page.goto(`${WEB}/play/seven`);
  await page.getByRole("radio", { name: "$1.00" }).click();
  await shot("7x");

  await page.goto(`${WEB}/fair`);
  await shot("results");

  await browser.close();
})();
