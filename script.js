// Camp Washek

// To enable real form submissions, replace "REPLACE_ME" with your Formspree URL
// e.g. "https://formspree.io/f/xxxxxxxx"
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbypjO_O8XXkczBUx50yh1DI-yhSRPvXs_AfgUA_Evger0xY86E0Doi0tVdivi9M6AQeww/exec";

// ── CALENDAR ─────────────────────────────────────────────

const CAMP_START = { year: 2026, month: 5 };  // June 2026 (month is 0-indexed)
const CAMP_END   = { year: 2026, month: 7 };  // August 2026

const selectedDates = new Set(); // stored as "YYYY-MM-DD"

// Start calendar at today's month, clamped to camp range
const _now = new Date();
let viewYear  = _now.getFullYear();
let viewMonth = _now.getMonth();
if (viewYear < CAMP_START.year || (viewYear === CAMP_START.year && viewMonth < CAMP_START.month)) {
  viewYear = CAMP_START.year; viewMonth = CAMP_START.month;
}
if (viewYear > CAMP_END.year || (viewYear === CAMP_END.year && viewMonth > CAMP_END.month)) {
  viewYear = CAMP_END.year; viewMonth = CAMP_END.month;
}

const calendarWrap  = document.getElementById("calendarWrap");
const selectedEl    = document.getElementById("selectedDates");
const daysInput     = document.getElementById("daysInput");

function renderCalendar() {
  calendarWrap.innerHTML = "";

  // Render current month + optionally the next one if within range
  renderMonth(viewYear, viewMonth);
}

function renderMonth(year, month) {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const wrap = document.createElement("div");
  wrap.className = "cal-month";

  // Header
  const header = document.createElement("div");
  header.className = "cal-month-header";

  const canGoPrev = !(year === CAMP_START.year && month === CAMP_START.month);
  const canGoNext = !(year === CAMP_END.year   && month === CAMP_END.month);

  header.innerHTML = `
    <button class="cal-nav" id="calPrev" ${canGoPrev ? "" : "disabled style='opacity:0.2;cursor:default'"}>&#8592;</button>
    <h3>${monthNames[month]} ${year}</h3>
    <button class="cal-nav" id="calNext" ${canGoNext ? "" : "disabled style='opacity:0.2;cursor:default'"}>&#8594;</button>
  `;
  wrap.appendChild(header);

  // Weekday labels
  const weekdays = document.createElement("div");
  weekdays.className = "cal-weekdays";
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
    const s = document.createElement("span");
    s.textContent = d;
    weekdays.appendChild(s);
  });
  wrap.appendChild(weekdays);

  // Days grid
  const grid = document.createElement("div");
  grid.className = "cal-days";

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-cell empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.textContent = d;

    const dow = new Date(year, month, d).getDay(); // 0=Sun, 6=Sat
    const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const isWeekend = dow === 0 || dow === 6;

    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const cellDate      = new Date(year, month, d);
    const isPast        = cellDate < todayMidnight;
    const isToday       = cellDate.getTime() === todayMidnight.getTime();

    if (isWeekend) {
      cell.classList.add("disabled");
    } else if (isPast) {
      cell.classList.add("past");
    } else {
      if (isToday)                        cell.classList.add("today");
      if (selectedDates.has(dateStr))     cell.classList.add("selected");

      cell.addEventListener("click", () => {
        if (selectedDates.has(dateStr)) {
          selectedDates.delete(dateStr);
          cell.classList.remove("selected");
        } else {
          selectedDates.add(dateStr);
          cell.classList.add("selected");
        }
        updateSelected();
      });
    }

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  calendarWrap.appendChild(wrap);

  // Nav
  const prevBtn = wrap.querySelector("#calPrev");
  const nextBtn = wrap.querySelector("#calNext");

  if (prevBtn && canGoPrev) {
    prevBtn.addEventListener("click", () => {
      if (viewMonth === 0) { viewMonth = 11; viewYear--; }
      else viewMonth--;
      renderCalendar();
    });
  }
  if (nextBtn && canGoNext) {
    nextBtn.addEventListener("click", () => {
      if (viewMonth === 11) { viewMonth = 0; viewYear++; }
      else viewMonth++;
      renderCalendar();
    });
  }
}

function updateSelected() {
  if (selectedDates.size === 0) {
    selectedEl.textContent = "No dates selected";
    selectedEl.classList.add("empty");
    daysInput.value = "";
    return;
  }

  // Sort and format nicely
  const sorted = [...selectedDates].sort();
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const labels = sorted.map(ds => {
    const [y, m, d] = ds.split("-").map(Number);
    return fmt.format(new Date(Date.UTC(y, m - 1, d)));
  });

  selectedEl.textContent = labels.join(" · ");
  selectedEl.classList.remove("empty");
  daysInput.value = sorted.join(", ");
}

renderCalendar();
updateSelected();

// ── CLOCK ─────────────────────────────────────────────────
const clockEl = document.getElementById("clock");
function updateClock() {
  const now = new Date();
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const day  = days[now.getDay()];
  const date = now.getDate();
  const mon  = months[now.getMonth()];
  let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;
  clockEl.textContent = `${day}, ${mon} ${date}  ·  ${time}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── FORM ─────────────────────────────────────────────────

const form       = document.getElementById("signupForm");
const successMsg = document.getElementById("successMsg");
const submitBtn  = document.getElementById("submitBtn");
const btnText    = document.getElementById("btnText");
const btnLoading = document.getElementById("btnLoading");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let valid = true;

  form.querySelectorAll("[required]").forEach(f => {
    f.classList.remove("error");
    if (!f.value.trim()) { f.classList.add("error"); valid = false; }
  });

  if (selectedDates.size === 0) {
    selectedEl.textContent = "Please pick at least one date.";
    selectedEl.classList.add("empty");
    valid = false;
  }

  if (!valid) return;

  submitBtn.disabled = true;
  btnText.hidden = true;
  btnLoading.hidden = false;

  // Build URL-encoded body (required for Google Apps Script + no-cors)
  const body = new URLSearchParams({
    parent_name:    document.getElementById("parentName").value.trim(),
    kid_name:       document.getElementById("kidName").value.trim(),
    parent_email:   document.getElementById("parentEmail").value.trim(),
    parent_phone:   document.getElementById("parentPhone").value.trim(),
    selected_dates: document.getElementById("daysInput").value,
    notes:          document.getElementById("notes").value.trim(),
  });

  try {
    // no-cors: we can't read the response, so we show success after sending
    await fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    showSuccess();
  } catch {
    alert("Couldn't send. Email hello@washekhq.me directly.");
    resetBtn();
  }
});

function showSuccess() {
  form.hidden = true;
  successMsg.removeAttribute("hidden");
  successMsg.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetBtn() {
  submitBtn.disabled = false;
  btnText.hidden = false;
  btnLoading.hidden = true;
}
