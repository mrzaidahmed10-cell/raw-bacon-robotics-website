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

  /* Reveal on scroll */
  var hero = document.querySelector(".hero");
  var revealEls = $("[data-split],[data-r],.rule,.donut-wrap,.timeline li").filter(function (e) { return !(hero && hero.contains(e)); });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (e) { io.observe(e); });
  } else revealEls.forEach(function (e) { e.classList.add("is-in"); });

  /* Hero intro */
  var heroGo = function () { if (!hero || hero.classList.contains("is-go")) return; hero.classList.add("is-go"); };
  if (hero && !hero.hasAttribute("data-gears")) requestAnimationFrame(function () { requestAnimationFrame(heroGo); });

  /* Scroll-linked work: rail pin, header, timeline line, stacked cards */
  var pin = document.querySelector(".rail-pin"), tl = document.querySelector(".timeline"); 
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
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
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
    var played = events.filter(function (e) { return e.d < today; }).length, pe = document.getElementById("ev-played"), le = document.getElementById("ev-left");
    if (pe) pe.textContent = played; if (le) le.textContent = events.length - played;
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

  /* Hero: gears drop onto the plate. Headline arrives with the first impact. */
  function gl() { try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
  if (hero && hero.hasAttribute("data-gears")) {
    var safety = setTimeout(heroGo, reduce ? 0 : 4200);
    if (!gl()) { heroGo(); }
    else {
      var go = function () {
        import("./scenes.js").then(function (m) {
          m.gears(hero, { still: reduce, onImpact: function () { clearTimeout(safety); heroGo(); } });
          if (reduce) heroGo();
        }).catch(function () { heroGo(); });
      };
      go();
    }
  }

  /* Robot page: leader lines from the labels to the parts on the photo */
  var diagram = document.querySelector(".diagram");
  if (diagram) {
    var svg = diagram.querySelector(".leaders"), fig = diagram.querySelector(".dphoto"), img = fig.querySelector("img");
    var NS = "http://www.w3.org/2000/svg";
    var draw = function () {
      svg.textContent = "";
      if (innerWidth < 832) return;
      var dr = diagram.getBoundingClientRect(), ir = img.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + dr.width + " " + dr.height);
      $(".part", diagram).forEach(function (p, i) {
        var lr = p.getBoundingClientRect(), left = p.classList.contains("l");
        var x1 = (left ? lr.right + 10 : lr.left - 10) - dr.left, y1 = lr.top + 18 - dr.top;
        var x2 = ir.left - dr.left + ir.width * parseFloat(p.dataset.x) / 100, y2 = ir.top - dr.top + ir.height * parseFloat(p.dataset.y) / 100;
        var mx = x1 + (left ? 28 : -28);
        var d = "M" + x1 + " " + y1 + " H" + mx + " L" + x2 + " " + y2;
        ["under", "over"].forEach(function (c) {
          var path = document.createElementNS(NS, "path"); path.setAttribute("d", d); path.setAttribute("class", "ld " + c);
          path.style.setProperty("--i", i); svg.appendChild(path);
          var len = path.getTotalLength(); path.style.setProperty("--len", len);
        });
      });
      if (diagram.classList.contains("is-in")) svg.classList.add("on");
    };
    var ready = function () { draw(); };
    if (img.complete) ready(); else img.addEventListener("load", ready);
    addEventListener("resize", draw);
    if ("IntersectionObserver" in window && !reduce) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { diagram.classList.add("is-in"); svg.classList.add("on"); o.disconnect(); } }, { threshold: 0.35 }).observe(diagram);
    } else { diagram.classList.add("is-in"); svg.classList.add("on"); }
  }

  /* Shop: totals and an email order (no payment is taken on the site) */
  var shop = document.querySelector("[data-shop]");
  if (shop) {
    var rows = $("[data-product]", shop), sum = document.getElementById("sum"), go = document.getElementById("order");
    var email = shop.dataset.email, update = function () {
      var total = 0, lines = [];
      rows.forEach(function (r) {
        var q = Math.max(0, Math.min(20, parseInt(r.querySelector("input").value, 10) || 0)), p = parseFloat(r.dataset.price), sel = r.querySelector("select");
        var t = q * p; total += t; r.querySelector(".line-total").textContent = q ? q + " x $" + p + " = $" + t : "";
        if (q) lines.push(q + " x " + r.dataset.product + (sel ? " (" + sel.value + ")" : "") + " at $" + p);
      });
      sum.textContent = "$" + total;
      if (total) { go.removeAttribute("aria-disabled"); go.href = "mailto:" + email + "?subject=" + encodeURIComponent("Shop order") + "&body=" + encodeURIComponent("Hi Raw Bacon Robotics,\n\nI would like to order:\n" + lines.join("\n") + "\nTotal: $" + total + "\n\nName:\nPickup or delivery details:\n"); }
      else { go.setAttribute("aria-disabled", "true"); go.removeAttribute("href"); }
    };
    shop.addEventListener("input", update); update();
  }
})();
