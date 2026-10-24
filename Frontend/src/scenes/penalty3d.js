import * as THREE from "three";

// Penalties in 3D, on three.js (MIT): a floodlit goal seen from behind the
// spot, a keeper who sways on the line and dives, a ball that curls into
// the net (and ripples it) or comes off the gloves. The server decides
// every kick; this only shows it. Sizes are in metres.
const GOAL_W = 7.32;
const GOAL_H = 2.44;
const DEPTH = 2;
const SPOT = new THREE.Vector3(0, 0.15, 11);
const AIM_X = [-2.65, 0, 2.65];
const AIM_Y = [0.85, 1.55, 0.95];
const KICK_S = 0.42;
const DIVE_S = 0.45;

const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function pitch() {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#1f8a3e" : "#23a046";
      g.fillRect(0, (h / 8) * i, w, h / 8);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshLambertMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2;
  m.position.z = 10;
  m.receiveShadow = true;
  const group = new THREE.Group();
  group.add(m);
  // Goal line, six-yard box and the spot.
  const line = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const strip = (w, d, x, z) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), line);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.005, z);
    group.add(s);
  };
  strip(40, 0.12, 0, 0);
  strip(18.32, 0.12, 0, 5.5);
  strip(0.12, 5.5, -9.16, 2.75);
  strip(0.12, 5.5, 9.16, 2.75);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), line);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, 0.006, SPOT.z);
  group.add(spot);
  return group;
}

// Stands full of fans behind the goal, under floodlights.
function stadium() {
  const group = new THREE.Group();
  const crowd = canvasTexture(1024, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#05060f");
    sky.addColorStop(0.35, "#141a3a");
    sky.addColorStop(1, "#0b0d1c");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const kits = ["#e11d48", "#facc15", "#ffffff", "#2563eb", "#f97316", "#22c55e", "#a855f7"];
    for (let k = 0; k < 5200; k++) {
      const y = h * 0.38 + Math.random() * h * 0.62;
      g.fillStyle = kits[k % kits.length];
      g.globalAlpha = 0.15 + ((y - h * 0.38) / (h * 0.62)) * 0.35;
      g.fillRect(Math.random() * w, y, 2, 2);
    }
    g.globalAlpha = 1;
    for (let r = 0; r < 6; r++) {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0, h * 0.38 + r * h * 0.105, w, 2);
    }
  });
  const stand = new THREE.Mesh(new THREE.PlaneGeometry(70, 17), new THREE.MeshBasicMaterial({ map: crowd }));
  stand.position.set(0, 7, -16);
  group.add(stand);
  // LED boards that scroll.
  const ads = canvasTexture(1024, 64, (g, w, h) => {
    g.fillStyle = "#0a0a0a";
    g.fillRect(0, 0, w, h);
    g.font = "900 34px Inter, system-ui, sans-serif";
    g.globalAlpha = 0.75;
    g.textBaseline = "middle";
    const words = [
      ["QIKWINS", "#facc15"],
      ["PLAY RESPONSIBLY", "#ffffff"],
      ["QIKWINS", "#ec4899"],
      ["18+", "#22c55e"],
    ];
    let x = 20;
    for (const [word, color] of words) {
      g.fillStyle = color;
      g.fillText(word, x, h / 2 + 2);
      x += g.measureText(word).width + 60;
    }
  });
  ads.wrapS = THREE.RepeatWrapping;
  ads.repeat.set(3, 1);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.9), new THREE.MeshBasicMaterial({ map: ads }));
  board.position.set(0, 0.45, -5);
  group.add(board);
  // Floodlight glows.
  const glow = canvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,240,1)");
    r.addColorStop(0.25, "rgba(255,255,220,0.5)");
    r.addColorStop(1, "rgba(255,255,220,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
  for (const x of [-15, -5, 5, 15]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(x, 14.5, -15.5);
    s.scale.set(5, 5, 1);
    group.add(s);
  }
  return { group, ads };
}

