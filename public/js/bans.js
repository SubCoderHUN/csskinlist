/* ============================================================
   bans.js — Ban list with search, pagination, and API calls
   ============================================================ */

const STATE = {
  page:    1,
  limit:   20,
  search:  '',
  total:   0,
  pages:   1,
  loading: false,
};

const COUNTRY_FLAGS = {
  HU: '🇭🇺', SK: '🇸🇰', RO: '🇷🇴', PL: '🇵🇱', DE: '🇩🇪',
  AT: '🇦🇹', CZ: '🇨🇿', RS: '🇷🇸', HR: '🇭🇷', UA: '🇺🇦',
  RU: '🇷🇺', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷', IT: '🇮🇹',
};

// ---- Helpers ------------------------------------------------
function getFlag(code) {
  return COUNTRY_FLAGS[code] || '🏳️';
}

function formatTimestamp(unixSeconds) {
  if (!unixSeconds) return '—';
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) +
         ' ' + d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

function formatExpiry(endsUnix, lengthMinutes) {
  if (!lengthMinutes || lengthMinutes === 0) {
    return '<span class="badge badge-perm">VÉGLEGES</span>';
  }
  if (!endsUnix || endsUnix === 0) {
    return '<span class="badge badge-perm">VÉGLEGES</span>';
  }
  const now = Date.now() / 1000;
  if (endsUnix < now) {
    return '<span class="badge badge-expired">lejárt</span>';
  }

  const diff = endsUnix - now;
  let label;
  if (diff < 3600)        label = `${Math.ceil(diff / 60)} perc`;
  else if (diff < 86400)  label = `${Math.ceil(diff / 3600)} óra`;
  else                    label = `${Math.ceil(diff / 86400)} nap`;

  return `<span class="badge badge-temp">${label}</span>`;
}

function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str || '—';
  return d.innerHTML;
}

// ---- Fetch --------------------------------------------------
async function fetchBans() {
  if (STATE.loading) return;
  STATE.loading = true;
  setLoadingState(true);

  const params = new URLSearchParams({
    page:   STATE.page,
    limit:  STATE.limit,
    search: STATE.search,
  });

  try {
    const res  = await fetch(`/api/bans?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    STATE.total = data.total;
    STATE.pages = data.pages;

    renderTable(data.bans, data.mock);
    renderPagination();
    renderCount(data.mock);
  } catch (err) {
    renderError(err.message);
  } finally {
    STATE.loading = false;
    setLoadingState(false);
  }
}

// ---- Render -------------------------------------------------
function setLoadingState(loading) {
  const tbody = document.getElementById('bansTableBody');
  if (loading && tbody.children.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div style="padding:3rem;text-align:center;color:var(--text-muted);">
          ⏳&nbsp; Adatok betöltése...
        </div>
      </td></tr>`;
  }
}

function renderTable(bans, isMock) {
  const mockNotice = document.getElementById('mockNotice');
  if (isMock) {
    mockNotice.style.display = 'flex';
  } else {
    mockNotice.style.display = 'none';
  }

  const tbody = document.getElementById('bansTableBody');

  if (!bans || bans.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="state-empty">
          <span class="state-icon">🔍</span>
          <strong>Nincs találat</strong>
          <p>Nem található bannolt játékos a keresési feltételeknek megfelelően.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = bans.map((ban, i) => {
    const rowNum = (STATE.page - 1) * STATE.limit + i + 1;
    return `
      <tr>
        <td style="color:var(--text-muted);font-family:var(--font-ui);">${rowNum}</td>
        <td>
          <div class="player-name">${sanitize(ban.name)}</div>
          <div class="steam-id">${sanitize(ban.authid)}</div>
        </td>
        <td class="ban-reason">${sanitize(ban.reason)}</td>
        <td>${formatExpiry(ban.ends, ban.length)}</td>
        <td class="ban-date">${formatTimestamp(ban.created)}</td>
        <td class="ban-date">
          ${ban.length === 0 ? '<span class="badge badge-perm">VÉGLEGES</span>' : formatTimestamp(ban.ends)}
        </td>
        <td>
          <span style="font-size:0.82rem;color:var(--text-muted);">
            ${getFlag(ban.country)}&nbsp;${sanitize(ban.admin_name)}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCount(isMock) {
  const el = document.getElementById('bansCount');
  el.innerHTML = `Összesen: <strong>${STATE.total}</strong> ban${isMock ? ' <span class="badge badge-mock">demo</span>' : ''}`;
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (STATE.pages <= 1) { container.innerHTML = ''; return; }

  const { page, pages } = STATE;
  const buttons = [];

  // Prev
  buttons.push(`<button class="page-btn" onclick="goToPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>&#8592;</button>`);

  // Page numbers — show a window of 5
  const start = Math.max(1, page - 2);
  const end   = Math.min(pages, page + 2);

  if (start > 1) {
    buttons.push(`<button class="page-btn" onclick="goToPage(1)">1</button>`);
    if (start > 2) buttons.push(`<span style="color:var(--text-muted);padding:0 0.25rem;">…</span>`);
  }

  for (let p = start; p <= end; p++) {
    buttons.push(`<button class="page-btn ${p === page ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`);
  }

  if (end < pages) {
    if (end < pages - 1) buttons.push(`<span style="color:var(--text-muted);padding:0 0.25rem;">…</span>`);
    buttons.push(`<button class="page-btn" onclick="goToPage(${pages})">${pages}</button>`);
  }

  // Next
  buttons.push(`<button class="page-btn" onclick="goToPage(${page + 1})" ${page === pages ? 'disabled' : ''}>&#8594;</button>`);

  container.innerHTML = buttons.join('');
}

function renderError(msg) {
  document.getElementById('bansTableBody').innerHTML = `
    <tr><td colspan="7">
      <div class="state-error">
        <span class="state-icon">⚠️</span>
        <strong>Hiba az adatok betöltésekor</strong>
        <p>${sanitize(msg)}</p>
      </div>
    </td></tr>`;
  document.getElementById('pagination').innerHTML = '';
  document.getElementById('bansCount').textContent = '';
}

// ---- Global navigation (called from inline onclick) ---------
window.goToPage = function (page) {
  if (page < 1 || page > STATE.pages || page === STATE.page) return;
  STATE.page = page;
  fetchBans();
  window.scrollTo({ top: document.querySelector('.bans-controls').offsetTop - 80, behavior: 'smooth' });
};

// ---- Search (debounced) -------------------------------------
let searchTimer = null;

document.getElementById('searchInput').addEventListener('input', function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    STATE.search = this.value.trim();
    STATE.page   = 1;
    fetchBans();
  }, 420);
});

// ---- Init ---------------------------------------------------
fetchBans();
