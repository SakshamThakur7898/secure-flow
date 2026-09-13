// public/js/api.js — shared helpers used by every page.
const SecureFlow = (() => {
  async function apiFetch(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data: data || {} };
  }

  function showAlert(el, type, message) {
    if (!el) return;
    el.className = `alert alert-${type} show`;
    el.textContent = message;
  }
  function hideAlert(el) {
    if (!el) return;
    el.className = 'alert';
  }

  function fieldError(input, message) {
    const wrap = input.closest('.field');
    if (!wrap) return;
    input.classList.add('invalid');
    const err = wrap.querySelector('.field-error');
    if (err) { err.textContent = message; err.classList.add('show'); }
  }
  function clearFieldErrors(form) {
    form.querySelectorAll('input').forEach((i) => i.classList.remove('invalid'));
    form.querySelectorAll('.field-error').forEach((e) => { e.classList.remove('show'); e.textContent = ''; });
  }

  // Reusable Yes/No confirmation modal (styled to match the app, instead
  // of the native browser confirm()). Returns a Promise<boolean>.
  function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      let overlay = document.getElementById('sf-confirm-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sf-confirm-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
          <div class="modal-card" style="max-width:380px;">
            <h3 id="sf-confirm-title"></h3>
            <div class="modal-subtitle" id="sf-confirm-message"></div>
            <div class="row gap-8 mt-16">
              <button class="btn" id="sf-confirm-yes"></button>
              <button class="btn btn-secondary" id="sf-confirm-no">Cancel</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
      }
      overlay.querySelector('#sf-confirm-title').textContent = title;
      overlay.querySelector('#sf-confirm-message').textContent = message;
      const yesBtn = overlay.querySelector('#sf-confirm-yes');
      const noBtn = overlay.querySelector('#sf-confirm-no');
      yesBtn.textContent = confirmLabel;
      yesBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      overlay.classList.add('show');

      function cleanup(result) {
        overlay.classList.remove('show');
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
        overlay.removeEventListener('click', onBackdrop);
        resolve(result);
      }
      function onYes() { cleanup(true); }
      function onNo() { cleanup(false); }
      function onBackdrop(e) { if (e.target === overlay) cleanup(false); }

      yesBtn.addEventListener('click', onYes);
      noBtn.addEventListener('click', onNo);
      overlay.addEventListener('click', onBackdrop);
    });
  }

  function initials(fullName = '') {
    return fullName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
  }

  function verificationBadge(status) {
    const map = {
      verified: ['badge-green', 'Verified'],
      pending: ['badge-amber', 'Pending'],
      rejected: ['badge-red', 'Rejected'],
    };
    const [cls, label] = map[status] || ['badge-gray', status];
    return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
  }
  function accountBadge(status) {
    const map = {
      active: ['badge-green', 'Active'],
      pending: ['badge-amber', 'Pending'],
      disabled: ['badge-red', 'Disabled'],
      rejected: ['badge-red', 'Rejected'],
    };
    const [cls, label] = map[status] || ['badge-gray', status];
    return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
  }
  function roleBadge(role) {
    return `<span class="badge badge-indigo"><span class="dot"></span>${role}</span>`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function timeOnly(iso) {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleTimeString(undefined, { hour12: false });
  }

  async function requireUser() {
    const { ok, data } = await apiFetch('/api/auth/me');
    if (!ok) { window.location.href = '/'; return null; }
    return data.user;
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  function renderSidebar(activePath, user) {
    const mount = document.getElementById('sidebar-mount');
    if (!mount) return;
    const isAdmin = user.role === 'Admin';
    const isManager = user.role === 'Manager';

    const links = [{ href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' }];
    if (isAdmin) {
      links.push(
        { href: '/admin', label: 'Admin Overview', icon: 'shield-check' },
        { href: '/admin#users', label: 'Users', icon: 'users' },
        { href: '/admin#verification', label: 'Employee Verification', icon: 'user-check' },
        { href: '/admin#roles', label: 'Role Management', icon: 'key-round' },
        { href: '/testing', label: 'Testing', icon: 'flask-conical' },
      );
    } else if (isManager) {
      links.push({ href: '/admin', label: 'Manager Dashboard', icon: 'users' });
    }

    mount.innerHTML = `
      <div class="brand">
        <div class="brand-mark">SF</div>
        <div class="brand-name">SecureFlow<small>User Management</small></div>
      </div>
      <nav>
        ${links.map((l) => `
          <a class="nav-link ${activePath === l.href.split('#')[0] ? 'active' : ''}" href="${l.href}">
            <i data-lucide="${l.icon}" style="width:16px;height:16px"></i>${l.label}
          </a>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="row gap-10" style="padding: 8px;">
          <div class="avatar" style="width:32px;height:32px;font-size:12px;">${initials(user.fullName)}</div>
          <div style="min-width:0;">
            <div style="font-size:13px;font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.fullName}</div>
            <div style="font-size:11.5px; color: var(--text-muted);">${user.role}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-block mt-8" id="logout-btn">
          <i data-lucide="log-out" style="width:15px;height:15px"></i>Log out
        </button>
      </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', logout);
    injectMobileNav();
    // On mobile, tapping any nav link (or a hash-only jump to the same
    // page, which won't trigger a fresh page load) should close the drawer.
    mount.querySelectorAll('.nav-link').forEach((a) => a.addEventListener('click', closeMobileNav));
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------------------------------------------------------------
  // Mobile navigation: a hamburger topbar + slide-in drawer, built once
  // and reused by every page that has a <aside class="sidebar">
  // (Dashboard, Admin, Testing). Desktop screens never see any of this
  // -- it's hidden entirely by CSS above the 860px breakpoint.
  // ---------------------------------------------------------------------
  function closeMobileNav() {
    document.body.classList.remove('sidebar-open');
  }
  function injectMobileNav() {
    if (!document.querySelector('.mobile-topbar')) {
      const topbar = document.createElement('div');
      topbar.className = 'mobile-topbar';
      topbar.innerHTML = `
        <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Open menu">
          <i data-lucide="menu" style="width:18px;height:18px"></i>
        </button>
        <div class="brand-mark">SF</div>
        <div class="brand-name">SecureFlow</div>
      `;
      document.body.insertBefore(topbar, document.body.firstChild);
      topbar.querySelector('#sidebar-toggle-btn').addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
      });
    }
    if (!document.querySelector('.sidebar-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.addEventListener('click', closeMobileNav);
      document.body.appendChild(backdrop);
    }
    if (window.lucide) window.lucide.createIcons();
  }

  return {
    apiFetch, showAlert, hideAlert, fieldError, clearFieldErrors, initials,
    verificationBadge, accountBadge, roleBadge, formatDate, timeOnly,
    requireUser, logout, renderSidebar, confirmDialog,
  };
})();
