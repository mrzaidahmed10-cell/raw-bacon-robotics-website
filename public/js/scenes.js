/* Two small three.js scenes, loaded only when WebGL is available and motion is allowed.
   field(): a bed of pins on the hero that rises and turns red around the pointer.
   wheel(): a mecanum wheel you can drag. */
import * as THREE from "./vendor/three.module.js";

const RED = new THREE.Color("#d4161c");
const PIN = new THREE.Color("#e7e7ea");

function makeRenderer(host) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  r.domElement.setAttribute("aria-hidden", "true");
  host.prepend(r.domElement);
  return r;
}

function visibleLoop(host, frame) {
  let on = true, raf = 0, last = performance.now();
  const tick = (now) => { raf = 0; if (!on) return; frame(now, Math.min(0.05, (now - last) / 1000)); last = now; raf = requestAnimationFrame(tick); };
  new IntersectionObserver((e) => { on = e[0].isIntersecting; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }).observe(host);
  document.addEventListener("visibilitychange", () => { on = !document.hidden; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
  raf = requestAnimationFrame(tick);
}

export function field(host) {
  const renderer = makeRenderer(host);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-6, 10, 8); scene.add(sun);

  const GAP = 0.8, COLS = 84, ROWS = 48;
  const geo = new THREE.CylinderGeometry(0.15, 0.15, 1, 16); geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, COLS * ROWS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, PIN);
  scene.add(mesh);

  const px = new Float32Array(COLS * ROWS), pz = new Float32Array(COLS * ROWS);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { const k = j * COLS + i; px[k] = (i - COLS / 2) * GAP; pz[k] = (j - ROWS * 0.72) * GAP; }

  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const ndc = new THREE.Vector2(); let tx = 999, tz = 999, cx = 999, cz = 999, has = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const t0 = performance.now();

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 700;
    camera.position.set(0, narrow ? 17 : 14.5, narrow ? 19 : 15);
    camera.lookAt(0, 0, -3);
    camera.updateProjectionMatrix();
  }
  size(); addEventListener("resize", size);

  host.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) { tx = hit.x; tz = hit.z; if (!has) { cx = tx; cz = tz; has = true; } }
  });
  host.addEventListener("pointerleave", () => { tx = tz = 999; });

  visibleLoop(host, (now) => {
    const t = (now - t0) / 1000;
    cx += (tx - cx) * 0.14; cz += (tz - cz) * 0.14;
    const scan = -34 + t * 22;                                  // one sweep across on load
    for (let k = 0; k < COLS * ROWS; k++) {
      const x = px[k], z = pz[k];
      const d = Math.hypot(x - cx, z - cz);
      const near = Math.max(0, 1 - d / 4.2);
      const s = Math.abs(x - scan);
      const sweep = t < 4 && s < 3 ? (1 - s / 3) : 0;
      const idle = 0.07 + 0.05 * Math.sin(x * 0.45 + t * 0.9) * Math.cos(z * 0.4 + t * 0.7);
      const h = idle + near * near * 1.8 + sweep * 1.2;
      pos.set(x, 0, z); sc.set(1 + near * 0.5, h, 1 + near * 0.5);
      m.compose(pos, q, sc); mesh.setMatrixAt(k, m);
      const red = Math.min(1, near * 1.6 + sweep);
      col.copy(PIN).lerp(RED, red); mesh.setColorAt(k, col);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
  });
  return true;
}

export function wheel(host) {
  const renderer = makeRenderer(host);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(4, 5, 6); scene.add(key);
  const rim = new THREE.PointLight(0xd4161c, 70, 30); rim.position.set(-5, -2, 3); scene.add(rim);

  const g = new THREE.Group(); scene.add(g);
  const red = new THREE.MeshStandardMaterial({ color: 0xd4161c, roughness: 0.45, metalness: 0.2 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x34343a, roughness: 0.55, metalness: 0.05 });

  const R = 1.25, N = 10;
  for (const z of [-0.42, 0.42]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 48), red);
    plate.rotation.x = Math.PI / 2; plate.position.z = z; g.add(plate);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 12, 48), white); ring.position.z = z + Math.sign(z) * 0.06; g.add(ring);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 20), black);
      hole.rotation.x = Math.PI / 2; hole.position.set(Math.cos(a) * 0.82, Math.sin(a) * 0.82, z + Math.sign(z) * 0.005); g.add(hole);
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 28), white); hub.rotation.x = Math.PI / 2; g.add(hub);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.06, 20), black); bore.rotation.x = Math.PI / 2; g.add(bore);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const slot = new THREE.Group(); slot.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); slot.rotation.z = a;
    const roller = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 8, 20), black); roller.rotation.x = Math.PI / 4;
    slot.add(roller); g.add(slot);
  }

  let ry = -0.85, rx = 0.22, vy = 0.004, drag = false, lx = 0, ly = 0;
  function size() {
    const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.position.z = w / h < 0.9 ? 10 : 7.2; camera.updateProjectionMatrix();
  }
  size(); addEventListener("resize", size);
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", (e) => { if (!drag) return; vy = (e.clientX - lx) * 0.006; ry += vy; rx = Math.max(-0.9, Math.min(0.9, rx + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; });
  const end = () => { drag = false; }; cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

  visibleLoop(host, (now, dt) => {
    if (!drag) { vy += (0.004 - vy) * 0.02; ry += vy; rx += (0.22 - rx) * 0.02; }
    g.rotation.y = ry; g.rotation.x = rx;
    g.children.forEach(() => {});
    renderer.render(scene, camera);
  });
  return true;
}
