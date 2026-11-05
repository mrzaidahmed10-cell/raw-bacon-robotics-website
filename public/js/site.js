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
  if (hero && !hero.querySelector(".hero-robot")) requestAnimationFrame(function () { requestAnimationFrame(heroGo); });

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

  /* Hero: the photo wipes in, callouts draw, two gears start turning, depth follows the pointer */
  var heroRobot = hero && hero.querySelector(".hero-robot");
  if (heroRobot) {
    var himg = heroRobot.querySelector("img"), started = false;
    var start = function () { if (started) return; started = true; heroGo(); };
    if (himg.complete) start(); else { himg.addEventListener("load", start); himg.addEventListener("error", start); setTimeout(start, 1500); }

    /* gear pair, drawn as CAD outlines */
    var svg = hero.querySelector(".hero-gears"), NS = "http://www.w3.org/2000/svg";
    var N1 = 30, N2 = 18, R1 = 190, R2 = R1 * N2 / N1, phi = -0.62; /* centre line, radians */
    var c1 = { x: 250, y: 330 }, c2 = { x: c1.x + (R1 + R2) * Math.cos(phi), y: c1.y + (R1 + R2) * Math.sin(phi) };
    var tooth = function (N, R) {
      var p = 2 * Math.PI / N, add = 2 * Math.PI / N * 0, ro = R + R * 0.14, ri = R - R * 0.17, d = "";
      var pt = function (r, a) { return (r * Math.cos(a)).toFixed(2) + " " + (r * Math.sin(a)).toFixed(2); };
      for (var k = 0; k < N; k++) {
        var a = k * p;
        d += (k ? "L" : "M") + pt(ri, a - 0.5 * p) + "L" + pt(ri, a - 0.31 * p) + "L" + pt(ro, a - 0.15 * p) + "L" + pt(ro, a + 0.15 * p) + "L" + pt(ri, a + 0.31 * p) + "L" + pt(ri, a + 0.5 * p);
      }
      return d + "Z";
    };
    var mk = function (n, attrs, parent) { var e = document.createElementNS(NS, n); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; };
    var holes = function (g, R, n, r0, rr) { for (var i = 0; i < n; i++) { var a = i * 2 * Math.PI / n; mk("circle", { cx: (r0 * Math.cos(a)).toFixed(2), cy: (r0 * Math.sin(a)).toFixed(2), r: rr, class: "g" }, g); } };
    var g1 = mk("g", {}), g2 = mk("g", {});
    mk("path", { d: tooth(N1, R1), class: "g", "fill-rule": "evenodd" }, g1); mk("circle", { r: 26, class: "g" }, g1); holes(g1, R1, 6, R1 * 0.56, 30);
    mk("path", { d: tooth(N2, R2), class: "g g2", "fill-rule": "evenodd" }, g2); mk("circle", { r: 18, class: "g g2" }, g2); holes(g2, R2, 5, R2 * 0.55, 17);
    mk("circle", { cx: c1.x, cy: c1.y, r: R1, class: "pc" }); mk("circle", { cx: c2.x, cy: c2.y, r: R2, class: "pc" });
    var place = function (t1) {
      var t2 = phi + Math.PI - (N1 / N2) * (t1 - phi) - Math.PI / N2;
      g1.setAttribute("transform", "translate(" + c1.x + " " + c1.y + ") rotate(" + (t1 * 180 / Math.PI).toFixed(3) + ")");
      g2.setAttribute("transform", "translate(" + c2.x.toFixed(2) + " " + c2.y.toFixed(2) + ") rotate(" + (t2 * 180 / Math.PI).toFixed(3) + ")");
    };
    place(0.3);

    if (!reduce) {
      var tx = 0, ty = 0, cx = 0, cy = 0, th = 0.3, speed = 0, last = 0, live = true, t0 = 0;
      var raf = 0;
      new IntersectionObserver(function (es) { live = es[0].isIntersecting; if (live && !raf) { last = 0; raf = requestAnimationFrame(loop); } }).observe(hero);
      if (matchMedia("(pointer: fine)").matches) addEventListener("pointermove", function (e) { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
      var loop = function (now) {
        raf = 0;
        if (!live) return;
        if (!t0) t0 = now;
        var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
        /* gears spin up from rest to a slow, steady turn */
        speed += (0.3 * Math.min(1, (now - t0) / 2200) - speed) * Math.min(1, dt * 2.5);
        th += speed * dt;
        place(th + scrollY * 0.0035);
        cx += (tx - cx) * Math.min(1, dt * 3); cy += (ty - cy) * Math.min(1, dt * 3);
        hero.style.setProperty("--px", cx.toFixed(4)); hero.style.setProperty("--py", cy.toFixed(4));
        hero.style.setProperty("--sy", Math.min(scrollY, innerHeight) * 0.08);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
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
