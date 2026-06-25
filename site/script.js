const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:-/& ";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Live clock ---------- */
const clockEl = document.getElementById("clock");
const dateEl = document.getElementById("date");
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function pad(n) { return String(n).padStart(2, "0"); }

function tick() {
  const now = new Date();
  if (clockEl) {
    clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
  if (dateEl) {
    dateEl.textContent = `${DAYS[now.getDay()]} ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
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

/* ---------- Live status checks ---------- */
const STATUS_CLASSES = ["status--green", "status--amber", "status--red"];
const CHECK_TIMEOUT = 7000;
const RECHECK_INTERVAL = 60000;

function setStatus(el, text, statusClass) {
  if (el.getAttribute("data-flap") === text) return;
  STATUS_CLASSES.forEach((c) => el.classList.remove(c));
  el.classList.add(statusClass);
  el.setAttribute("data-flap", text);
  flap(el, 0);
}

async function checkService(el) {
  const url = el.getAttribute("data-check");
  if (!url) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

  try {
    await fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    setStatus(el, "ON TIME", "status--green");
  } catch (err) {
    clearTimeout(timer);
    setStatus(el, "OFFLINE", "status--red");
  }
}

function scheduleStatusChecks() {
  const checks = Array.from(document.querySelectorAll("[data-check]"));
  if (!checks.length) return;
  const stamp = document.getElementById("lastChecked");
  const run = () => {
    checks.forEach(checkService);
    if (stamp) {
      const n = new Date();
      stamp.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    }
  };
  setTimeout(run, reduceMotion ? 0 : 2800);
  setInterval(run, RECHECK_INTERVAL);
}

function runBoard() {
  const flapEls = Array.from(document.querySelectorAll(".flap"));

  flapEls.forEach((el, idx) => {
    const extra = parseInt(el.getAttribute("data-flap-delay") || "", 10);
    const startBase = Number.isNaN(extra) ? idx * 90 : extra;
    flap(el, startBase);
  });

  const blinkers = document.querySelectorAll("[data-blink]");
  if (reduceMotion) {
    blinkers.forEach((el) => el.classList.add("is-blinking"));
  } else {
    setTimeout(() => blinkers.forEach((el) => el.classList.add("is-blinking")), 2600);
  }

  scheduleStatusChecks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runBoard);
} else {
  runBoard();
}

/* ---------- Boarding transition ---------- */
function initBoarding() {
  const boarding = document.getElementById("boarding");
  const bService = document.getElementById("boardingService");
  const bDest = document.getElementById("boardingDest");
  if (!boarding || !bService) return;

  function playBoarding(service, dest, url) {
    bService.setAttribute("data-flap", service);
    if (bDest) bDest.textContent = dest ? `DESTINATION · ${dest}` : "";
    boarding.classList.add("is-active");
    boarding.setAttribute("aria-hidden", "false");
    flap(bService, 250);
    setTimeout(() => boarding.classList.add("is-departing"), 1250);
    setTimeout(() => { window.location.href = url; }, 1650);
  }

  document.querySelectorAll("a.board__row[href]").forEach((row) => {
    row.addEventListener("click", (e) => {
      // Let modified clicks (new tab, etc.) and reduced-motion behave normally.
      if (reduceMotion) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const url = row.href;
      const service = row.querySelector(".col--service")?.getAttribute("data-flap") || "DEPARTING";
      const dest = row.querySelector(".col--dest")?.getAttribute("data-flap") || "";
      playBoarding(service, dest, url);
    });
  });

  // Reset overlay if the user returns via back/forward (bfcache).
  window.addEventListener("pageshow", () => {
    boarding.classList.remove("is-active", "is-departing");
    boarding.setAttribute("aria-hidden", "true");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBoarding);
} else {
  initBoarding();
}

/* ---------- Easter egg: hidden station announcement ---------- */
const PA_MESSAGES = [
  "Passenger Fairuz is now boarding the automation express.",
  "The 13:37 service to COMET is departing shortly. Mind the gap.",
  "Lost property: one civil engineering degree, now repurposed for ops.",
  "All systems ON TIME. Thank you for choosing TimelessHub.",
  "Reminder: this station is self-hosted and runs on coffee.",
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

/* ---------- Easter egg: idle board shuffle ---------- */
function initIdleShuffle() {
  if (reduceMotion) return;

  function glitchCell(cell, flips) {
    const original = cell.textContent;
    let n = 0;
    cell.classList.add("is-cycling");
    const timer = setInterval(() => {
      n++;
      if (n >= flips) {
        clearInterval(timer);
        cell.textContent = original;
        cell.classList.remove("is-cycling");
        cell.classList.add("is-locked");
        setTimeout(() => cell.classList.remove("is-locked"), 240);
      } else {
        cell.textContent = CHARSET[Math.floor(Math.random() * (CHARSET.length - 1))];
      }
    }, 55);
  }

  function glitchOne() {
    // Reshuffle a whole field (e.g. a service or destination) so it's clearly visible.
    const fields = Array.from(document.querySelectorAll(".board .flap")).filter(
      (f) => f.querySelector(".flap-cell:not(.flap-cell--space)")
    );
    if (!fields.length) return;
    const field = fields[Math.floor(Math.random() * fields.length)];
    const cells = Array.from(
      field.querySelectorAll(".flap-cell:not(.flap-cell--space)")
    );
    cells.forEach((cell, i) => {
      const flips = 5 + Math.floor(Math.random() * 4);
      setTimeout(() => glitchCell(cell, flips), i * 60);
    });
  }

  let idleTimer = null;
  let shuffleInterval = null;

  function goIdle() {
    glitchOne();
    shuffleInterval = setInterval(glitchOne, 5000);
  }

  function reset() {
    clearTimeout(idleTimer);
    if (shuffleInterval) {
      clearInterval(shuffleInterval);
      shuffleInterval = null;
    }
    idleTimer = setTimeout(goIdle, 15000);
  }

  ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"].forEach((ev) => {
    window.addEventListener(ev, reset, { passive: true });
  });
  reset();
}

function initEasterEggs() {
  initAnnouncement();
  initIdleShuffle();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEasterEggs);
} else {
  initEasterEggs();
}
