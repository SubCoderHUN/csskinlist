/* ============================================================
   events.js — Weekly event calendar with real server events
   ============================================================ */

// ---- Real event definitions ---------------------------------
// bonuses: { icon, label, before, after, note }
const HAPPY_HOUR = {
  emoji: '⚡',
  title: 'Happy Hour',
  shortTitle: 'Happy Hour',
  timeRange: '16:00–17:00',
  desc: 'Minden hétköznapon (Hétfőtől Csütörtökig) 16:00 és 17:00 között aktív a Happy Hour! Ebben az egy intenzív órában négyszer gyorsabban kapod a krediteket, és ötszörös kredit jár minden egyes gyilkosságért. Tökéletes alkalom a bolt feltöltésére és jutalmakra való spórolásra!',
  bonuses: [
    { icon: '⏱️', label: 'Kredit időköz',  before: '120mp',    after: '30mp',      note: '4× gyorsabb'  },
    { icon: '💀', label: 'Kill jutalom',   before: '1 kredit', after: '5 kredit',  note: '5× több'      },
  ],
  tags: ['Happy Hour', 'Kredit boost', 'H–Cs', '16:00–17:00'],
  accentColor: '#00d4ff',
};

const RANK_UP_DAY = {
  emoji: '📈',
  title: 'Rank-Up Nap',
  shortTitle: 'Rank-Up',
  timeRange: '14:00–18:00',
  desc: 'Minden szerdán 14:00 és 18:00 között érvényes a Rank-Up Nap! Minden ellenség elpusztítása 7 Elo pontot hoz (alap: 2 pont), és ha fejlövéssel végzel, plusz 3 bónusz pont is jár. Ez a legjobb alkalom a ranglétrán való gyors emelkedésre – ne hagyd ki!',
  bonuses: [
    { icon: '🏆', label: 'Kill Elo pont',     before: '2 pont', after: '7 pont',   note: '+5 bónusz'    },
    { icon: '🎯', label: 'Headshot bónusz',   before: '—',      after: '+3 pont',  note: 'extra jutalom'},
  ],
  tags: ['Rank-Up', 'Elo boost', 'Szerda', 'Headshot bónusz', '14:00–18:00'],
  accentColor: '#ffd700',
};

const FRIDAY_FRENZY = {
  emoji: '🔥',
  title: 'Friday Frenzy',
  shortTitle: 'Friday Frenzy',
  timeRange: '18:00–00:00',
  desc: 'Péntek este 18:00-tól éjfélig tart a Friday Frenzy! Az automatikus kredit időköz rögzített 45 másodpercre van beállítva, és minden egyes gyilkosság után 6 kredit üti a markodat. Kezdd el a hétvégét a legjobb módszeren – halmozd a krediteket és töltsd fel a boltod!',
  bonuses: [
    { icon: '⏱️', label: 'Kredit időköz',  before: 'alap',     after: '45mp',      note: 'rögzített'   },
    { icon: '💀', label: 'Kill jutalom',   before: '1 kredit', after: '6 kredit',  note: '6× több'     },
  ],
  tags: ['Friday Frenzy', 'Kredit boost', 'Péntek este', '18:00–00:00'],
  accentColor: '#ff6b00',
};

// Keys = day-of-week (0=Sun, 1=Mon … 6=Sat)
// Each value is an array of events (days can have multiple)
const WEEKLY_EVENTS = {
  1: [HAPPY_HOUR],                    // Hétfő
  2: [HAPPY_HOUR],                    // Kedd
  3: [RANK_UP_DAY, HAPPY_HOUR],       // Szerda — Rank-Up (14-18) + Happy Hour (16-17)
  4: [HAPPY_HOUR],                    // Csütörtök
  5: [FRIDAY_FRENZY],                 // Péntek
  // 0 (Vasárnap) and 6 (Szombat): no scheduled events
};

