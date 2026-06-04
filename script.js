// Camp Washek

// To enable real form submissions, replace "REPLACE_ME" with your Formspree URL
// e.g. "https://formspree.io/f/xxxxxxxx"
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbx68_D-fUwm4VbUnLAI5MG_7rwYeOiG12nXuar78zRFcr3aL6of5MXSDCnPJe3PDnw3gg/exec";

// ── CALENDAR ─────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const LAST_MONTH = { year: 2026, month: 5 }; // June 2026 — last navigable month

// Only these dates are open for sign-up
const AVAILABLE_DATES = new Set(["2026-06-11"]);

const selectedDates = new Set(); // stored as "YYYY-MM-DD"

// Always open at the current month
let viewYear  = TODAY.getFullYear();
let viewMonth = TODAY.getMonth();

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

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const wrap = document.createElement("div");
  wrap.className = "cal-month";

  // Can't go before today's month; can't go past LAST_MONTH
  const canGoPrev = !(year === TODAY.getFullYear() && month === TODAY.getMonth());
  const canGoNext = !(year === LAST_MONTH.year && month === LAST_MONTH.month);

  const header = document.createElement("div");
  header.className = "cal-month-header";
  header.innerHTML = `
    <button class="cal-nav" id="calPrev" ${canGoPrev ? "" : "style='opacity:0.2;cursor:default;pointer-events:none'"}>&#8592;</button>
    <h3>${monthNames[month]} ${year}</h3>
    <button class="cal-nav" id="calNext" ${canGoNext ? "" : "style='opacity:0.2;cursor:default;pointer-events:none'"}>&#8594;</button>
  `;
  wrap.appendChild(header);

  const weekdays = document.createElement("div");
  weekdays.className = "cal-weekdays";
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
    const s = document.createElement("span");
    s.textContent = d;
    weekdays.appendChild(s);
  });
  wrap.appendChild(weekdays);

  const grid = document.createElement("div");
  grid.className = "cal-days";

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-cell empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell     = document.createElement("div");
    const dateStr  = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cellDate = new Date(year, month, d);
    const isPast   = cellDate < TODAY;
    const isToday  = cellDate.getTime() === TODAY.getTime();

    cell.className = "cal-cell";
    cell.textContent = d;

    const isAvailable = AVAILABLE_DATES.has(dateStr);

    if (isPast || !isAvailable) {
      cell.classList.add("past");
      if (isToday) cell.classList.add("today");
    } else {
      if (isToday)                    cell.classList.add("today");
      if (selectedDates.has(dateStr)) cell.classList.add("selected");

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

  wrap.querySelector("#calPrev").addEventListener("click", () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { viewMonth = 11; viewYear--; } else viewMonth--;
    renderCalendar();
  });
  wrap.querySelector("#calNext").addEventListener("click", () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { viewMonth = 0; viewYear++; } else viewMonth++;
    renderCalendar();
  });
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


// ── FORM ─────────────────────────────────────────────────

const form       = document.getElementById("signupForm");
const successMsg = document.getElementById("successMsg");
const submitBtn  = document.getElementById("submitBtn");
const btnText    = document.getElementById("btnText");
const btnLoading = document.getElementById("btnLoading");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let valid = true;
  const errors = [];

  form.querySelectorAll("[required]").forEach(f => {
    f.classList.remove("error");
    if (!f.value.trim()) {
      f.classList.add("error");
      valid = false;
    }
  });

  if (selectedDates.size === 0) {
    selectedEl.textContent = "↑ Please pick at least one date above.";
    selectedEl.classList.add("empty");
    valid = false;
  }

  if (!valid) {
    const firstError = form.querySelector(".error");
    const target = firstError || selectedEl;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  submitBtn.disabled = true;
  btnText.hidden = true;
  btnLoading.hidden = false;

  const data = new FormData();
  data.append("parent_name",    document.getElementById("parentName").value.trim());
  data.append("kid_name",       document.getElementById("kidName").value.trim());
  data.append("parent_email",   document.getElementById("parentEmail").value.trim());
  data.append("parent_phone",   document.getElementById("parentPhone").value.trim());
  data.append("selected_dates", document.getElementById("daysInput").value);
  data.append("notes",          document.getElementById("notes").value.trim());

  try {
    await fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: data,
    });
    showSuccess();
  } catch {
    alert("Couldn't send. Email hello@washekhq.me directly.");
    resetBtn();
  }
});

function showSuccess() {
  // Clear form data
  form.reset();
  selectedDates.clear();
  renderCalendar();
  updateSelected();

  // Hide form, show success
  form.style.display = "none";
  successMsg.removeAttribute("hidden");
  successMsg.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetBtn() {
  submitBtn.disabled = false;
  btnText.hidden = false;
  btnLoading.hidden = true;
}
