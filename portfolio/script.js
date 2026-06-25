const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-/& ";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer year + clock ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const clockEl = document.getElementById("clock");
function pad(n) { return String(n).padStart(2, "0"); }
function tick() {
  if (!clockEl) return;
  const n = new Date();
  clockEl.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}
tick();
setInterval(tick, 1000);

/* ---------- Split-flap engine ---------- */
function buildCells(el) {
  const target = el.getAttribute("data-flap") || "";
  el.setAttribute("aria-label", target);
  el.textContent = "";
  const cells = [];

  for (const ch of target) {
    const cell = document.createElement("span");
    cell.setAttribute("aria-hidden", "true");
    if (ch === " ") {
      cell.className = "flap-cell flap-cell--space";
      cell.textContent = " ";
      el.appendChild(cell);
      continue;
    }
    cell.className = "flap-cell";
    cell.textContent = reduceMotion ? ch : CHARSET[0];
    el.appendChild(cell);
    cells.push({ node: cell, final: ch.toUpperCase() });
  }
  return cells;
}

function animateCell(cell, baseDelay) {
  const target = cell.final;
  const flips = 6 + Math.floor(Math.random() * 8);
  let count = 0;

  setTimeout(() => {
    cell.node.classList.add("is-cycling");
    const timer = setInterval(() => {
      count++;
      if (count >= flips) {
        clearInterval(timer);
        cell.node.textContent = target;
        cell.node.classList.remove("is-cycling");
        cell.node.classList.add("is-locked");
        setTimeout(() => cell.node.classList.remove("is-locked"), 240);
      } else {
        cell.node.textContent = CHARSET[Math.floor(Math.random() * (CHARSET.length - 1))];
      }
    }, 45);
  }, baseDelay);
}

function flap(el, startBase) {
  const cells = buildCells(el);
  if (reduceMotion) return;
  cells.forEach((cell, i) => {
    animateCell(cell, startBase + i * 32 + Math.random() * 30);
  });
}

/* ---------- Hero flaps immediately; section titles flap on scroll ---------- */
function initFlaps() {
  const hero = document.querySelector(".hero .flap");
  if (hero) flap(hero, 0);

  const titles = Array.from(document.querySelectorAll(".section__title.flap"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    titles.forEach((el) => flap(el, 0));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          flap(entry.target, 0);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  titles.forEach((el) => observer.observe(el));
}

/* ---------- Reveal sections on scroll ---------- */
function initReveal() {
  const els = Array.from(document.querySelectorAll(".section, .hero, .contact"));
  els.forEach((el) => el.classList.add("reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  els.forEach((el) => observer.observe(el));
}

/* ---------- Easter egg: hidden station announcement ---------- */
const PA_MESSAGES = [
  "Passenger Fairuz is now boarding the automation express.",
  "Now arriving: a civil engineer who took a hard left into ops.",
  "Lost property: one civil engineering degree, now repurposed for ops.",
  "All systems ON TIME. Thank you for visiting the passenger terminal.",
  "Reminder: this portfolio is self-hosted and runs on coffee.",
];

function initAnnouncement() {
  const pa = document.getElementById("pa");
  const paText = document.getElementById("paText");
  const mark = document.querySelector(".topbar__mark");
  if (!pa || !paText || !mark) return;

  let count = 0;
  let resetTimer = null;
  let hideTimer = null;
  let lastIndex = -1;

  function show() {
    let i = Math.floor(Math.random() * PA_MESSAGES.length);
    if (i === lastIndex) i = (i + 1) % PA_MESSAGES.length;
    lastIndex = i;
    paText.textContent = PA_MESSAGES[i];
    pa.classList.add("is-visible");
    pa.setAttribute("aria-hidden", "false");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 6000);
  }

  function hide() {
    pa.classList.remove("is-visible");
    pa.setAttribute("aria-hidden", "true");
  }

  mark.style.cursor = "pointer";
  mark.addEventListener("click", (e) => {
    e.preventDefault();
    count++;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { count = 0; }, 1500);
    if (count >= 5) {
      count = 0;
      show();
    }
  });

  pa.addEventListener("click", hide);
}

function init() {
  initReveal();
  initFlaps();
  initAnnouncement();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
