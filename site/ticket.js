(function () {
  "use strict";

  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var el = document.getElementById("clock");
    if (!el) return;
    var n = new Date();
    el.textContent = pad(n.getHours()) + ":" + pad(n.getMinutes()) + ":" + pad(n.getSeconds());
  }
  tick();
  setInterval(tick, 1000);

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stacked = window.matchMedia("(max-width: 560px)");
  var canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce;
  var muted = false;
  try { muted = localStorage.getItem("th_muted") === "1"; } catch (e) {}
  var tickets = Array.prototype.slice.call(document.querySelectorAll(".ticket:not(.ticket--standby)"));

  function deal(t) {
    t.classList.remove("is-dealing");
    void t.offsetWidth;
    t.classList.add("is-dealing");
    setTimeout(function () { t.classList.remove("is-dealing"); }, 500);
  }

  var AC = null;
  function ac() {
    if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function noise(c, dur, fade) {
    var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (fade ? (1 - i / n) : 1);
    return b;
  }
  function ripTick() {
    if (muted) return;
    var c = ac(); if (!c) return; var t = c.currentTime;
    var s = c.createBufferSource(); s.buffer = noise(c, 0.04, true);
    var f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1800;
    var g = c.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + 0.05);
  }
  function ripFull() {
    if (muted) return;
    var c = ac(); if (!c) return; var t = c.currentTime;
    var s = c.createBufferSource(); s.buffer = noise(c, 0.45, true);
    var f = c.createBiquadFilter(); f.type = "highpass";
    f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(3400, t + 0.4);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.26, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + 0.47);
  }

  function edgeRight(N, D) {
    var p = ["0% 0%"];
    for (var i = 0; i <= N; i++) p.push((i % 2 ? "100%" : "calc(100% - " + D + "px)") + " " + (i / N * 100).toFixed(2) + "%");
    p.push("0% 100%");
    return "polygon(" + p.join(", ") + ")";
  }
  function edgeLeft(N, D) {
    var p = ["100% 0%"];
    for (var i = 0; i <= N; i++) p.push((i % 2 ? "0%" : D + "px") + " " + (i / N * 100).toFixed(2) + "%");
    p.push("100% 100%");
    return "polygon(" + p.join(", ") + ")";
  }
  function edgeBottom(N, D) {
    var p = ["0% 0%", "100% 0%"];
    for (var i = N; i >= 0; i--) p.push((i / N * 100).toFixed(2) + "% " + (i % 2 ? "100%" : "calc(100% - " + D + "px)"));
    return "polygon(" + p.join(", ") + ")";
  }
  function edgeTop(N, D) {
    var p = [];
    for (var i = 0; i <= N; i++) p.push((i / N * 100).toFixed(2) + "% " + (i % 2 ? "0%" : D + "px"));
    p.push("100% 100%", "0% 100%");
    return "polygon(" + p.join(", ") + ")";
  }
  function applyTorn(t) {
    var main = t.querySelector(".ticket__main");
    var stub = t.querySelector(".ticket__stub");
    if (stacked.matches) {
      var b = edgeBottom(24, 7), tp = edgeTop(24, 7);
      main.style.clipPath = b; main.style.webkitClipPath = b;
      stub.style.clipPath = tp; stub.style.webkitClipPath = tp;
    } else {
      var r = edgeRight(24, 7), l = edgeLeft(24, 7);
      main.style.clipPath = r; main.style.webkitClipPath = r;
      stub.style.clipPath = l; stub.style.webkitClipPath = l;
    }
  }
  function resetTear(t) {
    if (!t) return;
    var main = t.querySelector(".ticket__main");
    var stub = t.querySelector(".ticket__stub");
    var perf = t.querySelector(".perf");
    t.classList.remove("dragging", "ripped");
    main.style.transform = ""; stub.style.transform = "";
    main.style.clipPath = ""; main.style.webkitClipPath = "";
    stub.style.clipPath = ""; stub.style.webkitClipPath = "";
    stub.style.opacity = ""; perf.style.opacity = "";
  }

  function applyTear(t, pulled, progress) {
    var main = t.querySelector(".ticket__main");
    var stub = t.querySelector(".ticket__stub");
    var perf = t.querySelector(".perf");
    if (stacked.matches) {
      stub.style.transform = "translate(0," + pulled + "px) rotate(" + (progress * 4) + "deg)";
      main.style.transform = "translateY(" + (-progress * 6) + "px)";
    } else {
      stub.style.transform = "translate(" + pulled + "px," + (progress * progress * 30) + "px) rotate(" + (progress * 9) + "deg)";
      main.style.transform = "translateX(" + (-progress * 8) + "px)";
    }
    perf.style.opacity = String(Math.max(0, 1 - progress * 2.4));
  }
  function completeTear(t) {
    var stub = t.querySelector(".ticket__stub");
    t.classList.remove("dragging");
    try { ripFull(); } catch (e) {}
    if (stacked.matches) stub.style.transform = "translate(0," + (stub.offsetHeight + 170) + "px) rotate(12deg)";
    else stub.style.transform = "translate(" + (stub.offsetWidth + 200) + "px,120px) rotate(18deg)";
    stub.style.opacity = "0";
    setTimeout(function () { window.location.href = t.dataset.href; }, 520);
  }
  function snapBack(t) {
    t.classList.remove("dragging");
    applyTear(t, 0, 0);
    t.querySelector(".perf").style.opacity = "";
    setTimeout(function () { if (!dragging) resetTear(t); }, 460);
  }

  var dragging = false, dragTicket = null, startPos = 0, axisV = false, threshold = 0, progress = 0, lastStep = 0;

  function beginDrag(t, e) {
    if (reduce) { window.location.href = t.dataset.href; return; }
    dragging = true; dragTicket = t; progress = 0; lastStep = 0;
    axisV = stacked.matches;
    var stub = t.querySelector(".ticket__stub");
    threshold = (axisV ? stub.offsetHeight : stub.offsetWidth) * 0.8;
    startPos = axisV ? e.clientY : e.clientX;
    t.classList.add("dragging");
    t.style.transform = "";
    applyTorn(t);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  }
  function moveDrag(e) {
    if (!dragging) return;
    var pos = axisV ? e.clientY : e.clientX;
    var pulled = Math.max(0, pos - startPos);
    pulled = Math.min(pulled, threshold * 1.6);
    progress = Math.min(1, pulled / threshold);
    applyTear(dragTicket, pulled, progress);
    var step = Math.floor(progress / 0.1);
    if (step > lastStep) { lastStep = step; try { ripTick(); } catch (err) {} }
  }
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    var t = dragTicket;
    if (progress >= 0.55) completeTear(t); else snapBack(t);
  }

  tickets.forEach(function (t) {
    [t.querySelector(".seam-grip"), t.querySelector(".ticket__stub")].forEach(function (el) {
      el.addEventListener("pointerdown", function (e) { beginDrag(t, e); });
      el.addEventListener("pointermove", moveDrag);
      el.addEventListener("pointerup", endDrag);
      el.addEventListener("pointercancel", endDrag);
    });
    t.querySelector(".ticket__stub").addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (reduce) { window.location.href = t.dataset.href; return; }
        applyTorn(t); completeTear(t);
      }
    });
  });

  window.addEventListener("orientationchange", function () { tickets.forEach(resetTear); });
  tickets.forEach(function (t, i) { setTimeout(function () { deal(t); }, i * 90); });

  // Live "flight" status — ping each service and flip the STATUS cell.
  function setStatus(cell, txt, cls) {
    if (!cell) return;
    cell.classList.remove("green", "amber", "red");
    cell.classList.add(cls);
    cell.textContent = txt;
  }
  function checkStatus(t) {
    var cell = t.querySelector(".js-status");
    var url = t.dataset.href;
    if (!cell || !url || !window.fetch) return;
    setStatus(cell, "CHECKING", "amber");
    var done = false;
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var to = setTimeout(function () {
      if (done) return; done = true;
      if (ctrl) ctrl.abort();
      setStatus(cell, "DELAYED", "red");
    }, 7000);
    function up() { if (done) return; done = true; clearTimeout(to); setStatus(cell, "ON TIME", "green"); }
    function down() { if (done) return; done = true; clearTimeout(to); setStatus(cell, "DELAYED", "red"); }
    fetch(url, { mode: "no-cors", cache: "no-store", signal: ctrl ? ctrl.signal : undefined }).then(up).catch(down);
  }

  // Scannable QR on each stub, encoding the destination URL.
  function makeQR(t) {
    var box = t.querySelector(".qr");
    if (!box || typeof qrcode === "undefined" || !t.dataset.href) return;
    try {
      var qr = qrcode(0, "M");
      qr.addData(t.dataset.href);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) {}
  }

  tickets.forEach(function (t) { makeQR(t); checkStatus(t); });

  // ---- departure ambiance (synthetic boarding chime) ----
  function bell(freq, t0, dur, peak) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    var ov = c.createOscillator(); ov.type = "sine"; ov.frequency.value = freq * 2;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var gv = c.createGain(); gv.gain.value = 0.28;
    o.connect(g); ov.connect(gv).connect(g); g.connect(c.destination);
    o.start(t0); ov.start(t0); o.stop(t0 + dur + 0.05); ov.stop(t0 + dur + 0.05);
  }
  function chime() {
    if (muted) return; var c = ac(); if (!c) return; var t = c.currentTime + 0.03;
    bell(660, t, 0.7, 0.16); bell(523.25, t + 0.28, 0.95, 0.16);
  }
  function chimeUp() {
    if (muted) return; var c = ac(); if (!c) return; var t = c.currentTime + 0.03;
    bell(523.25, t, 0.5, 0.15); bell(659.25, t + 0.13, 0.5, 0.15); bell(783.99, t + 0.26, 0.85, 0.17);
  }

  // boarding chime on first interaction (respects autoplay policy)
  var armed = true;
  function armSound() { if (!armed) return; armed = false; chime(); }
  window.addEventListener("pointerdown", armSound, { once: true });
  window.addEventListener("keydown", armSound, { once: true });

  // sound toggle
  var sndBtn = document.getElementById("sndToggle");
  function updateSnd() {
    if (!sndBtn) return;
    sndBtn.classList.toggle("snd--off", muted);
    sndBtn.setAttribute("aria-pressed", String(!muted));
    sndBtn.title = muted ? "Sound off — click to enable" : "Sound on — click to mute";
  }
  if (sndBtn) {
    updateSnd();
    sndBtn.addEventListener("click", function () {
      muted = !muted;
      try { localStorage.setItem("th_muted", muted ? "1" : "0"); } catch (e) {}
      updateSnd();
      if (!muted) chime();
    });
  }

  // ---- first-class upgrade easter egg (tap the ◆ logo x3) ----
  var classTag = document.getElementById("classTag");
  var fcHint = document.getElementById("fcHint");
  function toastMsg(txt) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = txt; el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("show"); }, 2400);
  }
  function setFirstClass(on, announce) {
    document.body.classList.toggle("first-class", on);
    if (classTag) classTag.textContent = on ? "FIRST CLASS" : "BOARDING PASS";
    if (fcHint) fcHint.style.display = on ? "none" : "";
    try { localStorage.setItem("th_fc", on ? "1" : "0"); } catch (e) {}
    if (announce) {
      toastMsg(on ? "\u2726 UPGRADED TO FIRST CLASS \u2726" : "\u21A9 BACK TO ECONOMY");
      if (on) chimeUp(); else chime();
    }
  }
  var taps = 0, tapTimer = null;
  function registerTap() {
    taps++; clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { taps = 0; }, 1200);
    if (taps >= 3) { taps = 0; setFirstClass(!document.body.classList.contains("first-class"), true); }
  }
  var logo = document.getElementById("logo");
  if (logo) logo.addEventListener("click", registerTap);
  if (fcHint) fcHint.addEventListener("click", registerTap);
  try { if (localStorage.getItem("th_fc") === "1") setFirstClass(true, false); } catch (e) {}

  // ---- wallet-card tilt + sheen ----
  if (canTilt) {
    var raf = null;
    tickets.forEach(function (t) {
      t.addEventListener("pointermove", function (e) {
        if (dragging) return;
        var r = t.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          t.style.transform = "perspective(1100px) rotateX(" + ((0.5 - py) * 6).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * 7).toFixed(2) + "deg)";
          t.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          t.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        });
      });
      t.addEventListener("pointerleave", function () {
        if (dragging) return;
        t.style.transform = "";
        t.style.setProperty("--mx", "50%");
        t.style.setProperty("--my", "-20%");
      });
    });
  }
})();
