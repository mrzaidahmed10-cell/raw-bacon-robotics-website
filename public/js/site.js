(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Header: hides on the way down, returns on the way up */
  var hdr = document.querySelector(".site-header"), lastY = 0;
  var menu = document.querySelector(".menu"), nav = document.querySelector(".nav");
  if (menu && nav) {
    menu.addEventListener("click", function () { var o = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", o); });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") nav.classList.remove("open"); });
  }

  /* Split headings into words for the mask-rise */
  $("[data-split]").forEach(function (h) {
    var k = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"), i = document.createElement("span");
            w.className = "w"; i.className = "wi"; i.style.setProperty("--k", k++); i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(h);
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    $(".w", h).forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
  });

  /* Stagger children */
  $("[data-stagger]").forEach(function (p) { Array.prototype.forEach.call(p.children, function (c, i) { c.style.setProperty("--i", i); c.setAttribute("data-r", p.getAttribute("data-stagger") || "rise"); }); });
  $(".board").forEach(function (b) { Array.prototype.forEach.call(b.children, function (c, i) { c.style.setProperty("--i", i); c.setAttribute("data-r", "slide"); }); });

  /* Reveal on scroll */
  var hero = document.querySelector(".hero");
  var revealEls = $("[data-split],[data-r],.rule,.donut-wrap,.timeline li").filter(function (e) { return !(hero && hero.contains(e) && e.hasAttribute("data-split")); });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (e) { io.observe(e); });
  } else revealEls.forEach(function (e) { e.classList.add("is-in"); });

  /* Hero intro */
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("is-go"); }); });

  /* Scroll-linked work: rail pin, header, timeline line, stacked cards */
  var pin = document.querySelector(".rail-pin"), tl = document.querySelector(".timeline"), cards = $(".card");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    if (pin) pin.style.setProperty("--row", Math.round((max > 0 ? y / max : 0) * Math.max(1, Math.floor(innerHeight / 44) - 1)));
    if (hdr) {
      hdr.classList.toggle("is-scrolled", y > 8);
      hdr.classList.toggle("is-hidden", y > lastY + 6 && y > 300 && !(nav && nav.classList.contains("open")));
      if (y < lastY - 4 || y < 300) hdr.classList.remove("is-hidden");
    }
    lastY = y;
    if (tl && !reduce) {
      var r = tl.getBoundingClientRect();
      tl.style.setProperty("--p", Math.max(0, Math.min(1, (innerHeight * 0.65 - r.top) / r.height)).toFixed(3));
    }
    if (cards.length && !reduce && innerWidth >= 832) {
      cards.forEach(function (c, i) {
        var nx = cards[i + 1]; var s = 1;
        if (nx) { var a = c.getBoundingClientRect(), b = nx.getBoundingClientRect(); s = 1 - 0.05 * Math.max(0, Math.min(1, 1 - (b.top - a.top) / a.height)); }
        c.style.setProperty("--sc", s.toFixed(3));
      });
    }
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  cards.forEach(function (c, i) { c.style.setProperty("--n", i); });
  onScroll();

  /* Count-up */
  $("[data-count]").forEach(function (el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length;
    var show = function (v) { el.textContent = v.toFixed(dec); };
    if (reduce || !("IntersectionObserver" in window)) { show(end); return; }
    show(0);
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1600;
      (function f(n) { var k = Math.min(1, (n - t0) / dur); show(end * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(f); })(t0);
    }, { threshold: 0.4 }).observe(el);
  });

  /* Odometer countdown */
  var odo = document.getElementById("odo");
  if (odo) {
    var events = JSON.parse(odo.dataset.events), now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), next = null;
    events.forEach(function (e) { e.d = new Date(e.date + "T00:00:00"); if (!next && e.d >= today) next = e; });
    var title = document.getElementById("next-title"), sub = document.getElementById("next-sub"), unit = document.getElementById("odo-unit");
    if (!next) {
      odo.closest(".count").hidden = true;
      if (title) title.textContent = "Season complete";
      if (sub) sub.textContent = "The next schedule will be posted here.";
    } else {
      var days = Math.round((next.d - today) / 864e5), digits = String(days).padStart(2, "0").split("");
      odo.textContent = "";
      digits.forEach(function (dg, i) {
        var col = document.createElement("span"), strip = document.createElement("span");
        col.className = "odo-col"; strip.className = "odo-strip";
        for (var k = 0; k <= 9; k++) { var s = document.createElement("span"); s.textContent = k; strip.appendChild(s); }
        strip.style.setProperty("--d", reduce ? dg : 0); col.appendChild(strip); odo.appendChild(col);
        if (!reduce) new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { o.disconnect(); setTimeout(function () { strip.style.transitionDelay = i * 0.15 + "s"; strip.style.setProperty("--d", dg); }, 200); } }, { threshold: 0.5 }).observe(odo);
      });
      odo.setAttribute("role", "img"); odo.setAttribute("aria-label", days + (days === 1 ? " day" : " days"));
      if (unit) unit.textContent = days === 0 ? "today" : days === 1 ? "day" : "days";
      if (title) title.textContent = next.name;
      if (sub) sub.textContent = next.label;
    }
  }

  if (!reduce) {
    /* Photo tilt with a moving sheen */
    $(".mount").forEach(function (m) {
      var shot = m.querySelector(".shot");
      m.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        m.classList.add("is-live");
        m.style.setProperty("--ry", ((x - 0.5) * 9).toFixed(2) + "deg"); m.style.setProperty("--rx", ((0.5 - y) * 7).toFixed(2) + "deg");
        shot.style.setProperty("--sx", x * 100 + "%"); shot.style.setProperty("--sy", y * 100 + "%"); shot.style.setProperty("--so", 1);
      });
      m.addEventListener("pointerleave", function () { m.style.setProperty("--ry", "0deg"); m.style.setProperty("--rx", "0deg"); shot.style.setProperty("--so", 0); });
    });
    /* Cursor spotlight on cards */
    $(".spot").forEach(function (c) {
      c.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); });
    });
    /* Magnetic buttons */
    if (matchMedia("(hover: hover)").matches) $(".actions .btn, .sponsor-big .btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.12).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.2).toFixed(1) + "px)"; });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* 3D scenes: only with WebGL, motion allowed, and after the page has settled */
  function gl() { try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
  var want = { hero: hero && hero.hasAttribute("data-gl"), viewer: document.getElementById("wheel") };
  if (!reduce && (want.hero || want.viewer) && gl()) {
    var go = function () {
      import("./scenes.js").then(function (m) {
        if (want.hero && m.field(hero)) hero.classList.add("gl");
        if (want.viewer) m.wheel(want.viewer);
      }).catch(function () {});
    };
    if (document.readyState === "complete") setTimeout(go, 150); else addEventListener("load", function () { setTimeout(go, 150); });
  }
})();
