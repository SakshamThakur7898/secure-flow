(function () {
  let CURRENT_USER = null;
  let IS_ADMIN = false;

  const TABS_ADMIN = [
    { key: 'overview', label: 'Overview', icon: 'layout-grid' },
    { key: 'users', label: 'Users', icon: 'users' },
    { key: 'verification', label: 'Employee Verification', icon: 'user-check' },
    { key: 'roles', label: 'Role Management', icon: 'key-round' },
  ];
  const TABS_MANAGER = [
    { key: 'employees', label: 'Employees', icon: 'users' },
  ];

  function setTab(key) {
    document.querySelectorAll('[id^="tab-"]').forEach((el) => { el.style.display = 'none'; });
    const target = document.getElementById(`tab-${key}`);
    if (target) target.style.display = '';
    document.querySelectorAll('.tab-pill').forEach((el) => {
      el.classList.toggle('btn-primary', el.dataset.tab === key);
      el.classList.toggle('btn-secondary', el.dataset.tab !== key);
    });
    const titles = {
      overview: ['Admin Dashboard', 'Overview', 'Organization-wide user management at a glance.'],
      users: ['Admin Dashboard', 'All Users', 'Every account in the system, with quick actions.'],
      verification: ['Admin Dashboard', 'Employee Verification', 'Review and act on newly registered accounts.'],
      roles: ['Admin Dashboard', 'Role Management', 'Assign and change user roles.'],
      employees: ['Manager Dashboard', 'Employees', 'Employee accounts visible to your role.'],
    };
    const [eyebrow, title, subtitle] = titles[key] || titles.overview;
    document.getElementById('page-eyebrow').textContent = eyebrow;
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;
    if (key === 'overview') loadOverview();
    if (key === 'users') loadUsers();
    if (key === 'verification') loadVerification();
    if (key === 'roles') loadRoles();
    if (key === 'employees') loadEmployees();

    // Keep exactly one sidebar link highlighted, matching the visible tab
    // (previously every /admin link lit up together, since they all share
    // the same base path and only differ by hash).
    document.querySelectorAll('#sidebar-mount .nav-link').forEach((a) => {
      const [path, hash = ''] = a.getAttribute('href').split('#');
      const isThisTab = path === '/admin' && (hash === key || (hash === '' && key === 'overview'));
      a.classList.toggle('active', isThisTab);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function buildTabBar() {
    const tabs = IS_ADMIN ? TABS_ADMIN : TABS_MANAGER;
    document.getElementById('tab-bar').innerHTML = tabs.map((t) => `
      <button class="btn btn-sm tab-pill" data-tab="${t.key}">
        <i data-lucide="${t.icon}" style="width:14px;height:14px"></i>${t.label}
      </button>
    `).join('');
    document.querySelectorAll('.tab-pill').forEach((btn) => {
      btn.addEventListener('click', () => setTab(btn.dataset.tab));
    });
  }

  function icon(name, color) {
    return `<div class="stat-icon" style="background:${color}1a; color:${color};"><i data-lucide="${name}" style="width:17px;height:17px"></i></div>`;
  }

  async function loadOverview() {
    const mount = document.getElementById('overview-cards');
    mount.innerHTML = Array(5).fill('<div class="card"><div class="skeleton skeleton-line"></div></div>').join('');
    const { ok, data } = await SecureFlow.apiFetch('/api/admin/overview');
    if (!ok) { mount.innerHTML = `<div class="alert alert-error show">${data.error || 'Could not load overview.'}</div>`; return; }

    mount.innerHTML = `
      <div class="card hoverable stat-card">${icon('users', '#4f5fe0')}<div class="stat-label">Total Users</div><div class="stat-value">${data.totalUsers}</div></div>
      <div class="card hoverable stat-card">${icon('user-check', '#17a35a')}<div class="stat-label">Verified Employees</div><div class="stat-value">${data.verifiedEmployees}</div></div>
      <div class="card hoverable stat-card">${icon('hourglass', '#d9910a')}<div class="stat-label">Pending Verification</div><div class="stat-value">${data.pendingVerification}</div></div>
      <div class="card hoverable stat-card">${icon('shield-check', '#17a35a')}<div class="stat-label">Active Users</div><div class="stat-value">${data.activeUsers}</div></div>
      <div class="card hoverable stat-card">${icon('shield-x', '#e0473f')}<div class="stat-label">Disabled Users</div><div class="stat-value">${data.disabledUsers}</div></div>
    `;

    document.getElementById('recent-registrations').innerHTML = data.recentRegistrations.length
      ? data.recentRegistrations.map((u) => `
        <div class="row-between" style="padding:10px 0; border-bottom:1px solid var(--border);">
          <div class="row gap-10">
            <div class="avatar">${SecureFlow.initials(u.fullName)}</div>
            <div><div style="font-weight:600; font-size:13.5px;">${u.fullName}</div><div class="text-faint" style="font-size:12px;">${u.department}</div></div>
          </div>
          <div style="text-align:right;">${SecureFlow.verificationBadge(u.verificationStatus)}<div class="text-faint" style="font-size:11.5px; margin-top:4px;">${SecureFlow.formatDate(u.createdAt)}</div></div>
        </div>`).join('')
      : '<div class="empty-row">No registrations yet.</div>';

    document.getElementById('recent-activity').innerHTML = data.recentVerificationActivity.length
      ? data.recentVerificationActivity.map((a) => `
        <div class="row gap-10" style="padding:10px 0; border-bottom:1px solid var(--border);">
          <div class="status-dot ${a.action === 'verified' ? 'passed' : 'failed'}"></div>
          <div style="font-size:13px;"><strong>${a.adminName}</strong> ${a.action} <strong>${a.userName}</strong>
            <div class="text-faint" style="font-size:11.5px;">${SecureFlow.formatDate(a.timestamp)}</div></div>
        </div>`).join('')
      : '<div class="empty-row">No verification activity yet.</div>';

    const total = data.roleDistribution.Employee + data.roleDistribution.Manager + data.roleDistribution.Admin || 1;
    const bars = [
      ['Employee', data.roleDistribution.Employee, '#4f5fe0'],
      ['Manager', data.roleDistribution.Manager, '#d9910a'],
      ['Admin', data.roleDistribution.Admin, '#17a35a'],
    ];
    document.getElementById('role-distribution').innerHTML = bars.map(([label, count, color]) => `
      <div class="mb-12">
        <div class="row-between" style="font-size:13px; margin-bottom:6px;"><span>${label}</span><span class="text-muted">${count}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${(count / total) * 100}%; background:${color};"></div></div>
      </div>`).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  async function loadUsers() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><span class="spinner"></span></td></tr>`;
    const status = document.getElementById('users-filter').value;
    const { ok, data } = await SecureFlow.apiFetch(`/api/admin/users${status ? `?status=${status}` : ''}`);
    if (!ok) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">${data.error || 'Could not load users.'}</td></tr>`; return; }
    if (!data.users.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No users match this filter.</td></tr>`; return; }

    tbody.innerHTML = data.users.map((u) => `
      <tr>
        <td><div style="font-weight:600;">${u.fullName}</div><div class="text-faint" style="font-size:12px;">${u.username}</div></td>
        <td>${u.employeeId}</td>
        <td>${u.email}</td>
        <td>${SecureFlow.roleBadge(u.role)}</td>
        <td>${SecureFlow.verificationBadge(u.verificationStatus)}</td>
        <td>${SecureFlow.accountBadge(u.accountStatus)}</td>
        <td>
          ${u.accountStatus === 'active'
            ? `<button class="btn btn-sm btn-secondary" data-action="disable" data-id="${u.id}">Disable</button>`
            : u.accountStatus === 'disabled'
              ? `<button class="btn btn-sm btn-secondary" data-action="enable" data-id="${u.id}">Enable</button>`
              : '<span class="text-faint" style="font-size:12px;">—</span>'}
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.action === 'disable' ? 'disabled' : 'active';
        btn.disabled = true;
        await SecureFlow.apiFetch(`/api/admin/users/${btn.dataset.id}/status`, { method: 'POST', body: { status } });
        loadUsers();
      });
    });
  }

  async function loadVerification() {
    const tbody = document.querySelector('#verification-table tbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row"><span class="spinner"></span></td></tr>`;
    const { ok, data } = await SecureFlow.apiFetch('/api/admin/users?status=pending');
    if (!ok) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">${data.error || 'Could not load pending users.'}</td></tr>`; return; }
    if (!data.users.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No accounts are awaiting verification.</td></tr>`; return; }

    tbody.innerHTML = data.users.map((u) => `
      <tr id="verify-row-${u.id}">
        <td>${u.fullName}</td>
        <td>${u.employeeId}</td>
        <td>${u.email}</td>
        <td>${u.department}</td>
        <td>${SecureFlow.formatDate(u.createdAt)}</td>
        <td>${SecureFlow.verificationBadge(u.verificationStatus)}</td>
        <td class="row gap-8">
          <button class="btn btn-sm btn-primary" data-verify="${u.id}">Verify</button>
          <button class="btn btn-sm btn-danger" data-reject="${u.id}">Reject</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-verify]').forEach((btn) => btn.addEventListener('click', async () => {
      btn.disabled = true;
      await SecureFlow.apiFetch(`/api/admin/users/${btn.dataset.verify}/verify`, { method: 'POST' });
      loadVerification(); loadOverview();
    }));
    tbody.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', async () => {
      btn.disabled = true;
      await SecureFlow.apiFetch(`/api/admin/users/${btn.dataset.reject}/reject`, { method: 'POST' });
      loadVerification(); loadOverview();
    }));
  }

  async function loadRoles() {
    const tbody = document.querySelector('#roles-table tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row"><span class="spinner"></span></td></tr>`;
    const { ok, data } = await SecureFlow.apiFetch('/api/admin/users');
    if (!ok) { tbody.innerHTML = `<tr><td colspan="6" class="empty-row">${data.error || 'Could not load users.'}</td></tr>`; return; }

    tbody.innerHTML = data.users.map((u) => `
      <tr id="role-row-${u.id}">
        <td>${u.fullName}</td>
        <td>${u.username}</td>
        <td>${SecureFlow.roleBadge(u.role)}</td>
        <td>${SecureFlow.accountBadge(u.accountStatus)}</td>
        <td>
          <div class="row gap-8">
            <select data-role-select="${u.id}" style="width:auto;">
              <option value="Employee" ${u.role === 'Employee' ? 'selected' : ''}>Employee</option>
              <option value="Manager" ${u.role === 'Manager' ? 'selected' : ''}>Manager</option>
              <option value="Admin" ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
            </select>
            <button class="btn btn-sm btn-primary" data-save-role="${u.id}">Save</button>
          </div>
        </td>
        <td><span class="text-faint" style="font-size:12px;" data-role-status="${u.id}">&nbsp;</span></td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-save-role]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.saveRole;
      const select = tbody.querySelector(`[data-role-select="${id}"]`);
      const statusEl = tbody.querySelector(`[data-role-status="${id}"]`);
      btn.disabled = true;
      const { ok, data } = await SecureFlow.apiFetch(`/api/admin/users/${id}/role`, { method: 'POST', body: { role: select.value } });
      statusEl.textContent = ok ? 'Updated ✓' : (data.error || 'Failed');
      statusEl.style.color = ok ? 'var(--green-600)' : 'var(--red-600)';
      btn.disabled = false;
      loadOverview();
    }));
  }

  async function loadEmployees() {
    const tbody = document.querySelector('#employees-table tbody');
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row"><span class="spinner"></span></td></tr>`;
    const { ok, data } = await SecureFlow.apiFetch('/api/manager/employees');
    if (!ok) { tbody.innerHTML = `<tr><td colspan="4" class="empty-row">${data.error || 'Could not load employees.'}</td></tr>`; return; }
    if (!data.employees.length) { tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No employees found.</td></tr>`; return; }
    tbody.innerHTML = data.employees.map((e) => `
      <tr><td>${e.fullName}</td><td>${e.employeeId}</td><td>${e.department}</td><td>${SecureFlow.accountBadge(e.accountStatus)}</td></tr>
    `).join('');
  }

  // ---------------------------------------------------------------------
  // Notifications — a simple bell that tells the Admin when a user has
  // edited their own profile details (see /api/auth/profile).
  // ---------------------------------------------------------------------
  function relativeTime(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return SecureFlow.formatDate(iso);
  }

  async function loadNotifications() {
    const { ok, data } = await SecureFlow.apiFetch('/api/admin/notifications');
    if (!ok) return;
    const badge = document.getElementById('notif-badge');
    if (data.unreadCount > 0) { badge.style.display = 'flex'; badge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount; }
    else { badge.style.display = 'none'; }

    const list = document.getElementById('notif-list');
    if (!data.notifications.length) {
      list.innerHTML = `<div class="notif-item"><div class="notif-item-text text-faint">No notifications yet. You'll see one here whenever a user updates their profile details.</div></div>`;
      return;
    }
    list.innerHTML = data.notifications.map((n) => `
      <div class="notif-item ${n.acknowledged ? '' : 'unread'}">
        <div class="dot ${n.acknowledged ? 'read' : ''}"></div>
        <div class="notif-item-text">
          <strong>${n.userName}</strong> updated their ${n.changedFields}.
          <div class="notif-item-time">${relativeTime(n.timestamp)}</div>
        </div>
        ${n.acknowledged ? '' : `<button class="btn btn-ghost btn-sm" style="padding:4px 8px;" data-ack="${n.id}">Dismiss</button>`}
      </div>`).join('');

    list.querySelectorAll('[data-ack]').forEach((btn) => btn.addEventListener('click', async () => {
      await SecureFlow.apiFetch(`/api/admin/notifications/${btn.dataset.ack}/ack`, { method: 'POST' });
      loadNotifications();
    }));
  }

  function setupNotifications() {
    const wrap = document.getElementById('notif-wrap');
    const bell = document.getElementById('notif-bell');
    const panel = document.getElementById('notif-panel');
    wrap.style.display = 'block';

    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('show');
      if (panel.classList.contains('show')) loadNotifications();
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) panel.classList.remove('show');
    });
    document.getElementById('notif-clear-btn').addEventListener('click', async () => {
      await SecureFlow.apiFetch('/api/admin/notifications/ack-all', { method: 'POST' });
      loadNotifications();
    });

    loadNotifications();
    // Light polling so the badge count stays fresh while the Admin is on the page.
    setInterval(loadNotifications, 30000);
  }

  document.getElementById('users-filter')?.addEventListener('change', loadUsers);

  // The sidebar links point to /admin#users, /admin#verification, etc.
  // Since we're already on /admin, clicking them only changes the URL
  // hash (no page reload) -- so we listen for that and switch tabs
  // ourselves, and also honor the hash on first load (e.g. a bookmark
  // or a link from another page pointing straight at /admin#roles).
  function tabFromHash() {
    const key = window.location.hash.replace('#', '');
    if (IS_ADMIN && ['overview', 'users', 'verification', 'roles'].includes(key)) return key;
    return null;
  }

  window.addEventListener('hashchange', () => {
    const key = tabFromHash();
    if (key) setTab(key);
  });

  async function init() {
    const user = await SecureFlow.requireUser();
    if (!user) return;
    if (user.role !== 'Admin' && user.role !== 'Manager') { window.location.href = '/access-denied'; return; }
    CURRENT_USER = user;
    IS_ADMIN = user.role === 'Admin';

    SecureFlow.renderSidebar('/admin', user);
    buildTabBar();
    if (IS_ADMIN) setupNotifications();
    setTab(tabFromHash() || (IS_ADMIN ? 'overview' : 'employees'));
  }

  init();
})();
