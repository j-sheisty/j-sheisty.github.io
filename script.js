// ─────────────────────────────────────────────────────────
//  FORM ENDPOINT — Google Apps Script URL
// ─────────────────────────────────────────────────────────
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbx68_D-fUwm4VbUnLAI5MG_7rwYeOiG12nXuar78zRFcr3aL6of5MXSDCnPJe3PDnw3gg/exec";


// ─────────────────────────────────────────────────────────
//  AVAILABLE DATES — edit this list to open or close dates
//
//  Format: "YYYY-MM-DD"
//  To open a date:  add a new line like  "2026-06-18",
//  To close a date: delete that line
// ─────────────────────────────────────────────────────────
const AVAILABLE_DATES = [
  "2026-06-11",
  "2026-06-9",
];


// ─────────────────────────────────────────────────────────
//  SESSIONS shown for every available date
// ─────────────────────────────────────────────────────────
const SESSIONS = [
  { id: "first",         label: "First Session",      time: "9:00am – 12:00pm" },
  { id: "lunch_bring",   label: "Lunch — Bring own",  time: "12:00pm – 1:00pm", group: "lunch" },
  { id: "lunch_provide", label: "Lunch — We provide", time: "12:00pm – 1:00pm", group: "lunch" },
  { id: "second",        label: "Second Session",     time: "1:00pm – 4:00pm" },
];


// ─────────────────────────────────────────────────────────
//  CALENDAR
// ─────────────────────────────────────────────────────────
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const availableSet = new Set(AVAILABLE_DATES);

// sessionData: Map of dateStr -> Set of session ids the user picked
const sessionData = new Map();

let viewYear  = TODAY.getFullYear();
let viewMonth = TODAY.getMonth();

// Don't go past the last available date's month
const lastDate  = AVAILABLE_DATES.length ? AVAILABLE_DATES[AVAILABLE_DATES.length - 1] : null;
const lastYear  = lastDate ? parseInt(lastDate.slice(0, 4)) : viewYear;
const lastMonth = lastDate ? parseInt(lastDate.slice(5, 7)) - 1 : viewMonth;

let activeDate = null; // currently selected date in the session panel

const calendarWrap = document.getElementById("calendarWrap");
const sessionPanel = document.getElementById("sessionPanel");
const selectedEl   = document.getElementById("selectedDates");
const daysInput    = document.getElementById("daysInput");

function renderCalendar() {
  calendarWrap.innerHTML = "";
  renderMonth(viewYear, viewMonth);
}

