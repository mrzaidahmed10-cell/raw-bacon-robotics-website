/* Hero intro: one machined aluminum gear drops in, bounces on the stem of the "i" in "Robotics" and stays there as its dot.
   Real PBR metal lit by an environment map, a key light that casts a soft shadow onto the title, damped bounces.
   Everything is measured in screen pixels so the gear lands exactly on the typography.
   three.js r187 (MIT), self-hosted in ./vendor. Used on the home page only. */
import * as THREE from "./vendor/three.module.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const TAU = Math.PI * 2;

function gearGeometry(N, R, thick) {
  const m = R / (N / 2 + 0.95), Rp = (N * m) / 2, Ro = Rp + m * 0.95, Rr = Rp - m * 1.15, h = Ro - Rr, p = TAU / N;
  const seq = [[-0.5, Rr], [-0.33, Rr], [-0.31, Rr + 0.05 * h], [-0.13, Ro], [0, Ro], [0.13, Ro], [0.31, Rr + 0.05 * h], [0.33, Rr]];
  const s = new THREE.Shape();
  let first = true;
  for (let k = 0; k < N; k++) for (const [u, r] of seq) {
    const a = (k + u) * p, x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (first) { s.moveTo(x, y); first = false; } else s.lineTo(x, y);
  }
  s.closePath();
  const bore = new THREE.Path(); bore.absarc(0, 0, R * 0.2, 0, TAU, true); s.holes.push(bore);
  for (let i = 0; i < 5; i++) {
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
  scene.environmentIntensity = 0.85;
  const camera = new THREE.PerspectiveCamera(22, 1, 10, 20000);

  const key = new THREE.DirectionalLight(0xfff4e6, 3.2);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8; key.shadow.blurSamples = 16; key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xa9b8ff, 0.9); fill.position.set(0.8, -0.6, 0.7); scene.add(fill);
  const kdir = new THREE.Vector3(-0.55, 0.85, 1).normalize();

  const t0 = measure();
  let R = t0.R;
  const THICK = () => R * 0.2;
  const sf = surface(renderer);
  const al = new THREE.MeshStandardMaterial({ color: 0xe2e2e2, map: sf.albedo, metalness: 1, roughness: 0.62, roughnessMap: sf.rough, bumpMap: sf.rough, bumpScale: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd6d8dc, metalness: 1, roughness: 0.22 });
  const red = new THREE.MeshStandardMaterial({ color: 0x6f0a0e, metalness: 0.7, roughness: 0.45 });
  const spin = new THREE.Group(), tilt = new THREE.Group(), pos = new THREE.Group();
  const gearMesh = new THREE.Mesh(gearGeometry(18, 1, 0.2), al);
  gearMesh.castShadow = true; gearMesh.receiveShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.5, 32).rotateX(Math.PI / 2), steel); hub.castShadow = true;
  const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 40).rotateX(Math.PI / 2), red); washer.position.z = 0.12; washer.castShadow = true;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.09, 6).rotateX(Math.PI / 2), steel); bolt.position.z = 0.185; bolt.castShadow = true;
  spin.add(gearMesh, hub, washer, bolt); tilt.add(spin); pos.add(tilt); scene.add(pos);
  /* unit gear is scaled to R; the soft contact shadow lands on a plane just behind it */
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.38 }));
  shadow.receiveShadow = true; scene.add(shadow);

  let W = 0, H = 0, dist = 0;
  const resize = () => {
    const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); camera.aspect = W / H;
    dist = H / 2 / Math.tan((camera.fov * Math.PI) / 360); camera.position.set(0, 0, dist); camera.near = dist * 0.2; camera.far = dist * 4; camera.updateProjectionMatrix();
  };
  resize();

  /* state in DOM pixel space (y down) */
  const S = { x: 0, y: 0, vy: 0, th: 0.4, w: 0, tx: 0, ty: 0, wx: 0, wy: 0, wvx: 0, wvy: 0, bounces: 0, phase: "wait", t: 0, tHit: 0, px: 0, py: 0, cx: 0, cy: 0, hit: false, stem: false };
  let start = null, raf = 0, live = true, last = 0, dead = false;
  const tgt = () => { const m = measure(); R = m.R; return m; };
  const g = () => 2.6 * H;
  const apply = () => {
    R = tgt().R;
    pos.position.set(S.x - W / 2, H / 2 - S.y, 0);
    pos.scale.setScalar(R);
    tilt.rotation.set(S.tx + S.wx + S.cy * 0.12, S.ty + S.wy + S.cx * 0.12, 0);
    spin.rotation.z = S.th;
    const gp = pos.position;
    key.position.copy(gp).addScaledVector(kdir, R * 40); key.target.position.copy(gp); key.target.updateMatrixWorld();
    const c = key.shadow.camera, e = R * 3; c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = R * 5; c.far = R * 80; c.updateProjectionMatrix();
    shadow.position.set(gp.x, gp.y, -R * 0.13); shadow.scale.setScalar(R * 8);
    renderer.render(scene, camera);
  };
  const rest = () => { const m = tgt(); return { x: m.x, y: m.stemY - m.R }; };
  const settle = () => { const r = rest(); S.x = r.x; S.y = r.y; S.vy = 0; S.tx = S.ty = S.wx = S.wy = 0; S.phase = "rest"; };

  if (still) { settle(); S.th = 0.5; if (!S.hit) { S.hit = true; } apply(); return { finish() {}, dispose() { dead = true; } }; }

  const kick = (power) => {
    S.wvx += (Math.random() < 0.5 ? -1 : 1) * 2.4 * power; S.wvy += (Math.random() < 0.5 ? -1 : 1) * 2.0 * power;
  };
  const frame = (now) => {
    raf = 0; if (dead) return;
    if (!live) { last = 0; return; }
    if (start === null) start = now;
    const dt = last ? Math.min(0.033, (now - last) / 1000) : 0; last = now; S.t = (now - start) / 1000;
    const r = rest(), y0 = -R * 3, G = g();
    if (S.phase === "wait") {
      S.x = r.x - W * 0.14; S.y = y0;
      if (S.t > 0.2) { S.phase = "fall"; S.sx = S.x; S.y0 = S.y; S.tFall = S.t; S.tImp = Math.sqrt((2 * (r.y - y0)) / G); }
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
        S.vy = -speed * 0.34; kick(Math.min(1, speed / (1.2 * H)));
        if (Math.abs(S.vy) < 0.05 * H || S.bounces >= 4) { S.vy = 0; S.phase = "rest"; }
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
    apply();
    raf = requestAnimationFrame(frame);
  };
  const go = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
  const io = new IntersectionObserver((es) => { live = es[0].isIntersecting; if (live) go(); });
  io.observe(host);
  if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", (e) => { S.px = (e.clientX / innerWidth - 0.5) * 2; S.py = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  new ResizeObserver(() => { resize(); if (S.phase === "rest") settle(); }).observe(host);
  go();
  return {
    finish() { if (!S.hit) { S.hit = true; opts.onStem && !S.stem && opts.onStem(); opts.onHit && opts.onHit(); } settle(); S.w = 0.5; S.done = true; },
    dispose() { dead = true; cancelAnimationFrame(raf); io.disconnect(); renderer.dispose(); },
  };
}
