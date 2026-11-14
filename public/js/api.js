/* Shared API client, session helpers and UI utilities */
(function () {
  const TOKEN_KEY = 'sha_token';
  const USER_KEY = 'sha_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function redirectByRole(user) {
    if (!user) {
      window.location.href = '/login.html';
      return;
    }
    if (user.role === 'patient') window.location.href = '/patient/dashboard.html';
    else if (user.role === 'doctor') window.location.href = '/doctor/dashboard.html';
    else if (user.role === 'admin') window.location.href = '/admin/dashboard.html';
    else window.location.href = '/login.html';
  }

  function requireAuth(allowedRoles) {
    const user = getUser();
    const token = getToken();
    if (!token || !user) {
      window.location.href = '/login.html';
      return null;
    }
    if (allowedRoles && allowedRoles.length && !allowedRoles.includes(user.role)) {
      redirectByRole(user);
      return null;
    }
    return user;
  }

  function logout() {
    clearSession();
    window.location.href = '/login.html';
  }

  async function apiRequest(path, options = {}) {
    const { method = 'GET', body, auth = true, headers = {} } = options;
    const opts = { method, headers: { ...headers } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const token = getToken();
    if (auth && token) opts.headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`/api${path}`, opts);
    } catch (_) {
      throw new Error('Network error. Please check that the server is running.');
    }

    let data = {};
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = { message: text };
      }
    }

    if (res.status === 401 && auth) {
      clearSession();
      if (!window.location.pathname.endsWith('/login.html')) {
        window.location.href = '/login.html?expired=1';
      }
      throw new Error(data.message || 'Session expired. Please log in again.');
    }

    if (!res.ok) {
      const err = new Error(data.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.errors = data.errors || null;
      throw err;
    }
    return data;
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message, type = 'success', timeout = 4200) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = `app-toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info} mt-1"></i>
      <div class="flex-grow-1">${escapeHtml(message)}</div>
      <button type="button" class="toast-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`;
    el.querySelector('.toast-close').addEventListener('click', () => el.remove());
    stack.appendChild(el);
    setTimeout(() => el.remove(), timeout);
  }

  function openModal(html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    const el = wrapper.firstElementChild;
    document.body.appendChild(el);
    const modal = new bootstrap.Modal(el);
    el.addEventListener('hidden.bs.modal', () => el.remove());
    modal.show();
    return { modal, el };
  }

  function confirmDialog(options = {}) {
    const {
      title = 'Please confirm',
      message = 'Are you sure you want to continue?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      danger = false
    } = options;
    return new Promise((resolve) => {
      const { modal, el } = openModal(`
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${escapeHtml(title)}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body"><p class="mb-0">${escapeHtml(message)}</p></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">${escapeHtml(cancelText)}</button>
                <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmText)}</button>
              </div>
            </div>
          </div>
        </div>`);
      let done = false;
      el.querySelector('[data-confirm]').addEventListener('click', () => {
        done = true;
        modal.hide();
        resolve(true);
      });
      el.addEventListener('hidden.bs.modal', () => {
        if (!done) resolve(false);
      });
    });
  }

  function promptDialog(options = {}) {
    const {
      title = 'Reason',
      message = '',
      placeholder = 'Enter a reason (optional)',
      confirmText = 'Submit',
      danger = false
    } = options;
    return new Promise((resolve) => {
      const { modal, el } = openModal(`
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${escapeHtml(title)}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                ${message ? `<p class="text-muted small">${escapeHtml(message)}</p>` : ''}
                <textarea class="form-control" rows="3" maxlength="500" placeholder="${escapeHtml(placeholder)}"></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmText)}</button>
              </div>
            </div>
          </div>
        </div>`);
      let result = null;
      el.querySelector('[data-confirm]').addEventListener('click', () => {
        result = el.querySelector('textarea').value.trim();
        modal.hide();
      });
      el.addEventListener('hidden.bs.modal', () => resolve(result));
    });
  }

  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseParts(value) {
    if (!value) return null;
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    return {
      y: +m[1], mo: +m[2], da: +m[3],
      h: m[4] !== undefined ? +m[4] : 0,
      mi: m[5] !== undefined ? +m[5] : 0
    };
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function fmtDate(value) {
    const p = parseParts(value);
    if (!p) return value || '';
    const dow = new Date(Date.UTC(p.y, p.mo - 1, p.da)).getUTCDay();
    return `${DAY_SHORT[dow]}, ${p.da} ${MONTH_SHORT[p.mo - 1]} ${p.y}`;
  }

  function fmtDateShort(value) {
    const p = parseParts(value);
    if (!p) return value || '';
    return `${p.da} ${MONTH_SHORT[p.mo - 1]} ${p.y}`;
  }

  function fmtTime(value) {
    const p = parseParts(value);
    if (!p) return '';
    const h12 = p.h % 12 || 12;
    return `${pad(h12)}:${pad(p.mi)} ${p.h < 12 ? 'AM' : 'PM'}`;
  }

  function fmtDateTime(value) {
    const p = parseParts(value);
    if (!p) return value || '';
    return `${fmtDate(value)}, ${fmtTime(value)}`;
  }

  function fmtIsoDate(value) {
    const p = parseParts(value);
    if (!p) return '';
    return `${p.y}-${pad(p.mo)}-${pad(p.da)}`;
  }

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function istNowWall() {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const map = {};
    fmt.formatToParts(new Date()).forEach((p) => { if (p.type !== 'literal') map[p.type] = p.value; });
    return new Date(Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour % 24, +map.minute, +map.second));
  }

  function hoursUntil(value) {
    const p = parseParts(value);
    if (!p) return NaN;
    const target = Date.UTC(p.y, p.mo - 1, p.da, p.h, p.mi, 0);
    return (target - istNowWall().getTime()) / 3600000;
  }

  function addDaysIso(iso, days) {
    const p = parseParts(iso);
    const d = new Date(Date.UTC(p.y, p.mo - 1, p.da));
    d.setUTCDate(d.getUTCDate() + days);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }

  function statusBadge(status) {
    const labels = { booked: 'Booked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    return `<span class="badge-status badge-${status}">${labels[status] || escapeHtml(status)}</span>`;
  }

  function smsBadge(status) {
    const labels = { sent: 'Sent', simulated: 'Simulated', failed: 'Failed' };
    return `<span class="badge-status badge-${status}">${labels[status] || escapeHtml(status)}</span>`;
  }

  function money(value) {
    const n = Number(value || 0);
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  function qs(params) {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    return parts.length ? `?${parts.join('&')}` : '';
  }

  function setLoading(container, text = 'Loading...') {
    if (container) {
      container.innerHTML = `<div class="loading-box"><span class="spinner-border spinner-border-sm text-primary"></span> ${escapeHtml(text)}</div>`;
    }
  }

  function emptyState(icon, title, text) {
    return `<div class="empty-state"><i class="fa-solid ${icon}"></i><h6>${escapeHtml(title)}</h6><p>${escapeHtml(text || '')}</p></div>`;
  }

  function debounce(fn, wait = 300) {
    let t;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  window.Auth = {
    getToken, getUser, saveSession, clearSession, requireAuth, redirectByRole, logout
  };
  window.API = {
    request: apiRequest,
    toast, escapeHtml, confirmDialog, promptDialog, openModal,
    fmtDate, fmtDateShort, fmtTime, fmtDateTime, fmtIsoDate, todayIso, addDaysIso, istNowWall, hoursUntil,
    statusBadge, smsBadge, money, initials, qs, setLoading, emptyState, debounce, parseParts
  };
})();