// ---- Constants ----------------------------------------------
const HU_DAYS   = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
const HU_DAYS_S = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
const HU_MONTHS = ['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];

// ---- State --------------------------------------------------
let currentWeekOffset = 0;
let selectedDayIndex  = null;

// ---- Helpers ------------------------------------------------
function getWeekDates(offset = 0) {
  const now    = new Date();
  const day    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function isToday(date) {
  const t = new Date();
  return date.getDate()     === t.getDate()  &&
         date.getMonth()    === t.getMonth() &&
         date.getFullYear() === t.getFullYear();
}

function formatDate(date) {
  return `${date.getFullYear()}. ${HU_MONTHS[date.getMonth()]} ${date.getDate()}.`;
}

function formatWeekLabel(days) {
  const s = days[0];
  const e = days[6];
  if (s.getMonth() === e.getMonth()) {
    return `${s.getFullYear()}. ${HU_MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}.`;
  }
  return `${HU_MONTHS[s.getMonth()]} ${s.getDate()} – ${HU_MONTHS[e.getMonth()]} ${e.getDate()}`;
}

// Build the bonus stat cards HTML for a single event
function buildBonusCards(bonuses, accentColor) {
  if (!bonuses || bonuses.length === 0) return '';
  const cards = bonuses.map(b => `
    <div class="bonus-card" style="--bonus-color:${accentColor};">
      <div class="bonus-icon">${b.icon}</div>
      <div class="bonus-label">${b.label}</div>
      <div class="bonus-values">
        <span class="bonus-before">${b.before}</span>
        <span class="bonus-arrow">→</span>
        <span class="bonus-after" style="color:${accentColor};">${b.after}</span>
      </div>
      <div class="bonus-note">${b.note}</div>
    </div>
  `).join('');
  return `<div class="bonus-grid">${cards}</div>`;
}

// Build the full detail HTML for one event object
function buildEventDetailHTML(event, date) {
  return `
    <div class="event-block" style="--event-accent:${event.accentColor};">
      <div class="event-detail-header">
        <div class="event-detail-emoji">${event.emoji}</div>
        <div class="event-detail-meta">
          <div class="event-detail-date" style="color:${event.accentColor};">
            ${HU_DAYS[date.getDay()]} &nbsp;·&nbsp; ${formatDate(date)} &nbsp;·&nbsp; ⏰ ${event.timeRange}
          </div>
          <div class="event-detail-title">${event.title}</div>
        </div>
      </div>
      <p class="event-detail-desc">${event.desc}</p>
      ${buildBonusCards(event.bonuses, event.accentColor)}
      <div class="event-detail-tags">
        ${event.tags.map(t => `<span class="event-tag" style="--tag-color:${event.accentColor};">${t}</span>`).join('')}
      </div>
    </div>
  `;
}

// ---- Render -------------------------------------------------
function render() {
  const days = getWeekDates(currentWeekOffset);
  document.getElementById('weekLabel').textContent = formatWeekLabel(days);
  document.getElementById('prevWeek').disabled = currentWeekOffset <= -2;

  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  days.forEach((date, i) => {
    const dowIndex = date.getDay();
    const events   = WEEKLY_EVENTS[dowIndex];
    const today    = isToday(date);
    const isSelected = selectedDayIndex === i;
    const firstEvent = events ? events[0] : null;

    const card = document.createElement('div');
    card.className = [
      'day-card',
      events     ? 'has-event'  : '',
      today      ? 'today'      : '',
      isSelected ? 'active'     : '',
    ].filter(Boolean).join(' ');

    if (firstEvent) {
      card.style.setProperty('--day-accent', firstEvent.accentColor);
    }

    card.innerHTML = `
      <div class="day-name">${HU_DAYS_S[dowIndex]}</div>
      <div class="day-number">${date.getDate()}</div>
      ${firstEvent ? `
        <span class="day-event-thumb">
          ${events.length > 1
            ? events.map(e => `<span style="font-size:0.9em;">${e.emoji}</span>`).join('')
            : firstEvent.emoji}
        </span>
        <div class="day-event-name">${firstEvent.shortTitle}${events.length > 1 ? ` +${events.length - 1}` : ''}</div>
        <div class="day-event-time">${firstEvent.timeRange}</div>
      ` : `<div class="day-event-name" style="color:var(--text-muted);font-size:0.6rem;margin-top:0.5rem;">Nincs event</div>`}
    `;

    if (events) {
      card.addEventListener('click', () => {
        selectedDayIndex = isSelected ? null : i;
        render();
        if (selectedDayIndex !== null) showDetail(date, events);
        else hideDetail();
      });
    }

    grid.appendChild(card);
  });

  // Staggered fade-in animation
  document.querySelectorAll('.day-card').forEach((el, idx) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(14px)';
    el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 40 + idx * 35);
  });

  renderUpcoming(days);
}

