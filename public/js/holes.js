/* Hero: a field of holes like the robot's aluminum channel.
   A scan sweeps across on load, then holes swell and turn yellow near the pointer. */
(function () {
  var hero = document.querySelector(".hero");
  if (!hero) return;
  var cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  hero.prepend(cv);
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GAP = 30, W, H, dpr, cols, rows, px = -999, py = -999, tx = -999, ty = -999, t0 = performance.now(), raf = 0, running = true;
  var HOLE = "#c6cbd2", YEL = "#f5c400";

  function size() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / GAP) + 1; rows = Math.ceil(H / GAP) + 1;
    draw(performance.now());
  }

  function draw(now) {
    var el = (now - t0) / 1000;
    var scan = reduce ? 99 : el * 1500 - 200;       // x position of the scan line
    px += (tx - px) * 0.18; py += (ty - py) * 0.18;
    ctx.clearRect(0, 0, W, H);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = 15 + i * GAP, y = 15 + j * GAP;
        var d = Math.hypot(x - px, y - py);
        var near = Math.max(0, 1 - d / 150);
        var s = Math.abs(x - scan);
        var flash = s < 90 ? 1 - s / 90 : 0;
        var r = 2.4 + near * near * 5.5 + flash * 3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        ctx.fillStyle = (near > 0.35 || flash > 0.2) ? YEL : HOLE;
        ctx.globalAlpha = (near > 0.35 || flash > 0.2) ? Math.min(1, 0.45 + near + flash) : 1;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    draw(now);
    var settled = (now - t0) > 1800 && Math.abs(tx - px) < 0.5 && Math.abs(ty - py) < 0.5;
    raf = settled || !running ? 0 : requestAnimationFrame(loop);
  }
  function kick() { if (!raf && running) raf = requestAnimationFrame(loop); }

  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top;
    if (px < -900) { px = tx; py = ty; }
    kick();
  });
  hero.addEventListener("pointerleave", function () { tx = -999; ty = -999; px = -999; py = -999; kick(); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { running = en[0].isIntersecting; if (running) kick(); }).observe(hero);
  }
  window.addEventListener("resize", size);
  size();
  if (!reduce) kick();
})();
