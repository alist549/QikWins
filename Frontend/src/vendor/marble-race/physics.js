// Marble race physics, ported from lazygyu/roulette's physics-box2d.ts
// (MIT, see LICENSE here) and trimmed to what a race needs: build the
// course, drop the marbles, and step the world on a fixed 10ms clock.
// Box2D itself is box2d-wasm (Zlib) and loads only when a race opens.
let box2d = null;
export const loadBox2D = () => (box2d ??= import("box2d-wasm").then((m) => m.default()));

export const STEP = 0.01;
export const RADIUS = 0.25;

// Where marble `order` waits at the top of the chute (as in roulette).
export const startSpot = (order) => ({ x: 10.25 + (order % 10) * 0.6, y: 1 - Math.floor(order / 10) });

function build(B, course) {
  const world = new B.b2World(new B.b2Vec2(0, 10));
  for (const e of course.entities) {
    const def = new B.b2BodyDef();
    def.set_type(e.type === "kinematic" ? B.b2_kinematicBody : B.b2_staticBody);
    const body = world.CreateBody(def);
    const fix = new B.b2FixtureDef();
    fix.set_density(e.props.density);
    fix.set_restitution(e.props.restitution);
    const s = e.shape;
    if (s.type === "box") {
      const shape = new B.b2PolygonShape();
      shape.SetAsBox(s.width, s.height, new B.b2Vec2(0, 0), s.rotation);
      fix.set_shape(shape);
      body.CreateFixture(fix);
    } else if (s.type === "circle") {
      const shape = new B.b2CircleShape();
      shape.set_m_radius(s.radius);
      fix.set_shape(shape);
      body.CreateFixture(fix);
    } else {
      for (let i = 0; i < s.points.length - 1; i++) {
        const edge = new B.b2EdgeShape();
        edge.SetTwoSided(new B.b2Vec2(...s.points[i]), new B.b2Vec2(...s.points[i + 1]));
        body.CreateFixture(edge, 1);
      }
    }
    body.SetAngularVelocity(e.props.angularVelocity);
    body.SetTransform(new B.b2Vec2(e.position.x, e.position.y), 0);
  }
  return world;
}

// Runs a whole race ahead of time from a seed and records it. Returns the
// marbles' positions at every step (x, y, angle per marble), the step at
// which the first marble crossed the goal, and which marble that was.
// The run keeps going a little after the first finish so the replay has
// a follow-through. Same seed, same race.
export function simulate(B, course, n, rand, { maxSec = 40, afterSec = 2.5 } = {}) {
  const world = build(B, course);
  const marbles = [];
  for (let i = 0; i < n; i++) {
    const { x, y } = startSpot(i);
    const def = new B.b2BodyDef();
    def.set_type(B.b2_dynamicBody);
    def.set_position(new B.b2Vec2(x, y));
    const body = world.CreateBody(def);
    const shape = new B.b2CircleShape();
    shape.set_m_radius(RADIUS);
    body.CreateFixture(shape, 1 + rand());
    marbles.push(body);
  }
  const frames = [];
  const finishedAt = Array(n).fill(-1);
  let first = -1;
  let firstStep = -1;
  const maxSteps = Math.round(maxSec / STEP);
  for (let step = 0; step < maxSteps; step++) {
    const f = new Float32Array(n * 3);
    marbles.forEach((b, i) => {
      const p = b.GetPosition();
      f[i * 3] = p.x;
      f[i * 3 + 1] = p.y;
      f[i * 3 + 2] = b.GetAngle();
      if (finishedAt[i] < 0 && p.y > course.goalY) {
        finishedAt[i] = step;
        if (first < 0) {
          first = i;
          firstStep = step;
        }
      }
    });
    frames.push(f);
    if (firstStep >= 0 && step - firstStep > afterSec / STEP) break;
    world.Step(STEP, 6, 2);
  }
  B.destroy(world);
  return { frames, first, firstStep, finishedAt };
}
