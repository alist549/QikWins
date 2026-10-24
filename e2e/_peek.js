// node peek.js /play/hop-off out-prefix waitMs count gapMs
const { chromium } = require("playwright");
(async () => {
  const [path, out, wait = 1500, count = 1, gap = 1500] = process.argv.slice(2);
  const r = await fetch("http://localhost:3000/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Tendai", phone: "+1555" + Math.floor(Math.random() * 1e7), over18: true }) }).then((x) => x.json());
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  p.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  await p.goto("http://localhost:5173/");
  await p.evaluate((t) => localStorage.setItem("qikwins.token", t), r.token);
  await p.goto("http://localhost:5173" + path);
  await p.waitForTimeout(Number(wait));
  for (let i = 0; i < Number(count); i++) {
    await p.screenshot({ path: `${out}-${i}.png` });
    await p.waitForTimeout(Number(gap));
  }
  await b.close();
})();
