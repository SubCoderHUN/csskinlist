/* ============================================================
   events.js — Weekly event calendar with mock data
   ============================================================ */

// ---- Mock event data ----------------------------------------
// Pattern repeats every week. Keys = day-of-week (0=Sun, 1=Mon … 6=Sat)
const WEEKLY_EVENTS = {
  0: { // Vasárnap
    emoji: '🎯',
    title: 'AWP Only Sunday',
    shortTitle: 'AWP Only',
    time: '18:00',
    desc: 'Klasszikus AWP párbaj! Csak AWP fegyver engedélyezett ezen a napon. Mutasd meg, hogy ki az igazi mesterlövész a szerveren. A legtöbb kill játékos kap store pontokat!',
    tags: ['AWP Only', 'Vasárnap', 'Kihívás', 'Pontok'],
    color: '#00d4ff',
  },
  1: { // Hétfő
    emoji: '🔫',
    title: 'Pistol Monday',
    shortTitle: 'Pistol Round',
    time: '19:00',
    desc: 'Hétfőn csak pisztolyokkal lehet játszani! Teszteld az aim-edet pisztolyokkal. Desert Eagle, P250, Glock — melyik nyeri a napot? Top 3 játékos jutalmat kap!',
    tags: ['Pistol Only', 'Hétfő', 'Verseny'],
    color: '#ff6b00',
  },
  2: { // Kedd
    emoji: '🏃',
    title: 'No Scope Kedd',
    shortTitle: 'No Scope',
    time: '19:30',
    desc: 'AWP, SCOUT és SSG08 engedélyezve, de TILOS a scope! Csak hipfire lövések számítanak. A legszokatlanabb kihívás a héten — ki bírja jobban idegekkel?',
    tags: ['No Scope', 'AWP', 'Scout', 'Kedd'],
    color: '#00ff88',
  },
  3: { // Szerda
    emoji: '🎪',
    title: 'Random Weapons Szerda',
    shortTitle: 'Random Weapons',
    time: '20:00',
    desc: 'Minden körben random kapsz egy fegyvert! Soha nem tudod, mi jön legközelebb. Ez a hét legunpredictable evenje. Alkalmazkodj gyorsan, vagy maradsz le!',
    tags: ['Random', 'Szerda', 'Fun', 'Meglepetés'],
    color: '#ff3b3b',
  },
  4: { // Csütörtök
    emoji: '🏆',
    title: 'Tournament Thursday',
    shortTitle: 'Torna',
    time: '18:00',
    desc: 'Heti mini torna! Jelentkezz a Discord-on, és mérd össze tudásod a szerver legjobb játékosaival. A győztes prémium skin csomagot és store pontokat kap jutalmul!',
    tags: ['Torna', 'Csütörtök', 'Verseny', 'Jutalom'],
    color: '#ffd700',
  },
  5: { // Péntek
    emoji: '🎮',
    title: 'Free For All Péntek',
    shortTitle: 'FFA Péntek',
    time: '20:00',
    desc: 'Péntekenként FFA (Free For All) mód! Mindenki mindenki ellen. Nincs csapat, csak te és az ellenfeleid. A hétvége előtt a legjobb lehetőség, hogy királynak érezd magad!',
    tags: ['FFA', 'Péntek', 'Minden fegyver', 'Party'],
    color: '#7b5ea7',
  },
  6: { // Szombat
    emoji: '👑',
    title: 'King of AWP Szombat',
    shortTitle: 'King of AWP',
    time: '19:00',
    desc: 'A hét csúcspontja! Ki az igazi AWP király? Speciális pontrendszerrel, live scoreboard-dal és kommentárral. A végső győztes megkapja a heti "AWP King" rangot a Discordon!',
    tags: ['King of AWP', 'Szombat', 'Fő event', 'Rang'],
    color: '#ffd700',
  },
};

