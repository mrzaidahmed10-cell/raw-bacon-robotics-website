/* Hero scene: three machined gears drop onto a perforated aluminum plate and mesh.
   Real PBR metal (environment-lit), soft shadows, damped bounces, an impact ring and sparks.
   three.js r187 (MIT), self-hosted in ./vendor. Used on the home page only. */
import * as THREE from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const TAU = Math.PI * 2;
const ease = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

/* ---------- Gear geometry ---------- */
function gearGeometry(N, m, thick, bore, holeCount, holeR, holeAt) {
  const Rp = (N * m) / 2, Ro = Rp + m * 0.95, Rr = Rp - m * 1.15, h = Ro - Rr, p = TAU / N;
  const seq = [[-0.5, Rr], [-0.33, Rr], [-0.31, Rr + 0.05 * h], [-0.13, Ro], [0, Ro], [0.13, Ro], [0.31, Rr + 0.05 * h], [0.33, Rr]];
  const s = new THREE.Shape();
  let first = true;
  for (let k = 0; k < N; k++) for (const [u, r] of seq) {
    const a = (k + u) * p, x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (first) { s.moveTo(x, y); first = false; } else s.lineTo(x, y);
  }
  s.closePath();
  const b = new THREE.Path(); b.absarc(0, 0, bore, 0, TAU, true); s.holes.push(b);
  for (let i = 0; i < holeCount; i++) {
    const a = ((i + 0.5) / holeCount) * TAU, c = new THREE.Path();
    c.absarc(Math.cos(a) * holeAt, Math.sin(a) * holeAt, holeR, 0, TAU, true); s.holes.push(c);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 28, steps: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.07, 0);
  return { geo: g, Rp, Ro };
}

