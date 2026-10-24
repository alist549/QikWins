// Hop Off's sky: a jet flies over a scrolling world, a new city skyline
// slides in at every stop, riders who hop off float down on parachutes, and
// a storm hits the jet at the checkpoint. Drawn with PixiJS Graphics, so
// there are no image files.

const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  const r = Math.round(lerp((c1 >> 16) & 255, (c2 >> 16) & 255, t));
  const g = Math.round(lerp((c1 >> 8) & 255, (c2 >> 8) & 255, t));
  const b = Math.round(lerp(c1 & 255, c2 & 255, t));
  return (r << 16) | (g << 8) | b;
}
// Same city, same skyline: a tiny seeded random.
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export async function flightScene(app, PIXI) {
  const { Container, Graphics, Text } = PIXI;
  const W = () => app.screen.width;
  const H = () => app.screen.height;

  const sky = new Graphics();
  const sun = new Graphics();
  const far = new Container();
  const clouds = new Container();
  const cities = new Container();
  const ground = new Graphics();
  const trail = new Container();
  const chutes = new Container();
  const jet = new Container();
  const storm = new Graphics();
  const flash = new Graphics();
  app.stage.addChild(sky, sun, far, clouds, cities, ground, trail, chutes, jet, storm, flash);

  let props = { stop: 0, moving: false, caught: false, sky: [0x1d4ed8, 0x38bdf8], stops: [] };
  let speed = 0.2;
  let t = 0;
  let lastStop = -1;
  let lastHops = 0;
  let stormLevel = 0;
  let sized = { w: 0, h: 0 };

  function drawSky() {
    const [top, bottom] = props.sky;
    sky.clear();
    const bands = 28;
    for (let i = 0; i < bands; i++) {
      sky.rect(0, (H() * i) / bands, W(), H() / bands + 1).fill(mix(top, bottom, i / (bands - 1)));
    }
    sun.clear();
    for (let r = 46; r > 14; r -= 8) sun.circle(W() * 0.82, H() * 0.24, r).fill({ color: 0xfff7cc, alpha: 0.08 });
    sun.circle(W() * 0.82, H() * 0.24, 16).fill(0xfff1a8);
  }

  function drawFar() {
    far.removeChildren();
    const rnd = seeded("far");
    const g = new Graphics();
    for (let x = 0; x < W() * 2 + 60; x += 34 + rnd() * 30) {
      const h = 30 + rnd() * 50;
      g.moveTo(x - 50, H() * 0.78).lineTo(x, H() * 0.78 - h).lineTo(x + 50, H() * 0.78);
    }
    g.fill({ color: 0xffffff, alpha: 0.12 });
    far.addChild(g);
  }

  function makeCloud(x, y, s) {
    const c = new Graphics();
    c.circle(0, 0, 14 * s).circle(14 * s, -6 * s, 18 * s).circle(30 * s, 0, 13 * s).rect(0, 0, 30 * s, 12 * s);
    c.fill({ color: 0xffffff, alpha: 0.85 });
    c.x = x;
    c.y = y;
    c.speed = 0.6 + s * 0.8;
    return c;
  }

  function drawGround() {
    ground.clear();
    const y = H() * 0.86;
    ground.rect(0, y, W(), H() - y).fill({ color: 0x0a0a0a, alpha: 0.55 });
  }

  // A city: a seeded skyline, a tower or dome, and its name on a sign.
  function spawnCity(name) {
    const rnd = seeded(name);
    const c = new Container();
    const g = new Graphics();
    const base = H() * 0.86;
    let x = 0;
    const width = 150 + rnd() * 60;
    while (x < width) {
      const w = 12 + rnd() * 18;
      const h = 24 + rnd() * 70;
      g.rect(x, base - h, w, h);
      x += w + 2;
    }
    g.fill({ color: 0x0b1020, alpha: 0.75 });
    // Lit windows.
    const lights = new Graphics();
    for (let i = 0; i < 40; i++) lights.rect(rnd() * width, base - 10 - rnd() * 70, 2, 3);
    lights.fill({ color: 0xfde68a, alpha: 0.8 });
    // A landmark: a tall spire or a dome.
    const lx = width * (0.3 + rnd() * 0.4);
    const landmark = new Graphics();
    if (rnd() < 0.5) landmark.poly([lx - 8, base, lx, base - 120 - rnd() * 30, lx + 8, base]).fill({ color: 0x0b1020, alpha: 0.85 });
    else landmark.rect(lx - 18, base - 50, 36, 50).circle(lx, base - 50, 18).rect(lx - 1, base - 84, 2, 18).fill({ color: 0x0b1020, alpha: 0.85 });
    const sign = new Text({ text: name.toUpperCase(), style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, fontWeight: "800", fill: 0xffffff, letterSpacing: 1 } });
    sign.x = 4;
    sign.y = base - 118;
    const plate = new Graphics().roundRect(0, base - 122, sign.width + 8, 22, 6).fill({ color: 0x000000, alpha: 0.45 });
    c.addChild(g, landmark, lights, plate, sign);
    c.x = W() + 10;
    c.width0 = width;
    cities.addChild(c);
  }

  function buildJet() {
    jet.removeChildren();
    const body = new Graphics();
    body.roundRect(-46, -9, 88, 18, 9).fill(0xffffff); // fuselage
    body.poly([38, -9, 54, 0, 38, 9]).fill(0xffffff); // nose
    body.poly([-40, -8, -54, -30, -42, -30, -26, -8]).fill(0x007dfe); // tail fin
    body.poly([-6, 2, -26, 26, -12, 26, 14, 2]).fill(0xd4d4d8); // wing
    body.roundRect(-14, 18, 18, 7, 3).fill(0x71717a); // engine
    for (let i = 0; i < 7; i++) body.circle(-28 + i * 9, -2, 2.2).fill(0x0a0a0a);
    body.poly([40, -6, 50, -1, 40, -1]).fill(0x7dd3fc); // cockpit
    body.rect(-46, 3, 84, 2).fill(0x007dfe); // stripe
    jet.addChild(body);
    jet.body = body;
  }

  function spawnPuff() {
    const p = new Graphics().circle(0, 0, 3 + Math.random() * 3).fill({ color: 0xffffff, alpha: 0.7 });
    p.x = jet.x - 50;
    p.y = jet.y + (Math.random() - 0.5) * 4;
    p.life = 1;
    trail.addChild(p);
  }

  function spawnChute(big) {
    const c = new Container();
    const colours = [0xfacc15, 0xec4899, 0x22c55e, 0xf97316, 0x7c3aed];
    const canopy = new Graphics();
    const s = big ? 1.25 : 0.8;
    canopy.arc(0, 0, 14 * s, Math.PI, 0).fill(big ? 0xfacc15 : colours[Math.floor(Math.random() * colours.length)]);
    const lines = new Graphics()
      .moveTo(-14 * s, 0)
      .lineTo(0, 20 * s)
      .moveTo(14 * s, 0)
      .lineTo(0, 20 * s)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
    const person = new Graphics().circle(0, 20 * s, 3 * s).fill(0x0a0a0a).rect(-2 * s, 22 * s, 4 * s, 7 * s).fill(0x0a0a0a);
    c.addChild(lines, canopy, person);
    c.x = jet.x - 10;
    c.y = jet.y + 10;
    c.vx = -0.6 - Math.random() * 0.6;
    c.sway = Math.random() * 6;
    chutes.addChild(c);
  }

  function layout() {
    if (sized.w === W() && sized.h === H()) return;
    sized = { w: W(), h: H() };
    drawSky();
    drawFar();
    drawGround();
    clouds.removeChildren();
    for (let i = 0; i < 6; i++) clouds.addChild(makeCloud(Math.random() * W(), 20 + Math.random() * H() * 0.45, 0.5 + Math.random() * 0.7));
    jet.x = W() * 0.4;
    jet.y = H() * 0.42;
  }

  buildJet();
  layout();

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;
    layout();
    t += dt / 60;
    const target = props.caught ? 0.1 : props.moving ? 1 : 0.25;
    speed += (target - speed) * 0.04 * dt;

    far.x -= 0.25 * speed * dt;
    if (far.x < -W()) far.x += W();
    for (const c of clouds.children) {
      c.x -= c.speed * speed * dt * 1.6;
      if (c.x < -60) {
        c.x = W() + 40;
        c.y = 20 + Math.random() * H() * 0.45;
      }
    }
    for (const c of [...cities.children]) {
      c.x -= 2.2 * Math.max(speed, 0.15) * dt;
      if (c.x < -c.width0 - 40) c.destroy({ children: true });
    }

    // The jet bobs, banks a little, and shakes in the storm.
    const shake = stormLevel > 0.2 ? (Math.random() - 0.5) * 5 * stormLevel : 0;
    jet.y = H() * 0.42 + Math.sin(t * 2.2) * 4 + shake + (props.caught ? stormLevel * 18 : 0);
    jet.x = W() * 0.4 + shake;
    jet.rotation = Math.sin(t * 1.6) * 0.03 + (props.caught ? stormLevel * 0.18 : 0);
    jet.body.tint = props.caught ? mix(0xffffff, 0xff6b6b, stormLevel) : 0xffffff;

    if (speed > 0.3 && Math.random() < 0.5 * speed) spawnPuff();
    for (const p of [...trail.children]) {
      p.x -= 3 * speed * dt;
      p.life -= 0.02 * dt;
      p.alpha = Math.max(0, p.life * 0.7);
      p.scale.set(1 + (1 - p.life) * 1.5);
      if (p.life <= 0) p.destroy();
    }
    for (const c of [...chutes.children]) {
      c.y += 0.55 * dt;
      c.x += c.vx * dt;
      c.rotation = Math.sin(t * 2 + c.sway) * 0.15;
      if (c.y > H() + 40) c.destroy({ children: true });
    }

    stormLevel += ((props.caught ? 1 : 0) - stormLevel) * 0.05 * dt;
    storm.clear();
    if (stormLevel > 0.01) {
      storm.rect(0, 0, W(), H()).fill({ color: 0x1e1b4b, alpha: 0.5 * stormLevel });
      for (let i = 0; i < 5; i++) storm.circle(((i * 97 + t * 10) % (W() + 80)) - 40, 18 + (i % 2) * 14, 34).fill({ color: 0x334155, alpha: 0.8 * stormLevel });
    }
    flash.clear();
    if (props.caught && stormLevel > 0.3 && Math.random() < 0.025 * dt) {
      flash.rect(0, 0, W(), H()).fill({ color: 0xffffff, alpha: 0.55 });
      const x = jet.x + 30;
      flash.moveTo(x, 0).lineTo(x - 12, jet.y * 0.45).lineTo(x + 6, jet.y * 0.5).lineTo(x - 6, jet.y - 6).stroke({ width: 3, color: 0xfde047 });
    }
  });

  return {
    update(next) {
      const skyChanged = next.sky?.[0] !== props.sky[0];
      props = { ...props, ...next };
      if (skyChanged) {
        sized = { w: 0, h: 0 };
      }
      if (next.stop !== lastStop) {
        if (next.stop > 0 && next.stops?.[next.stop - 1]) spawnCity(next.stops[next.stop - 1]);
        else cities.removeChildren();
        lastStop = next.stop;
      }
      const hops = next.hops || 0;
      if (hops > lastHops) for (let i = lastHops; i < Math.min(hops, lastHops + 4); i++) spawnChute(false);
      lastHops = hops;
      if (next.myHop && !props.myHopShown) {
        spawnChute(true);
        props.myHopShown = true;
      }
      if (!next.myHop) props.myHopShown = false;
    },
  };
}