const HU_DAYS   = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
const HU_DAYS_S = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
const HU_MONTHS = ['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];

// ---- State --------------------------------------------------
let currentWeekOffset = 0; // 0 = this week, -1 = last week, +1 = next week
let selectedDayIndex  = null;

// ---- Helpers ------------------------------------------------
function getWeekDates(offset = 0) {
  const now  = new Date();
  const day  = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7); // Monday start
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
  return date.getDate() === t.getDate() &&
         date.getMonth() === t.getMonth() &&
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

// ---- Render -------------------------------------------------
function render() {
  const days = getWeekDates(currentWeekOffset);

  // Week label
  document.getElementById('weekLabel').textContent = formatWeekLabel(days);

  // Disable prev button beyond 2 weeks back (UX guard)
  document.getElementById('prevWeek').disabled = currentWeekOffset <= -2;

  // Day grid
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  days.forEach((date, i) => {
    const dowIndex = date.getDay(); // 0=Sun
    // Map grid index (Mon=0) to day-of-week
    const event = WEEKLY_EVENTS[dowIndex];
    const today = isToday(date);
    const isSelected = selectedDayIndex === i;

    const card = document.createElement('div');
    card.className = [
      'day-card',
      event ? 'has-event' : '',
      today   ? 'today'   : '',
      isSelected ? 'active' : '',
    ].filter(Boolean).join(' ');

    card.innerHTML = `
      <div class="day-name">${HU_DAYS_S[dowIndex]}</div>
      <div class="day-number">${date.getDate()}</div>
      ${event ? `
        <span class="day-event-thumb">${event.emoji}</span>
        <div class="day-event-name">${event.shortTitle}</div>
      ` : `<div class="day-event-name" style="color:var(--text-muted);font-size:0.6rem;">Nincs event</div>`}
    `;

    if (event) {
      card.addEventListener('click', () => {
        selectedDayIndex = isSelected ? null : i;
        render(); // re-render to update active state
        if (selectedDayIndex !== null) showDetail(date, event);
        else hideDetail();
      });
    }

    grid.appendChild(card);
  });

  // Trigger re-observation for animations
  if (typeof IntersectionObserver !== 'undefined') {
    document.querySelectorAll('.day-card').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 50 + Array.from(el.parentNode.children).indexOf(el) * 40);
    });
  }

  renderUpcoming(days);
}

function showDetail(date, event) {
  const panel = document.getElementById('eventDetail');
  panel.innerHTML = `
    <div class="event-detail-header">
      <div class="event-detail-emoji">${event.emoji}</div>
      <div class="event-detail-meta">
        <div class="event-detail-date">
          ${HU_DAYS[date.getDay()]} &nbsp;·&nbsp; ${formatDate(date)} &nbsp;·&nbsp; ⏰ ${event.time}
        </div>
        <div class="event-detail-title">${event.title}</div>
      </div>
    </div>
    <p class="event-detail-desc">${event.desc}</p>
    <div class="event-detail-tags">
      ${event.tags.map(t => `<span class="event-tag">${t}</span>`).join('')}
    </div>
    <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <a href="https://discord.gg/2Y6CSsPspF" target="_blank" rel="noopener" class="btn btn-discord">
        💬 &nbsp;Értesítés Discord-on
      </a>
      <a href="steam://connect/connect" class="btn btn-primary">
        ▶ &nbsp;Csatlakozás a szerverhez
      </a>
    </div>
  `;
  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideDetail() {
  const panel = document.getElementById('eventDetail');
  panel.classList.remove('visible');
}

function renderUpcoming(days) {
  const list = document.getElementById('upcomingList');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  list.innerHTML = '';

  let count = 0;
  days.forEach(date => {
    const dowIndex = date.getDay();
    const event = WEEKLY_EVENTS[dowIndex];
    if (!event) return;

    const isTodayFlag = isToday(date);
    const isPast = date < today && !isTodayFlag;

    const item = document.createElement('div');
    item.className = `upcoming-item${isTodayFlag ? ' today-event' : ''}`;
    item.style.opacity = isPast ? '0.45' : '1';

    item.innerHTML = `
      <div class="upcoming-emoji">${event.emoji}</div>
      <div class="upcoming-info">
        <div class="upcoming-day">
          ${HU_DAYS[dowIndex]}, ${formatDate(date)}
          ${isTodayFlag ? ' &nbsp;<span class="badge badge-temp">MA</span>' : ''}
          ${isPast      ? ' &nbsp;<span class="badge badge-expired">elmúlt</span>' : ''}
        </div>
        <div class="upcoming-title">${event.title}</div>
        <div class="upcoming-desc">${event.desc.slice(0, 100)}…</div>
      </div>
      <div class="upcoming-time">⏰ ${event.time}</div>
    `;

    item.addEventListener('click', () => {
      const gridIdx = days.indexOf(date);
      selectedDayIndex = gridIdx;
      render();
      showDetail(date, event);
      document.getElementById('daysGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    list.appendChild(item);
    count++;
  });

  if (count === 0) {
    list.innerHTML = '<div class="state-empty"><span class="state-icon">📭</span><p>Ezen a héten nincs event.</p></div>';
  }
}

// ---- Navigation events --------------------------------------
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

// Auto-select today if it has an event
(function () {
  const days = getWeekDates(0);
  const todayIdx = days.findIndex(d => isToday(d));
  if (todayIdx !== -1) {
    const dowIdx = days[todayIdx].getDay();
    if (WEEKLY_EVENTS[dowIdx]) {
      selectedDayIndex = todayIdx;
      render();
      showDetail(days[todayIdx], WEEKLY_EVENTS[dowIdx]);
    }
  }
})();
