(function () {
  const form = document.getElementById('register-form');
  const alertError = document.getElementById('alert-error');
  const alertSuccess = document.getElementById('alert-success');
  const btn = document.getElementById('register-btn');
  const btnLabel = document.getElementById('register-btn-label');
  const spinner = document.getElementById('register-spinner');

  document.querySelectorAll('[data-toggle-for]').forEach((toggleBtn) => {
    toggleBtn.addEventListener('click', () => {
      const input = document.getElementById(toggleBtn.dataset.toggleFor);
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      toggleBtn.textContent = isPw ? 'HIDE' : 'SHOW';
    });
  });

  const passwordInput = document.getElementById('password');
  const strengthBars = document.querySelectorAll('#strength-meter span');
  const strengthLabel = document.getElementById('strength-label');
  const strengthColors = ['#e0473f', '#e0473f', '#d9910a', '#4f5fe0', '#17a35a', '#12894a'];
  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];

  function scorePassword(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }
  passwordInput.addEventListener('input', () => {
    const pw = passwordInput.value;
    const score = pw ? scorePassword(pw) : 0;
    strengthBars.forEach((bar, i) => { bar.style.background = i < score || (score === 0 && pw.length) ? strengthColors[score] : ''; });
    strengthLabel.textContent = pw ? strengthLabels[score] : '\u00A0';
  });

  const fields = {
    fullName: { label: 'Full name', required: true },
    username: { label: 'Username', required: true, pattern: /^[a-zA-Z0-9._-]{3,30}$/, patternMsg: 'Username must be 3-30 characters (letters, numbers, ._- only).' },
    email: { label: 'Email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: 'Please enter a valid email.' },
    employeeId: { label: 'Employee ID', required: true, pattern: /^[a-zA-Z0-9-]{3,20}$/, patternMsg: 'Employee ID must be 3-20 characters (letters, numbers, - only).' },
    department: { label: 'Department', required: true },
  };

  function validateClientSide() {
    let valid = true;
    for (const [name, rule] of Object.entries(fields)) {
      const input = document.getElementById(name);
      const val = input.value.trim();
      if (rule.required && !val) { SecureFlow.fieldError(input, `${rule.label} is required.`); valid = false; continue; }
      if (rule.pattern && val && !rule.pattern.test(val)) { SecureFlow.fieldError(input, rule.patternMsg); valid = false; }
    }
    const pw = document.getElementById('password');
    const cpw = document.getElementById('confirmPassword');
    if (!pw.value) { SecureFlow.fieldError(pw, 'Password is required.'); valid = false; }
    else if (pw.value.length < 8) { SecureFlow.fieldError(pw, 'Password must be at least 8 characters.'); valid = false; }
    if (!cpw.value) { SecureFlow.fieldError(cpw, 'Please confirm your password.'); valid = false; }
    else if (pw.value && cpw.value !== pw.value) { SecureFlow.fieldError(cpw, 'Passwords do not match.'); valid = false; }
    return valid;
  }

  function setLoading(loading) {
    btn.disabled = loading;
    spinner.style.display = loading ? 'inline-block' : 'none';
    btnLabel.textContent = loading ? 'Creating account…' : 'Create Account';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    SecureFlow.hideAlert(alertError);
    SecureFlow.hideAlert(alertSuccess);
    SecureFlow.clearFieldErrors(form);

    if (!validateClientSide()) return;

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      confirmPassword: document.getElementById('confirmPassword').value,
      employeeId: document.getElementById('employeeId').value.trim(),
      department: document.getElementById('department').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      role: document.getElementById('role').value,
    };

    setLoading(true);
    const { ok, data } = await SecureFlow.apiFetch('/api/auth/register', { method: 'POST', body: payload });
    setLoading(false);

    if (!ok) {
      SecureFlow.showAlert(alertError, 'error', data.error || 'Registration failed. Please try again.');
      if (data.fieldErrors) {
        Object.entries(data.fieldErrors).forEach(([name, msg]) => {
          const input = document.getElementById(name);
          if (input) SecureFlow.fieldError(input, msg);
        });
      }
      return;
    }

    SecureFlow.showAlert(alertSuccess, 'success', data.message);
    form.reset();
    strengthLabel.textContent = '\u00A0';
    strengthBars.forEach((bar) => { bar.style.background = ''; });
    setTimeout(() => { window.location.href = '/'; }, 1800);
  });
})();