function renderMonth(year, month) {
  const monthNames  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const canGoPrev = !(year === TODAY.getFullYear() && month === TODAY.getMonth());
  const canGoNext = !(year === lastYear && month === lastMonth);

  const wrap = document.createElement("div");
  wrap.className = "cal-month";

  // Header
  const header = document.createElement("div");
  header.className = "cal-month-header";
  header.innerHTML = `
    <button class="cal-nav" id="calPrev" ${canGoPrev ? "" : "style='opacity:0.2;cursor:default;pointer-events:none'"}>&#8592;</button>
    <h3>${monthNames[month]} ${year}</h3>
    <button class="cal-nav" id="calNext" ${canGoNext ? "" : "style='opacity:0.2;cursor:default;pointer-events:none'"}>&#8594;</button>
  `;
  wrap.appendChild(header);

  // Day-of-week labels
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

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-cell empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const cellDate = new Date(year, month, d);
    const isPast   = cellDate < TODAY;
    const isToday  = cellDate.getTime() === TODAY.getTime();
    const isOpen   = availableSet.has(dateStr);

    const cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.textContent = d;

    if (isPast || !isOpen) {
      cell.classList.add("past");
      if (isToday) cell.classList.add("today");
    } else {
      if (isToday)               cell.classList.add("today");
      if (dateStr === activeDate) cell.classList.add("active-date");
      if (sessionData.has(dateStr) && sessionData.get(dateStr).size > 0)
        cell.classList.add("has-sessions");

      cell.addEventListener("click", () => {
        activeDate = dateStr;
        renderCalendar();         // re-render to update active highlight
        showSessionPanel(dateStr);
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

function showSessionPanel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayNames   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const label = `${dayNames[date.getDay()]}, ${monthNames[m - 1]} ${d}`;

  if (!sessionData.has(dateStr)) sessionData.set(dateStr, new Set());
  const picked = sessionData.get(dateStr);

  sessionPanel.innerHTML = `
    <div class="session-date-title">${label}</div>
    <div class="session-opts" id="sessionOpts"></div>
  `;

  const opts = sessionPanel.querySelector("#sessionOpts");

  // Group sessions: standalone ones go solo, grouped ones share a row
  const rendered = new Set();
  SESSIONS.forEach(s => {
    if (rendered.has(s.id)) return;

    if (s.group) {
      const groupSessions = SESSIONS.filter(x => x.group === s.group);
      groupSessions.forEach(x => rendered.add(x.id));

      const card = document.createElement("div");
      card.className = "session-opt lunch-card";
      card.innerHTML = `
        <div class="lunch-card-header">
          <strong>Lunch</strong>
          <span>12:00pm – 1:00pm</span>
        </div>
        <div class="lunch-card-choices"></div>
      `;
      const choices = card.querySelector(".lunch-card-choices");
      groupSessions.forEach(gs => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lunch-choice" + (picked.has(gs.id) ? " selected" : "");
        btn.textContent = gs.label.replace("Lunch — ", "");
        btn.addEventListener("click", () => {
          const alreadySelected = picked.has(gs.id);
          groupSessions.forEach(x => { picked.delete(x.id); });
          choices.querySelectorAll(".lunch-choice").forEach(b => b.classList.remove("selected"));
          if (!alreadySelected) {
            picked.add(gs.id);
            btn.classList.add("selected");
          }
          if (picked.size === 0) sessionData.delete(dateStr);
          renderCalendar();
          updateSelected();
        });
        choices.appendChild(btn);
      });
      opts.appendChild(card);
    } else {
      rendered.add(s.id);
      const row = document.createElement("label");
      row.className = "session-opt" + (picked.has(s.id) ? " checked" : "");
      row.innerHTML = `
        <input type="checkbox" value="${s.id}" ${picked.has(s.id) ? "checked" : ""} />
        <div class="session-opt-text">
          <strong>${s.label}</strong>
          <span>${s.time}</span>
        </div>
      `;
      row.querySelector("input").addEventListener("change", ev => {
        if (ev.target.checked) { picked.add(s.id); row.classList.add("checked"); }
        else { picked.delete(s.id); row.classList.remove("checked"); }
        if (picked.size === 0) sessionData.delete(dateStr);
        renderCalendar();
        updateSelected();
      });
      opts.appendChild(row);
    }
  });

  updateSelected();
}

function updateSelected() {
  if (sessionData.size === 0) {
    selectedEl.textContent = "No dates selected";
    selectedEl.classList.add("empty");
    daysInput.value = "";
    return;
  }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const sessionLabels = { first: "First Session", lunch_bring: "Lunch (own)", lunch_provide: "Lunch (provided)", second: "Second Session" };
  const order = ["first","lunch_bring","lunch_provide","second"];

  const sorted = [...sessionData.keys()].sort();
  const parts = sorted.map(ds => {
    const [y, m, d] = ds.split("-").map(Number);
    const picked = sessionData.get(ds);
    if (!picked || picked.size === 0) return null;
    const sessions = order.filter(id => picked.has(id)).map(id => sessionLabels[id]).join(", ");
    return `${monthNames[m-1]} ${d}: ${sessions}`;
  }).filter(Boolean);

  if (parts.length === 0) {
    selectedEl.textContent = "No dates selected";
    selectedEl.classList.add("empty");
    daysInput.value = "";
    return;
  }

  selectedEl.textContent = parts.join("  ·  ");
  selectedEl.classList.remove("empty");
  daysInput.value = parts.join("; ");
}

renderCalendar();
updateSelected();


// ─────────────────────────────────────────────────────────
//  FORM SUBMISSION
// ─────────────────────────────────────────────────────────
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

  // Need at least one date with at least one session
  const hasSession = [...sessionData.values()].some(s => s.size > 0);
  if (!hasSession) {
    selectedEl.textContent = "↑ Please pick at least one date and session above.";
    selectedEl.classList.add("empty");
    valid = false;
  }

  if (!valid) {
    const firstError = form.querySelector(".error") || selectedEl;
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
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
    alert("Couldn't send. Email johnwashek9@gmail.com directly.");
    resetBtn();
  }
});

function showSuccess() {
  form.reset();
  sessionData.clear();
  activeDate = null;
  renderCalendar();
  updateSelected();
  sessionPanel.innerHTML = '<p class="session-placeholder">← Click a date to see sessions</p>';

  form.style.display = "none";
  successMsg.removeAttribute("hidden");
  successMsg.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetBtn() {
  submitBtn.disabled = false;
  btnText.hidden = false;
  btnLoading.hidden = true;
}