// Posts, bar and a net whose back can ripple.
function goal() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const post = (h, x, y, z, rot) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 16), white);
    m.position.set(x, y, z);
    if (rot) m.rotation.z = Math.PI / 2;
    m.castShadow = true;
    group.add(m);
  };
  post(GOAL_H, -GOAL_W / 2, GOAL_H / 2, 0);
  post(GOAL_H, GOAL_W / 2, GOAL_H / 2, 0);
  post(GOAL_W + 0.12, 0, GOAL_H, 0, true);

  const netMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
  // Static side and roof nets.
  const pts = [];
  const step = 0.2;
  for (const sx of [-1, 1]) {
    const x = (sx * GOAL_W) / 2;
    for (let z = 0; z >= -DEPTH - 0.001; z -= step) pts.push(x, 0, z, x, GOAL_H - (GOAL_H * 0.25 * -z) / DEPTH, z);
    for (let y = 0; y <= GOAL_H; y += step) pts.push(x, y, 0, x, Math.min(y, GOAL_H * 0.75), -DEPTH);
  }
  for (let x = -GOAL_W / 2; x <= GOAL_W / 2 + 0.001; x += step) pts.push(x, GOAL_H, 0, x, GOAL_H * 0.75, -DEPTH);
  const side = new THREE.BufferGeometry();
  side.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(side, netMat));

  // The back net is a grid of points joined by lines, so it can bulge.
  const cols = Math.round(GOAL_W / step);
  const rows = Math.round((GOAL_H * 0.75) / step);
  const base = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) base.push([-GOAL_W / 2 + i * step, j * step]);
  const index = [];
  const at = (i, j) => j * (cols + 1) + i;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      if (i < cols) index.push(at(i, j), at(i + 1, j));
      if (j < rows) index.push(at(i, j), at(i, j + 1));
    }
  const pos = new Float32Array(base.length * 3);
  base.forEach(([x, y], k) => pos.set([x, y, -DEPTH], k * 3));
  const back = new THREE.BufferGeometry();
  back.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  back.setIndex(index);
  group.add(new THREE.LineSegments(back, netMat));

  let hit = null;
  return {
    group,
    ripple(x, y) {
      hit = { x, y, t: 0 };
    },
    update(dt) {
      if (!hit) return;
      hit.t += dt;
      const a = 0.55 * Math.exp(-hit.t * 3.5);
      base.forEach(([x, y], k) => {
        const d2 = (x - hit.x) ** 2 + (y - hit.y) ** 2;
        pos[k * 3 + 2] = -DEPTH - a * Math.exp(-d2 / 0.5) * Math.cos(hit.t * 14);
      });
      back.attributes.position.needsUpdate = true;
      if (a < 0.002) hit = null;
    },
  };
}

function keeper() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.position.y = 1;
  root.add(rig);
  const kit = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc68a5a, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
  const glove = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const part = (geo, mat, x, y, parent = rig) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  part(new THREE.CapsuleGeometry(0.21, 0.38, 6, 12), kit, 0, 0.3);
  part(new THREE.SphereGeometry(0.13, 16, 12), skin, 0, 0.83);
  part(new THREE.BoxGeometry(0.42, 0.24, 0.26), dark, 0, -0.06);
  const legs = [-0.11, 0.11].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, -0.12, 0);
    rig.add(leg);
    part(new THREE.CapsuleGeometry(0.075, 0.62, 4, 8), dark, 0, -0.42, leg);
    return leg;
  });
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, 0.56, 0);
    rig.add(arm);
    part(new THREE.CapsuleGeometry(0.06, 0.42, 4, 8), kit, 0, -0.26, arm);
    part(new THREE.SphereGeometry(0.095, 12, 10), glove, 0, -0.55, arm);
    return arm;
  });
  return { root, rig, kit, legs, arms };
}

function ballMesh() {
  const tex = canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#0a0a0a";
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++) {
        const x = (c + (r % 2) * 0.5) * (w / 6);
        const y = (r + 0.5) * (h / 4);
        g.beginPath();
        for (let k = 0; k < 5; k++) g.lineTo(x + Math.cos((k * 2 * Math.PI) / 5) * 11, y + Math.sin((k * 2 * Math.PI) / 5) * 11);
        g.fill();
      }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
  m.castShadow = true;
  return m;
}

