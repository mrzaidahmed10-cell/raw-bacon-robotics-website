/* Hero intro: a machined aluminum gear drops onto the stem of the "i" in "Robotics", a pinion is thrown in and meshes with it,
   a washer settles on the hub and a black-oxide socket-head bolt threads in. When the bolt seats the title reveals itself.
   Real PBR metal lit by an environment map, a key light that ramps up from near-black and casts soft shadows onto the title and the parts.
   Everything is measured in screen pixels so the assembly lands exactly on the typography.
   three.js r187 (MIT), self-hosted in ./vendor. Used on the home page only. */
import * as THREE from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const TAU = Math.PI * 2;

function gearGeometry(N, R, thick, holes) {
  const m = R / (N / 2 + 0.95), Rp = (N * m) / 2, Ro = Rp + m * 0.95, Rr = Rp - m * 1.15, h = Ro - Rr, p = TAU / N;
  const seq = [[-0.5, Rr], [-0.33, Rr], [-0.31, Rr + 0.05 * h], [-0.13, Ro], [0, Ro], [0.13, Ro], [0.31, Rr + 0.05 * h], [0.33, Rr]];
  const s = new THREE.Shape();
  let first = true;
  for (let k = 0; k < N; k++) for (const [u, r] of seq) {
    const a = (k + u) * p, x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (first) { s.moveTo(x, y); first = false; } else s.lineTo(x, y);
  }
  s.closePath();
  const bore = new THREE.Path(); bore.absarc(0, 0, R * (holes ? 0.2 : 0.2), 0, TAU, true); s.holes.push(bore);
  for (let i = 0; i < (holes === undefined ? 5 : holes); i++) {
    const a = ((i + 0.5) / 5) * TAU, c = new THREE.Path();
    c.absarc(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56, R * 0.15, 0, TAU, true); s.holes.push(c);
  }
  const b = R * 0.028;
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 24 });
  g.translate(0, 0, -(thick - 2 * b) / 2);
  return g;
}

/* surface maps for the gear: belt-sander brushing, a few scratches, and darker, dirtier teeth than the web of the gear.
   Gear UVs are the raw x/y in gear radii, so a single 0..1 tile covers x,y from -1 to 1 (see the repeat/offset below). */
function surface(renderer) {
  const S = 1024, mk = () => { const c = document.createElement("canvas"); c.width = c.height = S; return c; };
  const rc = mk(), ac = mk(), rx = rc.getContext("2d"), ax = ac.getContext("2d");
  rx.fillStyle = "#707070"; rx.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i++) {
    const v = 90 + Math.random() * 100 | 0; rx.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (0.1 + Math.random() * 0.25) + ")";
    rx.fillRect(Math.random() * S, Math.random() * S, 60 + Math.random() * 380, 1);
  }
  /* a handful of deeper scratches at slightly different angles */
  for (let i = 0; i < 26; i++) {
    rx.strokeStyle = "rgba(235,235,235," + (0.25 + Math.random() * 0.4) + ")"; rx.lineWidth = 0.6 + Math.random() * 0.8;
    const x = Math.random() * S, y = Math.random() * S, a = (Math.random() - 0.5) * 0.7, l = 80 + Math.random() * 260;
    rx.beginPath(); rx.moveTo(x, y); rx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); rx.stroke();
  }
  const g = ax.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.5);
  g.addColorStop(0, "#d9dbe0"); g.addColorStop(0.62, "#c9ccd2"); g.addColorStop(0.86, "#a9aaae"); g.addColorStop(1, "#8d8c8c");
  ax.fillStyle = g; ax.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { ax.fillStyle = "rgba(40,36,30," + Math.random() * 0.06 + ")"; ax.beginPath(); ax.arc(Math.random() * S, Math.random() * S, 2 + Math.random() * 9, 0, 6.3); ax.fill(); }
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); t.offset.set(0.5, 0.5); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { rough: tex(rc, false), albedo: tex(ac, true) };
}

