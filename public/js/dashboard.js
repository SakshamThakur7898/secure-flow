(function () {
  function icon(name, color) {
    return `<div class="stat-icon" style="background:${color}1a; color:${color};"><i data-lucide="${name}" style="width:17px;height:17px"></i></div>`;
  }

  let CURRENT_USER = null;

  function renderProfile(user) {
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

  function setupEditModal() {
    const modal = document.getElementById('edit-profile-modal');
    const form = document.getElementById('edit-profile-form');
    const alertError = document.getElementById('edit-alert-error');
    const alertSuccess = document.getElementById('edit-alert-success');
    const saveBtn = document.getElementById('edit-save-btn');
    const saveLabel = document.getElementById('edit-save-label');
    const saveSpinner = document.getElementById('edit-save-spinner');

    function openModal() {
      SecureFlow.hideAlert(alertError);
      SecureFlow.hideAlert(alertSuccess);
      SecureFlow.clearFieldErrors(form);
      document.getElementById('edit-fullName').value = CURRENT_USER.fullName;
      document.getElementById('edit-email').value = CURRENT_USER.email;
      document.getElementById('edit-phone').value = CURRENT_USER.phone || '';
      document.getElementById('edit-department').value = CURRENT_USER.department;
      modal.classList.add('show');
    }
    function closeModal() { modal.classList.remove('show'); }

    document.getElementById('edit-profile-btn').addEventListener('click', openModal);
    document.getElementById('edit-cancel-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      SecureFlow.hideAlert(alertError);
      SecureFlow.hideAlert(alertSuccess);
      SecureFlow.clearFieldErrors(form);

      const fullName = document.getElementById('edit-fullName');
      const email = document.getElementById('edit-email');
      const department = document.getElementById('edit-department');
      const phone = document.getElementById('edit-phone');

      let hasError = false;
      if (!fullName.value.trim()) { SecureFlow.fieldError(fullName, 'Full name is required.'); hasError = true; }
      if (!email.value.trim()) { SecureFlow.fieldError(email, 'Email is required.'); hasError = true; }
      if (!department.value.trim()) { SecureFlow.fieldError(department, 'Department is required.'); hasError = true; }
      if (hasError) return;

      saveBtn.disabled = true;
      saveSpinner.style.display = 'inline-block';
      saveLabel.textContent = 'Saving…';

      const { ok, data } = await SecureFlow.apiFetch('/api/auth/profile', {
        method: 'POST',
        body: {
          fullName: fullName.value.trim(),
          email: email.value.trim(),
          phone: phone.value.trim(),
          department: department.value.trim(),
        },
      });

      saveBtn.disabled = false;
      saveSpinner.style.display = 'none';
      saveLabel.textContent = 'Save Changes';

      if (!ok) {
        SecureFlow.showAlert(alertError, 'error', data.error || 'Could not save changes.');
        if (data.fieldErrors) {
          Object.entries(data.fieldErrors).forEach(([name, msg]) => {
            const input = document.getElementById(`edit-${name}`);
            if (input) SecureFlow.fieldError(input, msg);
          });
        }
        return;
      }

      CURRENT_USER = data.user;
      renderProfile(CURRENT_USER);
      SecureFlow.showAlert(alertSuccess, 'success', data.message);
      setTimeout(closeModal, 900);
    });
  }

  async function init() {
    const user = await SecureFlow.requireUser();
    if (!user) return;
    CURRENT_USER = user;

    SecureFlow.renderSidebar('/dashboard', user);
    renderProfile(user);
    setupEditModal();
  }

  init();
})();