/* ---------- Perforated plate texture ---------- */
function plateTextures(renderer) {
  const S = 1024, per = 16, cell = S / per;
  const mk = (base, hole, rim) => {
    const c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.globalAlpha = 0.06; for (let i = 0; i < 900; i++) { x.fillStyle = i % 2 ? "#fff" : "#000"; x.fillRect(Math.random() * S, Math.random() * S, 60 + Math.random() * 120, 1); }
    x.globalAlpha = 1;
    for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell;
      x.beginPath(); x.arc(cx, cy, cell * 0.3, 0, TAU); x.fillStyle = rim; x.fill();
      x.beginPath(); x.arc(cx, cy, cell * 0.24, 0, TAU); x.fillStyle = hole; x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const map = mk("#26262a", "#020203", "#3a3a40");
  const bump = mk("#8a8a8a", "#000", "#d0d0d0"); bump.colorSpace = THREE.NoColorSpace;
  for (const t of [map, bump]) t.repeat.set(10, 7);
  return { map, bump };
}

export function gears(host, opts) {
  opts = opts || {};
  const still = !!opts.still;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x0b0b0c, 1);
  const cv = renderer.domElement; cv.setAttribute("aria-hidden", "true"); host.prepend(cv);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b0c, 38, 92);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 220);
  const camBase = new THREE.Vector3(), look = new THREE.Vector3();

  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-14, 26, 12); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -30; key.shadow.camera.right = 30; key.shadow.camera.top = 30; key.shadow.camera.bottom = -30;
  key.shadow.camera.near = 5; key.shadow.camera.far = 80; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.PointLight(0xd4161c, 260, 60, 2); rim.position.set(14, 5, 6); scene.add(rim);

  /* plate */
  const tex = plateTextures(renderer);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(160, 112), new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 2.2, metalness: 0.7, roughness: 0.5 }));
  plate.rotation.x = -Math.PI / 2; plate.receiveShadow = true; scene.add(plate);

  /* gears */
  const aluminum = new THREE.MeshStandardMaterial({ color: 0xb9bdc3, metalness: 1, roughness: 0.3 });
  const oxide = new THREE.MeshStandardMaterial({ color: 0x2c2c31, metalness: 1, roughness: 0.36 });
  const anodized = new THREE.MeshStandardMaterial({ color: 0xd4161c, metalness: 0.85, roughness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xbfc2c7, metalness: 1, roughness: 0.2 });
  const blackp = new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0.6, roughness: 0.55 });

  const M = 0.42, BORE = 0.8, REST = 0.22;
  const defs = [
    { N: 34, thick: 0.8, mat: aluminum, holes: [6, 1.45, 4.0], delay: 0.35 },
    { N: 22, thick: 0.8, mat: oxide, holes: [5, 0.95, 2.55], delay: 0.0 },
    { N: 16, thick: 0.8, mat: anodized, holes: [4, 0.62, 1.7], delay: 0.0 },
  ];
  const root = new THREE.Group(); scene.add(root);
  const list = defs.map((d) => {
    const { geo, Rp } = gearGeometry(d.N, M, d.thick, BORE, d.holes[0], d.holes[1], d.holes[2]);
    const mesh = new THREE.Mesh(geo, d.mat); mesh.castShadow = mesh.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(mesh);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, REST, 40), blackp); stand.position.y = REST / 2; stand.castShadow = stand.receiveShadow = true;
    const topY = REST + d.thick + 0.14;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(BORE - 0.07, BORE - 0.07, topY + 0.55, 40), steel); shaft.position.y = (topY + 0.55) / 2; shaft.castShadow = true;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.34, 6), steel); bolt.position.y = topY + 0.52; bolt.castShadow = true; bolt.scale.setScalar(0.001);
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 40), steel); washer.position.y = topY + 0.3; washer.castShadow = true; washer.scale.setScalar(0.001);
    root.add(stand, shaft, washer, bolt, grp);
    return { d, Rp, grp, mesh, stand, shaft, bolt, washer, y: 40, vy: 0, landed: false, bounces: 0, tLand: 0, free: 0, tilt: new THREE.Vector3(), off: new THREE.Vector2(), theta: 0, wFree: 0, popT: -1 };
  });
  /* layout (screen: x right, z down). G1 at origin, G2 lower left, G3 upper right */
  const phi2 = (252 * Math.PI) / 180, phi3 = (40 * Math.PI) / 180;
  const d12 = list[0].Rp + list[1].Rp + 0.08, d13 = list[0].Rp + list[2].Rp + 0.08;
  const pos = [[0, 0], [Math.cos(phi2) * d12, -Math.sin(phi2) * d12], [Math.cos(phi3) * d13, -Math.sin(phi3) * d13]];
  list.forEach((g, i) => {
    const [x, z] = pos[i]; g.x = x; g.z = z;
    for (const o of [g.stand, g.shaft, g.bolt, g.washer]) { o.position.x = x; o.position.z = z; }
    g.grp.position.set(x, 0, z);
    g.tilt.set((Math.random() - 0.5) * 1.1, 0, (Math.random() - 0.5) * 1.1);
    g.off.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    g.wFree = (i % 2 ? 1 : -1) * (5 + Math.random() * 3); g.theta = Math.random() * TAU;
  });
  const N1 = defs[0].N;
  const meshAngle = (g, i, th1) => {
    const phi = i === 1 ? phi2 : phi3, N2 = defs[i].N;
    return phi + Math.PI - (N1 / N2) * (th1 - phi) - Math.PI / N2;
  };

  /* impact effects */
  const rings = [];
  const ringMat = () => new THREE.MeshBasicMaterial({ color: 0xd4161c, transparent: true, opacity: 0.9, depthWrite: false, fog: false });
  function addRing(x, z, big) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), ringMat()); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z);
    root.add(m); rings.push({ m, t: 0, big });
  }
  const SPK = 48, spkPos = new Float32Array(SPK * 3), spkVel = new Float32Array(SPK * 3);
  const spkGeo = new THREE.BufferGeometry(); spkGeo.setAttribute("position", new THREE.BufferAttribute(spkPos, 3));
  const sparks = new THREE.Points(spkGeo, new THREE.PointsMaterial({ color: 0xffb08a, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sparks.frustumCulled = false; root.add(sparks);
  let spkT = 9;
  function burst(x, z, power) {
    for (let i = 0; i < SPK; i++) {
      const a = Math.random() * TAU, v = (4 + Math.random() * 9) * power;
      spkPos.set([x + Math.cos(a) * 1.2, 0.5, z + Math.sin(a) * 1.2], i * 3);
      spkVel.set([Math.cos(a) * v, 4 + Math.random() * 7 * power, Math.sin(a) * v], i * 3);
    }
    spkT = 0;
  }
  let shake = 0;

  /* framing */
  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const narrow = w < 760;
    camera.fov = narrow ? 36 : 30;
    root.position.set(narrow ? 0 : 7.5, 0, narrow ? 6 : -1.5);
    camBase.set(0, narrow ? 50 : 29, narrow ? 40 : 37);
    look.set(narrow ? 0 : 1, 0, narrow ? 4 : 1.5);
    camera.updateProjectionMatrix();
    if (still) frame(0, 0);
  }

  /* simulation */
  let T = 0, started = false, impacts = 0, px = 0, py = 0, tpx = 0, tpy = 0, w1 = 0.45, th1 = 0.35;
  const G = 62;
  function setBolt(g, k) { const s = Math.max(0.001, k); g.bolt.scale.setScalar(s); g.washer.scale.setScalar(s); }
  function land(g, i) {
    g.tLand = T; impacts++; if (i === 0) { th1 = g.theta; w1 = g.wFree; }
    shake = Math.max(shake, i === 0 ? 0.6 : i === 1 ? 0.3 : 0.2);
    g.popT = T + 0.12;
    if (i === 0 && opts.onImpact) opts.onImpact(i);
  }

  function frame(now, dt) {
    if (!still) {
      T += dt;
      const g0 = list[0];
      list.forEach((g, i) => {
        const startAt = i === 0 ? 0.35 : (list[i - 1].tLand ? list[i - 1].tLand + 0.55 : 99);
        if (!g.started && T >= startAt) { g.started = true; g.y = 26; g.vy = 0; }
        if (g.started && !g.settled) {
          g.vy -= G * dt; g.y += g.vy * dt;
          if (!g.tLand) g.theta += g.wFree * dt;
          if (g.y <= REST) {
            g.y = REST;
            if (!g.tLand) land(g, i);
            if (Math.abs(g.vy) > 4 && g.bounces < 1) { g.vy = -g.vy * 0.24; g.bounces++; } else { g.vy = 0; g.settled = true; }
          }
        }
        if (g.started) {
          const k = ease(2, 9, g.y);
          g.grp.rotation.set(g.tilt.x * k, 0, g.tilt.z * k);
          g.grp.position.set(g.x + g.off.x * k, g.y, g.z + g.off.y * k);
        } else g.grp.position.y = 80;
      });
      /* drive: gear 1 spins down to a steady turn, the others lock on and follow */
      if (g0.tLand) { th1 += w1 * dt; w1 += (0.42 - w1) * Math.min(1, dt * 1.6); g0.theta = th1; }
      [list[1], list[2]].forEach((g, k) => {
        const i = k + 1;
        if (g.tLand) {
          const tgt = meshAngle(g, i, th1), blend = ease(0, 0.4, T - g.tLand);
          g.theta = blend >= 1 ? tgt : tgt - wrap(tgt - g.theta) * (1 - blend);
        }
      });
      list.forEach((g) => {
        g.mesh.rotation.y = g.theta;
        if (g.popT > 0 && T >= g.popT) { const k = Math.min(1, (T - g.popT) / 0.3); setBolt(g, k >= 1 ? 1 : ease(0, 1, k) * 1.12); }
      });
      shake *= Math.exp(-dt * 7);
    } else {
      list.forEach((g, i) => {
        g.grp.position.set(g.x, REST, g.z); g.grp.rotation.set(0, 0, 0); setBolt(g, 1);
        g.mesh.rotation.y = i === 0 ? th1 : meshAngle(g, i, th1);
      });
    }
    /* camera: gentle pointer parallax plus impact shake */
    px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;
    const sx = (Math.random() - 0.5) * shake * 0.55, sy = (Math.random() - 0.5) * shake * 0.55;
    camera.position.set(camBase.x + px * 2.2 + sx, camBase.y - py * 1.4 + sy, camBase.z);
    camera.lookAt(look); renderer.render(scene, camera);
  }

  host.addEventListener("pointermove", (e) => { const r = host.getBoundingClientRect(); tpx = ((e.clientX - r.left) / r.width - 0.5) * 2; tpy = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  addEventListener("resize", size); size();

  if (still) { th1 = 0.35; frame(0, 0); host.classList.add("gl"); return true; }

  let on = true, raf = 0, last = performance.now(), shown = false;
  const tick = (now) => {
    raf = 0; if (!on) return;
    frame(now, Math.min(0.04, (now - last) / 1000)); last = now;
    if (!shown) { shown = true; host.classList.add("gl"); }
    raf = requestAnimationFrame(tick);
  };
  const resume = () => { if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  new IntersectionObserver((e) => { on = e[0].isIntersecting && !document.hidden; resume(); }).observe(host);
  document.addEventListener("visibilitychange", () => { on = !document.hidden; resume(); });
  raf = requestAnimationFrame(tick);
  return true;
}
