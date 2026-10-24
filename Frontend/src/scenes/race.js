import { racePlan } from "../lib/races";

// A race: lanes from the start to a chequered finish (or bottom to top for
// a vertical theme). Racers idle at the start while stakes come in; when the race
// runs, they surge and stumble along a plan seeded from the round, and the
// drawn winner always crosses first. Sparks and a crown at the finish.
export async function raceScene(app, PIXI, theme, { onStart, onFinish } = {}) {
  const { Container, Graphics, Text } = PIXI;
  const n = theme.racers.length;
  const vertical = Boolean(theme.vertical);

  const root = new Container();
  const bg = new Graphics();
  const lanes = new Container();
  const finishLine = new Graphics();
  const racers = new Container();
  const sparks = new Container();
  root.addChild(bg, lanes, finishLine, racers, sparks);
  app.stage.addChild(root);

  let props = {};
  let plan = null;
  let planKey = null;
  let finished = false;
  let started = null;
  let t = 0;
  // The race runs on this screen's own clock once it starts, so a late or
  // early server update never makes the racers jump. clockOffset is the
  // server's clock minus ours, from the last update.
  let clockOffset = 0;
  let lastServerNow = null;
  let localEnd = null;
  let geo = null;
  const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() }));

  // Every racer is drawn facing right, in its team colour.
  function drawRacer(r, size) {
    const c = new Container();
    const s = size * 0.5;
    const g = new Graphics();
    const ink = 0x0a0a0a;
    if (r.shape === "marble") {
      g.circle(0, 0, s * 0.85).fill(r.color);
      g.circle(0, 0, s * 0.85).fill({ color: 0x000000, alpha: 0.25 });
      g.circle(-s * 0.1, -s * 0.1, s * 0.62).fill(r.color);
      g.ellipse(-s * 0.28, -s * 0.34, s * 0.3, s * 0.16).fill({ color: 0xffffff, alpha: 0.8 });
      g.circle(s * 0.3, s * 0.35, s * 0.1).fill({ color: 0xffffff, alpha: 0.35 });
      g.circle(0, 0, s * 0.85).stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 });
      c.spin = true;
    } else if (r.shape === "car") {
      // Top-down open-wheel car.
      for (const [x, y] of [[-0.55, -0.42], [-0.55, 0.42], [0.45, -0.38], [0.45, 0.38]]) g.roundRect(x * s - s * 0.16, y * s - s * 0.11, s * 0.32, s * 0.22, 3).fill(ink);
      g.poly([-s * 0.8, -s * 0.18, s * 0.6, -s * 0.12, s * 1.0, 0, s * 0.6, s * 0.12, -s * 0.8, s * 0.18]).fill(r.color);
      g.rect(-s * 0.95, -s * 0.45, s * 0.18, s * 0.9).fill(r.color);
      g.rect(s * 0.75, -s * 0.32, s * 0.12, s * 0.64).fill(r.color);
      g.ellipse(-s * 0.1, 0, s * 0.2, s * 0.1).fill(ink);
      g.rect(-s * 0.6, -s * 0.03, s * 1.2, s * 0.06).fill({ color: 0xffffff, alpha: 0.6 });
    } else if (r.shape === "rocket") {
      g.poly([-s * 0.7, -s * 0.3, -s * 0.95, -s * 0.6, -s * 0.4, -s * 0.25]).fill(r.color);
      g.poly([-s * 0.7, s * 0.3, -s * 0.95, s * 0.6, -s * 0.4, s * 0.25]).fill(r.color);
      g.roundRect(-s * 0.8, -s * 0.26, s * 1.3, s * 0.52, s * 0.2).fill(0xe5e7eb);
      g.poly([s * 0.45, -s * 0.26, s * 1.0, 0, s * 0.45, s * 0.26]).fill(r.color);
      g.circle(s * 0.15, 0, s * 0.13).fill(0x0ea5e9).circle(s * 0.15, 0, s * 0.13).stroke({ width: 2, color: ink });
      g.rect(-s * 0.55, -s * 0.26, s * 0.12, s * 0.52).fill(r.color);
      const flame = new Graphics().poly([-s * 0.8, -s * 0.18, -s * 1.5, 0, -s * 0.8, s * 0.18]).fill(0xf97316).poly([-s * 0.8, -s * 0.09, -s * 1.2, 0, -s * 0.8, s * 0.09]).fill(0xfde047);
      c.addChild(flame);
      c.flame = flame;
    } else if (r.shape === "drone") {
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.moveTo(0, 0).lineTo(dx * s * 0.62, dy * s * 0.5).stroke({ width: 3, color: 0x111827 });
        g.ellipse(dx * s * 0.62, dy * s * 0.5, s * 0.34, s * 0.09).fill({ color: 0xffffff, alpha: 0.55 });
      }
      g.roundRect(-s * 0.36, -s * 0.22, s * 0.72, s * 0.44, s * 0.14).fill(r.color);
      g.roundRect(-s * 0.36, -s * 0.22, s * 0.72, s * 0.44, s * 0.14).stroke({ width: 2, color: 0x111827 });
      g.circle(s * 0.22, 0, s * 0.08).fill(0x111827);
      c.bob = true;
    } else if (r.shape === "boat") {
      g.poly([-s * 0.9, -s * 0.3, s * 0.5, -s * 0.3, s * 1.0, 0, s * 0.5, s * 0.3, -s * 0.9, s * 0.3]).fill(0xf8fafc);
      g.poly([-s * 0.9, -s * 0.3, s * 0.5, -s * 0.3, s * 0.7, -s * 0.12, -s * 0.9, -s * 0.12]).fill(r.color);
      g.poly([-s * 0.9, s * 0.3, s * 0.5, s * 0.3, s * 0.7, s * 0.12, -s * 0.9, s * 0.12]).fill(r.color);
      g.roundRect(-s * 0.2, -s * 0.14, s * 0.4, s * 0.28, 4).fill({ color: 0x0f172a, alpha: 0.85 });
      const wake = new Graphics().poly([-s * 0.9, -s * 0.28, -s * 1.7, -s * 0.5, -s * 1.7, s * 0.5, -s * 0.9, s * 0.28]).fill({ color: 0xffffff, alpha: 0.35 });
      c.addChild(wake);
      c.flame = wake;
      c.bob = true;
    } else {
      // Hyperdrive pod.
      const trail = new Graphics().poly([-s * 0.6, -s * 0.12, -s * 1.8, 0, -s * 0.6, s * 0.12]).fill({ color: r.color, alpha: 0.6 });
      c.addChild(trail);
      c.flame = trail;
      g.ellipse(0, 0, s * 0.85, s * 0.3).fill(0x1e293b);
      g.ellipse(s * 0.1, 0, s * 0.75, s * 0.22).fill(r.color);
      g.ellipse(s * 0.3, -s * 0.04, s * 0.25, s * 0.1).fill({ color: 0xffffff, alpha: 0.7 });
      g.ellipse(0, 0, s * 0.85, s * 0.3).stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 });
      c.bob = true;
    }
    c.addChild(g);
    return c;
  }

  function build() {
    const W = app.screen.width;
    const H = app.screen.height;
    const across = vertical ? W : H;
    const along = vertical ? H : W;
    const lane = across / n;
    const size = Math.min(lane * 0.9, 56);
    const labelRoom = vertical ? 0 : Math.min(84, along * 0.16);
    const start = labelRoom + size * 0.7;
    const end = along - size * 1.4;
    geo = { W, H, lane, size, start, end };

    bg.clear();
    const [top, bottom] = theme.sky;
    for (let i = 0; i < 12; i++) bg.rect(0, (H / 12) * i, W, H / 12 + 1).fill({ color: i < 6 ? top : bottom, alpha: 1 });
    bg.rect(0, 0, W, H).fill({ color: bottom, alpha: 0.25 });
    for (const s of stars) bg.circle(s.x * W, s.y * H, 0.6 + s.s * 1.4).fill({ color: 0xffffff, alpha: 0.15 + s.s * 0.35 });

    lanes.removeChildren();
    theme.racers.forEach((r, i) => {
      const g = new Graphics();
      if (vertical) g.rect(i * lane + 2, 0, lane - 4, H).fill({ color: r.color, alpha: 0.14 });
      else g.rect(0, i * lane + 2, W, lane - 4).fill({ color: i % 2 ? theme.track : 0xffffff, alpha: i % 2 ? 0.55 : 0.08 });
      const label = new Text({ text: r.name.toUpperCase(), style: { fontSize: Math.max(9, Math.round(lane * 0.16)), fontWeight: "900", fill: 0xffffff, fontFamily: "Inter, system-ui, sans-serif", letterSpacing: 1 } });
      label.alpha = 0.55;
      if (vertical) {
        label.anchor.set(0.5, 1);
        label.x = i * lane + lane / 2;
        label.y = H - 4;
      } else {
        label.anchor.set(0, 0.5);
        label.x = 8;
        label.y = i * lane + lane / 2;
      }
      lanes.addChild(g, label);
    });

    // Chequered finish line.
    finishLine.clear();
    const sq = 6;
    if (vertical) {
      for (let x = 0; x < W; x += sq) for (let k = 0; k < 2; k++) finishLine.rect(x, size * 0.6 + k * sq, sq, sq).fill((x / sq + k) % 2 ? 0xffffff : 0x0a0a0a);
    } else {
      const fx = end + size * 0.2;
      for (let y = 0; y < H; y += sq) for (let k = 0; k < 2; k++) finishLine.rect(fx + k * sq, y, sq, sq).fill((y / sq + k) % 2 ? 0xffffff : 0x0a0a0a);
    }

    racers.removeChildren();
    theme.racers.forEach((r) => racers.addChild(drawRacer(r, size)));
  }

  const place = (i, p) => {
    const { lane, start, end, H } = geo;
    const c = racers.children[i];
    const d = start + (end - start) * Math.min(p, 1.04);
    if (vertical) {
      c.x = i * lane + lane / 2;
      c.y = H - d;
    } else {
      c.x = d;
      c.y = i * lane + lane / 2;
    }
  };

  function burst(i) {
    const c = racers.children[i];
    for (let k = 0; k < 50; k++) {
      const s = new Graphics().rect(-3, -1.5, 6, 3).fill([0xfacc15, 0xffffff, 0xec4899, 0x22c55e, 0x38bdf8][k % 5]);
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 6;
      s.vx = Math.cos(a) * v;
      s.vy = Math.sin(a) * v - 2;
      s.x = c.x;
      s.y = c.y;
      s.life = 1;
      sparks.addChild(s);
    }
  }

  build();
  let size = { w: app.screen.width, h: app.screen.height };

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    t += dt / 60;
    if (size.w !== app.screen.width || size.h !== app.screen.height) {
      size = { w: app.screen.width, h: app.screen.height };
      build();
    }
    const { phase, winning, roundId, endsAt, runMs, selected } = props;
    const running = phase === "spinning" && winning != null && endsAt;
    const done = phase === "result" && winning != null;
    if ((running || done) && planKey !== roundId) {
      plan = racePlan(roundId, winning, n);
      planKey = roundId;
      finished = false;
      started = null;
      const left = running ? Math.min(runMs, Math.max(0, endsAt - (Date.now() + clockOffset))) : 0;
      localEnd = performance.now() + left;
    }
    const u = localEnd == null ? 1 : Math.min(1, Math.max(0, 1 - (localEnd - performance.now()) / runMs));
    let pos;
    if (running || (done && u < 1)) {
      if (started !== roundId) {
        started = roundId;
        onStart?.();
      }
      pos = plan(u);
      if (!finished && pos[winning] >= 1) {
        finished = true;
        burst(winning);
        onFinish?.();
      }
    } else if (done) {
      pos = plan(1);
      localEnd = null;
      if (!finished) {
        finished = true;
        burst(winning);
      }
    } else {
      pos = Array(n).fill(0);
    }
    pos.forEach((p, i) => place(i, p));

    racers.children.forEach((c, i) => {
      const moving = (running || (done && u < 1)) && pos[i] < 1;
      if (c.spin) c.rotation += moving ? 0.25 * dt : 0;
      if (c.bob) c.y += Math.sin(t * (moving ? 14 : 3) + i) * (moving ? 2 : 1);
      if (c.flame) {
        c.flame.visible = moving || (!running && !done && Boolean(c.spin));
        c.flame.scale.x = 0.8 + Math.random() * 0.4;
      }
      const isWinner = done && i === winning;
      const pick = selected === i;
      c.scale.set(isWinner ? 1.25 + Math.sin(t * 6) * 0.05 : pick ? 1.1 : 1);
      c.alpha = done && !isWinner ? 0.55 : 1;
    });

    for (const s of [...sparks.children]) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 0.25 * dt;
      s.life -= 0.02 * dt;
      s.alpha = s.life;
      if (s.life <= 0) s.destroy();
    }
  });

  return {
    update(next) {
      props = next || {};
      if (props.serverNow && props.serverNow !== lastServerNow) {
        lastServerNow = props.serverNow;
        clockOffset = props.serverNow - Date.now();
      }
    },
    destroy() {},
  };
}