const ease = {
  out3: (x) => 1 - Math.pow(1 - x, 3),
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  smooth: (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); },
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/* thin helical lines for the bolt shank, as a bump map */
function threadMap() {
  const c = document.createElement("canvas"); c.width = 8; c.height = 128; const x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 8, 128);
  for (let i = 0; i < 16; i++) { x.fillStyle = "#e0e0e0"; x.fillRect(0, i * 8, 8, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/* socket-head cap screw, head base at z=0, axis along +z. Black oxide finish. */
function boltGeometry() {
  const r = 0.22, h = 0.13, ch = 0.018;
  const pts = [[0.001, 0], [r - ch, 0], [r, ch], [r, h - 0.03], [r - 0.02, h - 0.012], [r - 0.045, h], [0.001, h]].map(([a, b]) => new THREE.Vector2(a, b));
  return new THREE.LatheGeometry(pts, 48).rotateX(Math.PI / 2).scale(1, 1, 1);
}

export function dot(host, opts) {
  const still = !!opts.still, measure = opts.measure;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  const cv = renderer.domElement; cv.setAttribute("aria-hidden", "true"); cv.className = "hero-gl"; host.appendChild(cv);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  const ENV = 0.85, KEY = 3.2;
  scene.environmentIntensity = ENV;
  const camera = new THREE.PerspectiveCamera(22, 1, 10, 20000);

  const key = new THREE.DirectionalLight(0xfff4e6, KEY);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xa9b8ff, 0.9); fill.position.set(0.8, -0.6, 0.7); scene.add(fill);
  const kStart = new THREE.Vector3(-1.0, 0.5, 0.75).normalize(), kEnd = new THREE.Vector3(-0.55, 0.85, 1).normalize(), kdir = new THREE.Vector3();

  const t0 = measure();
  let R = t0.R;
  const sf = surface(renderer);
  const al = new THREE.MeshStandardMaterial({ color: 0xe2e2e2, map: sf.albedo, metalness: 1, roughness: 0.62, roughnessMap: sf.rough, bumpMap: sf.rough, bumpScale: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd6d8dc, metalness: 1, roughness: 0.22 });
  const oxide = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 1, roughness: 0.34 });
  const thr = threadMap(); thr.repeat.set(1, 4);
  const shankMat = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 1, roughness: 0.4, bumpMap: thr, bumpScale: 1.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0x6f0a0e, metalness: 0.7, roughness: 0.45 });
  const cast = (m, r) => { m.castShadow = true; m.receiveShadow = r !== false; return m; };

  /* main gear (18 teeth) with hub, and a pinion (9 teeth, same module) that meshes with it */
  const NG = 18, NP = 9, RP = (NP / 2 + 0.95) / (NG / 2 + 0.95), DIST = (NG / 2 + NP / 2) / (NG / 2 + 0.95), PHI = 0.62;
  const spin = new THREE.Group(), tilt = new THREE.Group(), pos = new THREE.Group();
  const gearMesh = cast(new THREE.Mesh(gearGeometry(NG, 1, 0.2), al));
  const hub = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.5, 32).rotateX(Math.PI / 2), steel));
  spin.add(gearMesh, hub); tilt.add(spin); pos.add(tilt); scene.add(pos);

  const pin = new THREE.Group();
  const pinMesh = cast(new THREE.Mesh(gearGeometry(NP, RP, 0.2, 0), al));
  const pinHub = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.34, 28).rotateX(Math.PI / 2), steel));
  const pinCap = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 28).rotateX(Math.PI / 2), steel)); pinCap.position.z = 0.13;
  pin.add(pinMesh, pinHub, pinCap); pin.visible = false; scene.add(pin);

  /* washer and bolt belong to the gear's tilt group so they ride the same wobble */
  const wg = new THREE.Group(), washer = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 48).rotateX(Math.PI / 2), red));
  wg.add(washer); wg.visible = false; tilt.add(wg);
  const bg = new THREE.Group(), bolt = new THREE.Group();
  const head = cast(new THREE.Mesh(boltGeometry(), oxide));
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.004, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.2, roughness: 0.9 })); sock.position.z = 0.131;
  const shank = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 20).rotateX(Math.PI / 2), shankMat)); shank.position.z = -0.275;
  bolt.add(head, sock, shank); bg.add(bolt); bg.visible = false; tilt.add(bg);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.38 }));
  shadow.receiveShadow = true; scene.add(shadow);

  let W = 0, H = 0, dist = 0;
  const resize = () => {
    const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); camera.aspect = W / H;
    dist = H / 2 / Math.tan((camera.fov * Math.PI) / 360); camera.position.set(0, 0, dist); camera.near = dist * 0.2; camera.far = dist * 4; camera.updateProjectionMatrix();
  };
  resize();

  /* timeline, seconds after the first impact of the gear */
  const T = { pin: 0.6, pinDur: 0.46, wash: 1.22, washDur: 0.26, bolt: 1.62, approach: 0.34, thread: 0.46, snug: 0.14 };
  T.end = T.bolt + T.approach + T.thread + T.snug;
  const ZW = 0.1375, ZB0 = 0.62, PITCH = 0.1;

  /* state in DOM pixel space (y down) */
  const S = { x: 0, y: 0, vy: 0, th: 0.4, w: 0, tx: 0, ty: 0, wx: 0, wy: 0, wvx: 0, wvy: 0, bounces: 0, phase: "wait", t: 0, tHit: null, fin: false, px: 0, py: 0, cx: 0, cy: 0, hit: false, stem: false, locked: false, complete: false, off: 0, lockT: 0, pinFree: 0 };
  let start = null, raf = 0, live = true, last = 0, dead = false;
  const tgt = () => { const m = measure(); R = m.R; return m; };
  const g = () => 2.6 * H;

  /* parts: positions follow the gear; rel is the time since its first impact (or +Infinity when finished) */
  const parts = (rel, dt) => {
    const gx = S.x - W / 2, gy = H / 2 - S.y;
    const wrap = (a) => a - TAU * Math.round(a / TAU);
    const rp = TAU / NP;
    /* pinion */
    if (rel < T.pin) pin.visible = false;
    else {
      pin.visible = true;
      const q = clamp01((rel - T.pin) / T.pinDur), tau = Math.min(20, Math.max(0, rel - T.pin - T.pinDur));
      let d, ang = PHI;
      if (q < 1) { d = DIST + (4.2 - DIST) * (1 - q * q); ang = PHI + 0.55 * (1 - q) * (1 - q); }
      else d = DIST + 0.07 * Math.exp(-9 * tau) * Math.abs(Math.sin(TAU * 3.3 * tau));
      const th = Math.PI + PHI * (1 + NG / NP) - S.th * (NG / NP) - 0.5 * rp;
      if (q < 1) { S.pinFree = -11 * (rel - T.pin) - 0.3; pin.userData.free = S.pinFree; pin.rotation.z = S.pinFree; S.off = wrap(S.pinFree - th); }
      else {
        if (!S.locked) { S.locked = true; S.wvx += 0.7; S.wvy -= 0.5; S.w += 0.9; }
        S.off *= Math.exp(-dt / 0.09); S.off = Math.abs(S.off) < 1e-4 ? 0 : S.off;
        pin.rotation.z = th + S.off;
      }
      pin.position.set(gx + Math.cos(ang) * d * R, gy + Math.sin(ang) * d * R, 0); pin.scale.setScalar(R);
    }
    /* washer: dropped on the hub, rocks like a coin as it settles */
    if (rel < T.wash) wg.visible = false;
    else {
      wg.visible = true;
      const q = clamp01((rel - T.wash) / T.washDur), tau = Math.min(20, Math.max(0, rel - T.wash - T.washDur));
      washer.position.z = ZW - 0.0175 + 0.7 * (1 - q) * (1 - q);
      const a = q < 1 ? 0.5 * (1 - q) + 0.12 : 0.12 * Math.exp(-6 * tau), w = (14 + 38 * tau) * tau + q * 3;
      wg.rotation.set(a * Math.cos(w), a * Math.sin(w), 0);
      washer.rotation.z = S.th;
    }
    /* bolt: swings in from above-left, lines up with the axis, threads down and snugs up */
    if (rel < T.bolt) bg.visible = false;
    else {
      bg.visible = true;
      const r2 = rel - T.bolt, qa = clamp01(r2 / T.approach), qt = clamp01((r2 - T.approach) / T.thread), qs = clamp01((r2 - T.approach - T.thread) / T.snug);
      const e = ease.out3(qa);
      bg.position.set(-1.9 * (1 - e), 1.6 * (1 - e), 0);
      bolt.rotation.x = 0.95 * (1 - e); bolt.rotation.y = -0.4 * (1 - e);
      bolt.position.z = qa < 1 ? ZB0 + 0.12 * (1 - e) : ZB0 + (ZW - ZB0) * ease.out3(qt);
      const turns = qa < 1 ? 3 * qa : 3 + ((ZB0 - ZW) / PITCH) * ease.out3(qt);
      bolt.rotation.z = -(TAU * turns) - 0.5 * ease.out3(qs) + S.th * ease.out3(qt);
      shank.visible = qt < 1;
      const nudge = ease.out3(qs) * (1 - qs);
      gearMesh.position.z = -0.014 * nudge;
    }
    if (!S.complete && rel >= T.end) { S.complete = true; opts.onComplete && opts.onComplete(); }
  };

  const apply = (dt, rel) => {
    R = tgt().R;
    pos.position.set(S.x - W / 2, H / 2 - S.y, 0);
    pos.scale.setScalar(R);
    tilt.rotation.set(S.tx + S.wx + S.cy * 0.12, S.ty + S.wy + S.cx * 0.12, 0);
    spin.rotation.z = S.th;
    parts(rel, dt || 0.016);
    /* lights come up out of near-black and swing from a low, raking angle to the final key position */
    const k = rel === Infinity ? 1 : ease.smooth(0.05, 2.6, S.t);
    key.intensity = KEY * (0.1 + 0.9 * k); scene.environmentIntensity = ENV * (0.2 + 0.8 * k); fill.intensity = 0.9 * (0.15 + 0.85 * k);
    kdir.lerpVectors(kStart, kEnd, k).normalize();
    const gp = pos.position;
    key.position.copy(gp).addScaledVector(kdir, R * 40); key.target.position.copy(gp); key.target.updateMatrixWorld();
    const c = key.shadow.camera, e = R * 3.4; c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = R * 5; c.far = R * 80; c.updateProjectionMatrix();
    shadow.position.set(gp.x, gp.y, -R * 0.13); shadow.scale.setScalar(R * 8);
    renderer.render(scene, camera);
  };
  const rest = () => { const m = tgt(); return { x: m.x, y: m.stemY - m.R }; };
  const settle = () => { const r = rest(); S.x = r.x; S.y = r.y; S.vy = 0; S.tx = S.ty = S.wx = S.wy = 0; S.phase = "rest"; };
  const done = () => { settle(); S.th = 0.5; S.hit = true; S.locked = true; S.off = 0; };

  if (still) { done(); S.t = 99; apply(0, Infinity); S.complete = true; return { finish() {}, dispose() { dead = true; } }; }

  const kick = (power) => {
    S.wvx += (Math.random() < 0.5 ? -1 : 1) * 2.4 * power; S.wvy += (Math.random() < 0.5 ? -1 : 1) * 2.0 * power;
  };
  const frame = (now) => {
    raf = 0; if (dead) return;
    if (!live) { last = 0; return; }
    if (start === null) start = now;
    const dt = last ? Math.min(0.033, (now - last) / 1000) : 0; last = now; S.t += dt;
    const r = rest(), y0 = -R * 3, G = g();
    if (S.phase === "wait") {
      S.x = r.x - W * 0.14; S.y = y0;
      if (S.t > 0.25) { S.phase = "fall"; S.sx = S.x; S.y0 = S.y; S.tFall = S.t; S.tImp = Math.sqrt((2 * (r.y - y0)) / G); }
    }
    if (S.phase === "fall" || S.phase === "bounce") {
      if (!S.stem && S.phase === "fall" && S.t - S.tFall > S.tImp - 0.5) { S.stem = true; opts.onStem && opts.onStem(); }
      S.vy += G * dt; S.y += S.vy * dt;
      if (S.phase === "fall") {
        const q = Math.min(1, Math.max(0, (S.y - S.y0) / Math.max(1, r.y - S.y0)));
        S.x = r.x + (S.sx - r.x) * (1 - q);
        const k = (1 - q) * (1 - q);
        S.tx = 1.15 * k; S.ty = -0.85 * k;
        S.w = 9.5;
      } else S.x = r.x;
      if (S.y >= r.y) {
        S.y = r.y;
        const speed = S.vy;
        if (!S.hit) { S.hit = true; S.tHit = S.t; S.tx = S.ty = 0; opts.onHit && opts.onHit(); }
        S.phase = "bounce"; S.bounces++;
        S.vy = -speed * 0.22; kick(Math.min(1, speed / (1.2 * H)));
        if (Math.abs(S.vy) < 0.05 * H || S.bounces >= 3) { S.vy = 0; S.phase = "rest"; }
      }
    }
    /* contact wobble: damped spring, and spin easing down to a slow idle */
    const kx = 160, c = 8.5;
    S.wvx += (-kx * S.wx - c * S.wvx) * dt; S.wx += S.wvx * dt;
    S.wvy += (-kx * S.wy - c * S.wvy) * dt; S.wy += S.wvy * dt;
    if (S.phase !== "fall") S.w += (0.5 - S.w) * Math.min(1, dt / 0.9);
    S.th += S.w * dt;
    if (S.phase !== "fall") { S.cx += (S.px - S.cx) * Math.min(1, dt * 2.2); S.cy += (S.py - S.cy) * Math.min(1, dt * 2.2); }
    if (S.phase === "rest" && !S.done) { S.done = true; opts.onSettled && opts.onSettled(); }
    apply(dt, S.fin ? Infinity : S.tHit === null ? -1 : S.t - S.tHit);
    raf = requestAnimationFrame(frame);
  };
  const go = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver((es) => { live = es[0].isIntersecting; if (live) go(); });
  io.observe(host);
  if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", (e) => { S.px = (e.clientX / innerWidth - 0.5) * 2; S.py = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  new ResizeObserver(() => { resize(); if (S.phase === "rest" && S.complete) { settle(); apply(0, Infinity); } }).observe(host);
  go();
  return {
    finish() {
      done(); S.done = true; if (!S.stem) { S.stem = true; opts.onStem && opts.onStem(); }
      S.fin = true; S.w = 0.5; apply(0, Infinity); S.complete = true; opts.onComplete && opts.onComplete();
    },
    dispose() { dead = true; cancelAnimationFrame(raf); io.disconnect(); renderer.dispose(); },
  };
}
