import { seeded } from "../lib/races";
import { course } from "../vendor/marble-race/course";
import { loadBox2D, simulate, RADIUS, STEP, startSpot } from "../vendor/marble-race/physics";
import { raceScene } from "./race";

// Marble Madness on real physics: the marbles fall through lazygyu/roulette's
// "Pot of greed" course in Box2D. The server still draws the winner. When
// the race starts, this screen runs the whole race ahead of time from the
// round's seed (a few milliseconds), sees which marble lands first, and
// paints the drawn winner's colours on that marble. Then it replays the
// recording on the server's clock. While stakes come in the marbles jostle
// in the hopper; a gate drops when the race begins.
const MIN_X = 2;
const MAX_X = 24;
const VIEW = 9.5; // metres of course on screen, top to bottom

export async function marbleScene(app, PIXI, theme, cbs = {}) {
  let B;
  try {
    B = await loadBox2D();
  } catch (e) {
    console.error("Box2D:", e);
    return raceScene(app, PIXI, theme, cbs);
  }
  const { Container, Graphics } = PIXI;
  const n = theme.racers.length;

  const bg = new Graphics();
  const world = new Container();
  const walls = new Graphics();
  const goal = new Graphics();
  const gate = new Graphics();
  const spinners = new Container();
  const marbles = new Container();
  const marker = new Graphics();
  const sparks = new Container();
  const ranks = new Container();
  const dust = new Graphics();
  const dustRand = seeded("dust");
  for (let k = 0; k < 260; k++) dust.circle(dustRand() * 30 - 2, dustRand() * 102 - 6, 0.03 + dustRand() * 0.06).fill({ color: 0xffffff, alpha: 0.12 + dustRand() * 0.3 });
  world.addChild(dust, goal, walls, spinners, gate, marbles, marker, sparks);
  app.stage.addChild(bg, world, ranks);

  // The course, drawn once in metres.
  const [neonA, neonB] = [0xc084fc, 0xf472b6];
  const kinematic = [];
  for (const e of course.entities) {
    const s = e.shape;
    if (e.type === "kinematic") {
      const g = new Graphics()
        .roundRect(-s.width, -s.height, s.width * 2, s.height * 2, s.height)
        .fill(neonB)
        .circle(0, 0, 0.18)
        .fill(0xffffff);
      g.position.set(e.position.x, e.position.y);
      g.av = e.props.angularVelocity;
      spinners.addChild(g);
      kinematic.push(g);
    } else if (s.type === "box") {
      const g = new Graphics().rect(-s.width, -s.height, s.width * 2, s.height * 2).fill({ color: neonA, alpha: 0.18 }).stroke({ width: 0.12, color: neonA });
      g.position.set(e.position.x, e.position.y);
      g.rotation = s.rotation;
      walls.addChild(g);
    } else if (s.type === "circle") {
      walls.circle(e.position.x, e.position.y, s.radius).fill({ color: neonA, alpha: 0.3 });
    } else {
      const pts = s.points.map(([x, y]) => [x + e.position.x, Math.max(y + e.position.y, -8)]);
      walls.moveTo(...pts[0]);
      for (const p of pts.slice(1)) walls.lineTo(...p);
    }
  }
  walls.stroke({ width: 0.16, color: neonA, cap: "round", join: "round" });
  const sq = 0.5;
  for (let x = MIN_X - 2; x < MAX_X + 2; x += sq) for (let k = 0; k < 2; k++) goal.rect(x, course.goalY + k * sq, sq, sq).fill(((x - MIN_X) / sq + k) % 2 ? 0xffffff : 0x0a0a0a);
  gate.roundRect(9, 1.35, 8, 0.22, 0.1).fill(0xfacc15);

  function marble(color) {
    const r = RADIUS * 1.15;
    const g = new Graphics()
      .circle(0, 0, r)
      .fill(color)
      .circle(0, 0, r)
      .fill({ color: 0x000000, alpha: 0.25 })
      .circle(-r * 0.12, -r * 0.12, r * 0.73)
      .fill(color)
      .ellipse(-r * 0.33, -r * 0.4, r * 0.35, r * 0.19)
      .fill({ color: 0xffffff, alpha: 0.8 })
      .circle(0, 0, r)
      .stroke({ width: 0.03, color: 0xffffff, alpha: 0.45 });
    return g;
  }
  theme.racers.forEach((r) => marbles.addChild(marble(r.color)));
  marker.poly([-0.22, -0.75, 0.22, -0.75, 0, -0.45]).fill(0xfacc15);

  // The rank strip on the right: one dot per racer, leader on top.
  const dots = theme.racers.map((r) => {
    const d = new Graphics().circle(0, 0, 7).fill(r.color).circle(0, 0, 7).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
    ranks.addChild(d);
    return d;
  });

  let props = {};
  let clockOffset = 0;
  let lastServerNow = null;
  let race = null; // { key, rec, slotOf, racerAt, wait, localEnd, runMs }
  let finished = false;
  let cam = { x: 13, y: 0 };
  let t = 0;
  const jiggle = Array.from({ length: n }, (_, i) => ({ k: 1.3 + (i % 4) * 0.4, p: i * 1.7 }));

  function plan(roundId, winning, runMs, left) {
    // Same round, same seed, same race on every screen.
    const rand = seeded(`marbles-${roundId}`);
    let rec = simulate(B, course, n, rand);
    for (let k = 1; rec.first < 0 && k < 5; k++) rec = simulate(B, course, n, seeded(`marbles-${roundId}-${k}`));
    if (rec.first < 0) return null;
    // racerAt[slot] is the racer painted on the marble in that slot. The
    // drawn winner goes on the marble that lands first; the rest are
    // shuffled from the same seed.
    const others = theme.racers.map((_, i) => i).filter((i) => i !== winning);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const racerAt = [];
    for (let slot = 0, k = 0; slot < n; slot++) racerAt[slot] = slot === rec.first ? winning : others[k++];
    const firstSec = rec.firstStep * STEP;
    // If the course is quicker than the race time, the gate holds the
    // marbles for the difference; if slower, the replay runs a little fast.
    const wait = Math.max(0, runMs - firstSec * 1000);
    const rate = Math.max(1, (firstSec * 1000) / runMs);
    return { key: roundId, rec, racerAt, wait, rate, runMs, localEnd: performance.now() + left };
  }

  const frameAt = (sec) => race.rec.frames[Math.min(race.rec.frames.length - 1, Math.max(0, Math.round(sec / STEP)))];

  function burst(x, y) {
    for (let k = 0; k < 50; k++) {
      const s = new Graphics().rect(-0.1, -0.05, 0.2, 0.1).fill([0xfacc15, 0xffffff, 0xec4899, 0x22c55e, 0x38bdf8][k % 5]);
      const a = Math.random() * Math.PI * 2;
      const v = 0.05 + Math.random() * 0.15;
      Object.assign(s, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.08, life: 1 });
      s.position.set(x, y);
      sparks.addChild(s);
    }
  }

  let size = null;
  function layout() {
    const W = app.screen.width;
    const H = app.screen.height;
    size = { W, H };
    bg.clear();
    const [top, bottom] = theme.sky;
    bg.rect(0, 0, W, H / 2).fill(top).rect(0, H / 2, W, H / 2).fill(bottom).rect(0, 0, W, H).fill({ color: bottom, alpha: 0.3 });
    const scale = H / VIEW;
    world.scale.set(scale);
    const gap = Math.min(20, (H - 24) / n);
    dots.forEach((d) => (d.x = W - 18));
    ranks.gap = gap;
  }

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    t += dt;
    if (!size || size.W !== app.screen.width || size.H !== app.screen.height) layout();
    const { phase, winning, roundId, endsAt, runMs = 8000, selected } = props;
    const running = phase === "spinning" && winning != null && endsAt;
    const done = phase === "result" && winning != null;

    if ((running || done) && race?.key !== roundId) {
      const left = running ? Math.min(runMs, Math.max(0, endsAt - (Date.now() + clockOffset))) : 0;
      race = plan(roundId, winning, runMs, left);
      finished = false;
    }
    if (phase === "open" && race) {
      race = null;
      finished = false;
      cam = { x: 13, y: 0 };
    }

    // Where every racer is, in metres, and the leader to follow.
    const pos = Array(n);
    let sec = 0;
    if (race) {
      const elapsed = race.runMs - (race.localEnd - performance.now());
      sec = (Math.max(0, elapsed - race.wait) / 1000) * race.rate;
      const step = Math.round(sec / STEP);
      race.racerAt.forEach((racer, slot) => {
        // A marble that has crossed the line stays on it.
        const done = race.rec.finishedAt[slot];
        const f = frameAt((done >= 0 && step > done ? done : step) * STEP);
        pos[racer] = { x: f[slot * 3], y: f[slot * 3 + 1], a: f[slot * 3 + 2] };
      });
      gate.visible = elapsed < race.wait;
      // Settle into the gate from the hopper over the first moments.
      const settle = Math.min(1, elapsed / 400);
      if (settle < 1) pos.forEach((p, i) => Object.assign(p, mix(hopper(i), p, settle)));
      if (!finished && sec >= race.rec.firstStep * STEP) {
        finished = true;
        const p = pos[winning];
        burst(p.x, p.y);
        app.canvas.dataset.first = race.racerAt[race.rec.first];
        cbs.onFinish?.();
      }
      if (elapsed >= race.wait && !race.started) {
        race.started = true;
        cbs.onStart?.();
      }
    } else {
      gate.visible = true;
      for (let i = 0; i < n; i++) pos[i] = hopper(i);
    }

    pos.forEach((p, i) => {
      const m = marbles.children[i];
      m.position.set(p.x, p.y);
      m.rotation = p.a;
      const isWinner = done && finished && i === winning;
      m.scale.set(isWinner ? 1.3 + Math.sin(t * 6) * 0.06 : 1);
      m.alpha = done && finished && !isWinner ? 0.6 : 1;
    });
    kinematic.forEach((g) => (g.rotation = g.av * sec));

    marker.visible = selected != null;
    if (selected != null) marker.position.set(pos[selected].x, pos[selected].y);

    // The camera follows the leader, or the winner once it lands.
    const order = pos.map((p, i) => i).sort((a, b) => pos[b].y - pos[a].y);
    if (finished && winning != null) {
      order.splice(order.indexOf(winning), 1);
      order.unshift(winning);
    }
    const lead = pos[order[0]];
    const { W, H } = size;
    const scale = H / VIEW;
    const halfW = W / scale / 2;
    const target = {
      x: halfW * 2 >= MAX_X - MIN_X + 2 ? (MIN_X + MAX_X) / 2 : Math.min(MAX_X + 1 - halfW, Math.max(MIN_X - 1 + halfW, lead.x)),
      y: Math.min(course.goalY + 3.2 - VIEW / 2, Math.max(VIEW / 2 - 2.2, lead.y + 1)),
    };
    const k = 1 - Math.exp(-dt * (race ? 5 : 2));
    cam.x += (target.x - cam.x) * k;
    cam.y += (target.y - cam.y) * k;
    world.position.set(W / 2 - cam.x * scale, H / 2 - cam.y * scale);

    const top = (H - ranks.gap * n) / 2 + ranks.gap / 2;
    order.forEach((racer, rank) => {
      const d = dots[racer];
      const y = top + rank * ranks.gap;
      d.y += (y - d.y) * Math.min(1, dt * 10);
      d.scale.set(racer === selected ? 1.25 : 1);
    });

    for (const s of [...sparks.children]) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.006;
      s.life -= dt;
      s.alpha = s.life;
      if (s.life <= 0) s.destroy();
    }
  });

  // Waiting marbles roll around above the gate.
  function hopper(i) {
    const j = jiggle[i];
    const home = startSpot(i);
    return { x: home.x + Math.sin(t * j.k + j.p) * 0.9, y: home.y - 0.6 - Math.abs(Math.sin(t * j.k * 1.7 + j.p)) * 0.7, a: t * j.k * 2 };
  }

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

const mix = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, a: a.a + (b.a - a.a) * u });