export function penaltyScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a18);
  scene.fog = new THREE.Fog(0x070a18, 30, 60);
  const camera = new THREE.PerspectiveCamera(20, 1.6, 0.1, 100);
  const HOME = new THREE.Vector3(0, 1.6, 18.5);
  const LOOK = new THREE.Vector3(0, 0.5, 0);
  camera.position.copy(HOME);
  camera.lookAt(LOOK);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1d5a2c, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(-6, 14, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -16, near: 1, far: 45 });
  scene.add(sun);

  const field = pitch();
  const { group: stands, ads } = stadium();
  const net = goal();
  const gk = keeper();
  const ball = ballMesh();
  gk.root.position.z = 0.25;
  scene.add(field, stands, net.group, gk.root, ball);

  let kick = null; // { aim, dive, goal, t, free }
  let t = 0;

  function idlePose() {
    gk.root.position.set(Math.sin(t * 2.2) * 0.35, Math.abs(Math.sin(t * 4.4)) * 0.04, 0.25);
    gk.rig.rotation.z = 0;
    gk.rig.position.y = 1;
    gk.arms[0].rotation.z = -0.55;
    gk.arms[1].rotation.z = 0.55;
    gk.legs[0].rotation.z = -0.12;
    gk.legs[1].rotation.z = 0.12;
    ball.position.copy(SPOT);
    ball.rotation.set(0, 0, 0);
  }

  function divePose(k) {
    const u = ease((k.t - 0.08) / DIVE_S);
    const dir = k.dive - 1;
    const air = Math.sin(Math.PI * Math.min(1, u)) * 0.35;
    if (dir === 0) {
      gk.root.position.set(0, air * 1.4, 0.25);
      gk.arms[0].rotation.z = -0.55 - u * 2.4;
      gk.arms[1].rotation.z = 0.55 + u * 2.4;
    } else {
      gk.root.position.set(dir * 2.15 * u, 0, 0.25);
      gk.rig.position.y = 1 + air - u * 0.45;
      gk.rig.rotation.z = -dir * 1.3 * u;
      gk.arms[0].rotation.z = -0.55 - u * 2.35;
      gk.arms[1].rotation.z = 0.55 + u * 2.35;
    }
    gk.legs[0].rotation.z = -0.12 - u * 0.25;
    gk.legs[1].rotation.z = 0.12 + u * 0.25;
  }

  function ballFlight(k, dt) {
    const target = new THREE.Vector3(AIM_X[k.aim], AIM_Y[k.aim], 0);
    if (!k.goal) {
      // Saved: the ball meets the keeper's gloves.
      target.x = (k.dive - 1) * 2.4;
      target.y = k.dive === 1 ? 1.75 : 0.75;
    }
    if (k.t <= KICK_S) {
      const u = k.t / KICK_S;
      ball.position.lerpVectors(SPOT, target, u);
      ball.position.y += Math.sin(Math.PI * u) * 0.5;
      ball.position.x += Math.sin(Math.PI * u) * (k.aim - 1) * -0.35;
      ball.rotation.x -= dt * 30;
      return;
    }
    if (!k.free) {
      // From the line on, a little physics: into the net, or off the gloves.
      k.free = { v: k.goal ? new THREE.Vector3(0, -0.5, -9) : new THREE.Vector3((k.dive - 1 || 0.6) * 3, 2.5, 6), netted: false };
      ball.position.copy(target);
      k.onContact?.(k.goal);
    }
    const f = k.free;
    f.v.y -= 9.8 * dt;
    ball.position.addScaledVector(f.v, dt);
    ball.rotation.x -= dt * f.v.length() * 3;
    if (k.goal && !f.netted && ball.position.z < -DEPTH + 0.15) {
      f.netted = true;
      net.ripple(ball.position.x, ball.position.y);
      f.v.set(f.v.x * 0.2, 0, 0.6);
    }
    if (ball.position.y < SPOT.y) {
      ball.position.y = SPOT.y;
      f.v.y = Math.abs(f.v.y) * 0.45;
      f.v.x *= 0.8;
      f.v.z *= 0.8;
    }
  }

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let last = performance.now();
  let raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    ads.offset.x = (ads.offset.x + dt * 0.04) % 1;
    if (kick) {
      kick.t += dt;
      divePose(kick);
      ballFlight(kick, dt);
      // Push in on the strike, and a little shake on contact.
      const u = ease(kick.t / 0.6);
      camera.position.set(HOME.x, HOME.y - u * 0.1, HOME.z - u * 3);
      if (kick.free && kick.t < KICK_S + 0.25) camera.position.x += Math.sin(kick.t * 90) * 0.03;
    } else {
      idlePose();
      camera.position.set(HOME.x + Math.sin(t * 0.4) * 0.15, HOME.y, HOME.z);
    }
    camera.lookAt(LOOK);
    net.update(dt);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    // The goal mouth on screen, as fractions of the canvas.
    mouth() {
      camera.position.copy(HOME);
      camera.lookAt(LOOK);
      camera.updateMatrixWorld();
      const a = new THREE.Vector3(-GOAL_W / 2, GOAL_H, 0).project(camera);
      const b = new THREE.Vector3(GOAL_W / 2, 0, 0).project(camera);
      return { left: (a.x + 1) / 2, top: (1 - a.y) / 2, right: (b.x + 1) / 2, bottom: (1 - b.y) / 2 };
    },
    setRole(role) {
      gk.kit.color.set(role === "keep" ? 0xfacc15 : 0xdc2626);
    },
    play(reveal, onContact) {
      kick = { aim: reveal.aim, dive: reveal.dive, goal: reveal.goal, t: 0, free: null, onContact };
    },
    reset() {
      kick = null;
      idlePose();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    },
  };
}
