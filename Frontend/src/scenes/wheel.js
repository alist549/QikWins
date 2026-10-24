// Big Wheel: a lit-up prize wheel. It idles slowly while stakes come in,
// then spins hard and eases out onto the drawn segment, ticking past the
// pointer, with a burst of sparks when it lands.

export const SEGMENTS = [
  { icon: "🍒", name: "Cherry", color: 0xef4444 },
  { icon: "💎", name: "Diamond", color: 0x06b6d4 },
  { icon: "⭐", name: "Star", color: 0xf59e0b },
  { icon: "🔥", name: "Fire", color: 0xf97316 },
  { icon: "🍀", name: "Clover", color: 0x22c55e },
  { icon: "👑", name: "Crown", color: 0xeab308 },
  { icon: "⚡", name: "Bolt", color: 0x8b5cf6 },
  { icon: "🎯", name: "Target", color: 0xdc2626 },
  { icon: "🌙", name: "Moon", color: 0x6366f1 },
  { icon: "🎲", name: "Dice", color: 0x0ea5e9 },
  { icon: "🚀", name: "Rocket", color: 0xec4899 },
  { icon: "🌈", name: "Rainbow", color: 0x14b8a6 },
];

export const cssColor = (n) => `#${n.toString(16).padStart(6, "0")}`;

export async function wheelScene(app, PIXI, { onTick } = {}) {
  const { Container, Graphics, Text } = PIXI;
  const n = SEGMENTS.length;
  const slice = (Math.PI * 2) / n;

  const root = new Container();
  const glow = new Graphics();
  const wheel = new Container();
  const rim = new Graphics();
  const bulbs = new Container();
  const pointer = new Graphics();
  const sparks = new Container();
  root.addChild(glow, wheel, rim, bulbs, pointer, sparks);
  app.stage.addChild(root);

  let R = 0;
  let angle = 0; // wheel rotation (radians)
  let mode = "idle"; // idle | spinning | landed
  let spin = null; // { from, to, start, duration }
  let lastTickIndex = 0;
  let t = 0;
  let highlight = null;

  function build() {
    const size = Math.min(app.screen.width, app.screen.height);
    R = size * 0.42;
    root.x = app.screen.width / 2;
    root.y = app.screen.height / 2 + size * 0.03;
    wheel.removeChildren();
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 - slice / 2 + i * slice;
      const seg = new Graphics();
      seg.moveTo(0, 0).arc(0, 0, R, a0, a0 + slice).lineTo(0, 0).fill(SEGMENTS[i].color);
      seg.moveTo(0, 0).arc(0, 0, R, a0, a0 + slice).lineTo(0, 0).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
      // A lighter inner band for depth.
      seg.moveTo(0, 0).arc(0, 0, R * 0.55, a0, a0 + slice).lineTo(0, 0).fill({ color: 0xffffff, alpha: 0.12 });
      wheel.addChild(seg);
      const label = new Text({ text: SEGMENTS[i].icon, style: { fontSize: Math.round(R * 0.2), fontFamily: "Noto Color Emoji, Apple Color Emoji, Segoe UI Emoji, sans-serif" } });
      label.anchor.set(0.5);
      const mid = a0 + slice / 2;
      label.x = Math.cos(mid) * R * 0.74;
      label.y = Math.sin(mid) * R * 0.74;
      label.rotation = mid + Math.PI / 2;
      wheel.addChild(label);
    }
    const hub = new Graphics().circle(0, 0, R * 0.16).fill(0x0a0a0a).circle(0, 0, R * 0.16).stroke({ width: 4, color: 0xfacc15 });
    const hubText = new Text({ text: "SPIN", style: { fontSize: Math.round(R * 0.08), fontWeight: "900", fill: 0xfacc15, fontFamily: "Inter, system-ui, sans-serif" } });
    hubText.anchor.set(0.5);
    wheel.addChild(hub, hubText);

    rim.clear().circle(0, 0, R + 10).stroke({ width: 14, color: 0x1f1147 }).circle(0, 0, R + 10).stroke({ width: 2, color: 0xfacc15, alpha: 0.9 });
    bulbs.removeChildren();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const b = new Graphics().circle(0, 0, 3.6).fill(0xffffff);
      b.x = Math.cos(a) * (R + 10);
      b.y = Math.sin(a) * (R + 10);
      bulbs.addChild(b);
    }
    pointer.clear().poly([-14, -R - 22, 14, -R - 22, 0, -R + 8]).fill(0xfacc15).poly([-14, -R - 22, 14, -R - 22, 0, -R + 8]).stroke({ width: 3, color: 0x0a0a0a });
  }

  // The segment under the pointer for a given wheel angle.
  const indexAt = (a) => {
    const norm = ((-a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(norm / slice) % n;
  };

  function burst() {
    for (let i = 0; i < 60; i++) {
      const s = new Graphics().rect(-3, -1.5, 6, 3).fill([0xfacc15, 0xffffff, 0xec4899, 0x22c55e, 0x38bdf8][i % 5]);
      const a = Math.random() * Math.PI * 2;
      const v = 3 + Math.random() * 6;
      s.vx = Math.cos(a) * v;
      s.vy = Math.sin(a) * v - 2;
      s.y = -R * 0.9;
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
    if (mode === "idle") angle += 0.004 * dt;
    if (mode === "spinning" && spin) {
      const p = Math.min(1, (performance.now() - spin.start) / spin.duration);
      const eased = 1 - Math.pow(1 - p, 4);
      angle = spin.from + (spin.to - spin.from) * eased;
      if (p >= 1) {
        mode = "landed";
        burst();
      }
    }
    wheel.rotation = angle;
    const idx = indexAt(angle);
    if (idx !== lastTickIndex) {
      lastTickIndex = idx;
      if (mode === "spinning") {
        onTick?.();
        pointer.rotation = -0.18;
      }
    }
    pointer.rotation *= 0.8;

    // Chasing lights; all flash together once it lands.
    bulbs.children.forEach((b, i) => {
      const on = mode === "landed" ? Math.floor(t * 6) % 2 === 0 : (Math.floor(t * (mode === "spinning" ? 14 : 4)) + i) % 3 === 0;
      b.tint = on ? 0xfde047 : 0x9ca3af;
      b.alpha = on ? 1 : 0.6;
    });
    glow.clear();
    const pulse = mode === "landed" ? 0.35 + Math.sin(t * 8) * 0.15 : 0.18;
    glow.circle(0, 0, R + 30).fill({ color: highlight != null ? SEGMENTS[highlight].color : 0xfacc15, alpha: pulse });

    for (const s of [...sparks.children]) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 0.2 * dt;
      s.rotation += 0.2 * dt;
      s.life -= 0.012 * dt;
      s.alpha = Math.max(0, s.life);
      if (s.life <= 0) s.destroy();
    }
  });

  return {
    update(next) {
      highlight = next.winning ?? next.selected ?? null;
      if (next.phase === "open") {
        if (mode !== "idle") {
          mode = "idle";
          spin = null;
        }
      } else if (next.phase === "spinning" && next.winning != null && mode === "idle") {
        // Land the winning segment under the pointer after several turns.
        const target = -next.winning * slice;
        const turns = Math.PI * 2 * 6;
        let to = target - turns;
        while (to > angle - turns) to -= Math.PI * 2;
        mode = "spinning";
        spin = { from: angle, to, start: performance.now(), duration: Math.max(1500, (next.spinMs || 5500) - 400) };
      } else if (next.phase === "result" && mode !== "landed") {
        angle = -next.winning * slice;
        mode = "landed";
      }
    },
  };
}
