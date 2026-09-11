(function () {
  function icon(name, color) {
    return `<div class="stat-icon" style="background:${color}1a; color:${color};"><i data-lucide="${name}" style="width:17px;height:17px"></i></div>`;
  }

  async function init() {
    const user = await SecureFlow.requireUser();
    if (!user) return;

    SecureFlow.renderSidebar('/dashboard', user);

    document.getElementById('welcome-heading').textContent = `Welcome, ${user.fullName}`;

    document.getElementById('status-cards').innerHTML = `
      <div class="card hoverable stat-card">
        ${icon('shield-check', '#4f5fe0')}
        <div class="stat-label">Account Status</div>
        <div class="stat-value" style="font-size:16px;">${SecureFlow.accountBadge(user.accountStatus)}</div>
      </div>
      <div class="card hoverable stat-card">
        ${icon('user-check', '#17a35a')}
        <div class="stat-label">Employee Verification</div>
        <div class="stat-value" style="font-size:16px;">${SecureFlow.verificationBadge(user.verificationStatus)}</div>
      </div>
      <div class="card hoverable stat-card">
        ${icon('key-round', '#d9910a')}
        <div class="stat-label">Current Role</div>
        <div class="stat-value" style="font-size:16px;">${SecureFlow.roleBadge(user.role)}</div>
      </div>
      <div class="card hoverable stat-card">
        ${icon('clock', '#4f5fe0')}
        <div class="stat-label">Last Login</div>
        <div class="stat-value" style="font-size:14px; font-weight:600;">${SecureFlow.formatDate(user.lastLogin)}</div>
      </div>
    `;

    const rows = [
      ['Full Name', user.fullName],
      ['Username', user.username],
      ['Email', user.email],
      ['Employee ID', user.employeeId],
      ['Department', user.department],
      ['Phone', user.phone || '—'],
      ['Account Created', SecureFlow.formatDate(user.createdAt)],
      ['Last Updated', SecureFlow.formatDate(user.updatedAt)],
    ];
    document.getElementById('profile-grid').innerHTML = rows.map(([label, val]) => `
      <div>
        <div class="text-faint" style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.03em;">${label}</div>
        <div style="font-size:14px; margin-top:3px;">${val}</div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  init();
})();
