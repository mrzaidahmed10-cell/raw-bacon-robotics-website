(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Hero intro */
  var hero = document.querySelector(".hero");
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("is-go"); }); });

  /* Rail pin snaps to a hole as you scroll */
  var pin = document.querySelector(".rail-pin");
  if (pin) {
    var ticking = false;
    var upd = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? scrollY / max : 0;
      var rows = Math.max(1, Math.floor(innerHeight / 44) - 1);
      pin.style.setProperty("--row", Math.round(p * rows));
    };
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener("resize", upd);
    upd();
  }

  /* Reveal on scroll */
  var targets = document.querySelectorAll("[data-tele]:not(.hero h1 *), .bars, .board");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("is-in"); });
  }

  /* Count-up numbers */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length;
    var show = function (v) { el.textContent = v.toFixed(dec); };
    if (reduce || !("IntersectionObserver" in window)) { show(end); return; }
    show(0);
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function f(n) { var k = Math.min(1, (n - t0) / dur); show(end * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(f); })(t0);
    }, { threshold: 0.4 }).observe(el);
  });

  /* Odometer countdown to the next match */
  var odo = document.getElementById("odo");
  if (odo) {
    var events = JSON.parse(odo.dataset.events);
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var next = null;
    events.forEach(function (e) { var d = new Date(e.date + "T00:00:00"); e.d = d; if (!next && d >= today) next = e; });
    var title = document.getElementById("next-title"), sub = document.getElementById("next-sub"), unit = document.getElementById("odo-unit");
    if (!next) {
      odo.closest(".count").hidden = true;
      if (title) title.textContent = "Season results are in";
      if (sub) sub.textContent = "Next season's schedule will be posted here.";
    } else {
      var days = Math.round((next.d - today) / 864e5);
      var digits = String(days).padStart(2, "0").split("");
      odo.textContent = "";
      digits.forEach(function (dg, i) {
        var col = document.createElement("span"), strip = document.createElement("span");
        col.className = "odo-col"; strip.className = "odo-strip";
        for (var k = 0; k <= 9; k++) { var s = document.createElement("span"); s.textContent = k; strip.appendChild(s); }
        strip.style.setProperty("--d", reduce ? dg : 0);
        col.appendChild(strip); odo.appendChild(col);
        if (!reduce) setTimeout(function () { strip.style.transitionDelay = i * 0.12 + "s"; strip.style.setProperty("--d", dg); }, 900);
      });
      odo.setAttribute("role", "img");
      odo.setAttribute("aria-label", days + (days === 1 ? " day" : " days"));
      if (unit) unit.textContent = days === 1 ? "day" : "days";
      if (days === 0) { if (unit) unit.textContent = "Today"; }
      if (title) title.textContent = next.name;
      if (sub) sub.textContent = next.label;
    }
  }

  /* Hotspots on the photo */
  var hs = document.querySelectorAll(".hs");
  hs.forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = b.getAttribute("aria-expanded") === "true";
      hs.forEach(function (o) { o.setAttribute("aria-expanded", "false"); });
      b.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });
  document.addEventListener("click", function () { hs.forEach(function (o) { o.setAttribute("aria-expanded", "false"); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hs.forEach(function (o) { o.setAttribute("aria-expanded", "false"); }); });
})();