function showDetail(date, events) {
  const panel = document.getElementById('eventDetail');

  const blocks = events.map(ev => buildEventDetailHTML(ev, date)).join(
    `<hr style="border:none;border-top:1px solid var(--border);margin:1.5rem 0;" />`
  );

  panel.innerHTML = `
    ${blocks}
    <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <a href="https://discord.gg/2Y6CSsPspF" target="_blank" rel="noopener" class="btn btn-discord">
        💬 &nbsp;Értesítés Discord-on
      </a>
      <a href="steam://connect/nexxon.ddns.net:27030" class="btn btn-primary">
        ▶ &nbsp;Csatlakozás az AWP szerverhez
      </a>
    </div>
  `;
  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideDetail() {
  document.getElementById('eventDetail').classList.remove('visible');
}

function renderUpcoming(days) {
  const list  = document.getElementById('upcomingList');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  list.innerHTML = '';

  let count = 0;
  days.forEach(date => {
    const dowIndex = date.getDay();
    const events   = WEEKLY_EVENTS[dowIndex];
    if (!events) return;

    const isTodayFlag = isToday(date);
    const isPast      = date < today && !isTodayFlag;

    // Render one list item per event on that day
    events.forEach(ev => {
      const item = document.createElement('div');
      item.className = `upcoming-item${isTodayFlag ? ' today-event' : ''}`;
      item.style.cssText = `
        opacity: ${isPast ? '0.4' : '1'};
        border-left-color: ${ev.accentColor};
      `;

      item.innerHTML = `
        <div class="upcoming-emoji">${ev.emoji}</div>
        <div class="upcoming-info">
          <div class="upcoming-day">
            ${HU_DAYS[dowIndex]}, ${formatDate(date)}
            ${isTodayFlag ? ' &nbsp;<span class="badge badge-temp">MA</span>' : ''}
            ${isPast      ? ' &nbsp;<span class="badge badge-expired">elmúlt</span>' : ''}
          </div>
          <div class="upcoming-title" style="color:${ev.accentColor};">${ev.title}</div>
          <div class="upcoming-desc">${ev.desc.slice(0, 110)}…</div>
        </div>
        <div class="upcoming-time" style="color:${ev.accentColor};">⏰ ${ev.timeRange}</div>
      `;

      item.addEventListener('click', () => {
        const gridIdx     = days.indexOf(date);
        selectedDayIndex  = gridIdx;
        render();
        showDetail(date, WEEKLY_EVENTS[date.getDay()]);
        document.getElementById('daysGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      list.appendChild(item);
      count++;
    });
  });

  if (count === 0) {
    list.innerHTML = '<div class="state-empty"><span class="state-icon">📭</span><p>Ezen a héten nincs event.</p></div>';
  }
}

// ---- Navigation ---------------------------------------------
document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekOffset--;
  selectedDayIndex = null;
  hideDetail();
  render();
});

document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekOffset++;
  selectedDayIndex = null;
  hideDetail();
  render();
});

// ---- Init ---------------------------------------------------
render();

// Auto-open today's event detail if one exists
(function () {
  const days    = getWeekDates(0);
  const todayIdx = days.findIndex(d => isToday(d));
  if (todayIdx === -1) return;
  const dowIdx  = days[todayIdx].getDay();
  if (WEEKLY_EVENTS[dowIdx]) {
    selectedDayIndex = todayIdx;
    render();
    showDetail(days[todayIdx], WEEKLY_EVENTS[dowIdx]);
  }
})();
