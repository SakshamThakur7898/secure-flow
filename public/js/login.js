(function () {
  const form = document.getElementById('login-form');
  const identifier = document.getElementById('identifier');
  const password = document.getElementById('password');
  const alertError = document.getElementById('alert-error');
  const alertSuccess = document.getElementById('alert-success');
  const btn = document.getElementById('login-btn');
  const btnLabel = document.getElementById('login-btn-label');
  const spinner = document.getElementById('login-spinner');
  const toggle = document.getElementById('toggle-password');

  toggle.addEventListener('click', () => {
    const isPw = password.type === 'password';
    password.type = isPw ? 'text' : 'password';
    toggle.textContent = isPw ? 'HIDE' : 'SHOW';
  });

  function setLoading(loading) {
    btn.disabled = loading;
    spinner.style.display = loading ? 'inline-block' : 'none';
    btnLabel.textContent = loading ? 'Signing in…' : 'Log In';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    SecureFlow.hideAlert(alertError);
    SecureFlow.hideAlert(alertSuccess);
    SecureFlow.clearFieldErrors(form);

    let hasError = false;
    if (!identifier.value.trim()) { SecureFlow.fieldError(identifier, 'Email or username is required.'); hasError = true; }
    if (!password.value) { SecureFlow.fieldError(password, 'Password is required.'); hasError = true; }
    if (hasError) return;

    setLoading(true);
    const { ok, status, data } = await SecureFlow.apiFetch('/api/auth/login', {
      method: 'POST',
      body: { identifier: identifier.value.trim(), password: password.value },
    });
    setLoading(false);

    if (!ok) {
      SecureFlow.showAlert(alertError, 'error', data.error || 'Unable to log in. Please try again.');
      return;
    }

    SecureFlow.showAlert(alertSuccess, 'success', data.message || 'Login successful.');
    setTimeout(() => {
      window.location.href = (data.user.role === 'Admin' || data.user.role === 'Manager') ? '/admin' : '/dashboard';
    }, 350);
  });
})();
