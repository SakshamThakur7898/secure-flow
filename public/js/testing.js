(function () {
  const TESTS = [
    { key: 'login', title: 'User Login' },
    { key: 'registration', title: 'New User Registration' },
    { key: 'verification', title: 'Employee Verification' },
    { key: 'role-access', title: 'Role-Based Access' },
    { key: 'data-storage', title: 'User Data Storage' },
  ];
  const state = {}; // key -> { status, message, errorMessage, durationMs }
  TESTS.forEach((t) => { state[t.key] = { status: 'pending' }; });

  const cardsMount = document.getElementById('test-cards');
  const logPanel = document.getElementById('log-panel');
  let logStarted = false;

  const ICONS = {
    pending: '<i data-lucide="minus" style="width:14px;height:14px"></i>',
    testing: '<span class="spinner"></span>',
    passed: '<i data-lucide="check" style="width:16px;height:16px"></i>',
    failed: '<i data-lucide="x" style="width:16px;height:16px"></i>',
  };

  function renderCards() {
    cardsMount.innerHTML = TESTS.map((t) => {
      const s = state[t.key];
      return `
      <div class="card test-card" id="card-${t.key}">
        <div class="test-card-top">
          <div class="check-badge ${s.status}" id="badge-${t.key}">${ICONS[s.status]}</div>
          <div style="flex:1;">
            <div class="test-card-title">${t.title}</div>
            <div class="test-card-status ${s.status}" id="status-${t.key}">${s.status.toUpperCase()}</div>
          </div>
          <div class="status-dot ${s.status}"></div>
        </div>
        <div class="test-card-message" id="message-${t.key}">
          ${s.status === 'pending' ? 'Not yet tested. Run this test individually or run all tests.' : (s.message || s.errorMessage || '')}
        </div>
        <div class="test-card-meta" id="meta-${t.key}">${s.durationMs != null ? `Test completed in ${s.durationMs} ms` : ''}</div>
        <div class="test-card-actions">
          <button class="btn btn-sm btn-secondary" data-run="${t.key}">Run Test</button>
        </div>
      </div>`;
    }).join('');
    cardsMount.querySelectorAll('[data-run]').forEach((btn) => {
      btn.addEventListener('click', () => runSingle(btn.dataset.run, { standalone: true }));
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function log(line, cls = 'info') {
    if (!logStarted) { logPanel.innerHTML = ''; logStarted = true; }
    const el = document.createElement('div');
    el.className = 'log-line';
    el.innerHTML = `<span class="t">${SecureFlow.timeOnly()}</span><span class="${cls}">${line}</span>`;
    logPanel.appendChild(el);
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  function setCardState(key, status, extra = {}) {
    state[key] = { status, ...extra };
    const badge = document.getElementById(`badge-${key}`);
    const statusEl = document.getElementById(`status-${key}`);
    const messageEl = document.getElementById(`message-${key}`);
    const metaEl = document.getElementById(`meta-${key}`);
    const dot = document.querySelector(`#card-${key} .status-dot`);
    badge.className = `check-badge ${status}`;
    badge.innerHTML = ICONS[status];
    statusEl.className = `test-card-status ${status}`;
    statusEl.textContent = status.toUpperCase();
    dot.className = `status-dot ${status}`;
    if (status === 'testing') {
      messageEl.textContent = 'Running checks against the live application…';
      metaEl.textContent = '';
    } else if (status === 'passed') {
      messageEl.textContent = extra.message || '';
      metaEl.textContent = `Test completed in ${extra.durationMs} ms`;
    } else if (status === 'failed') {
      messageEl.textContent = `Reason: ${extra.errorMessage || 'Unknown failure.'}`;
      metaEl.textContent = `Test completed in ${extra.durationMs} ms`;
    } else {
      messageEl.textContent = 'Not yet tested. Run this test individually or run all tests.';
      metaEl.textContent = '';
    }
    if (window.lucide) window.lucide.createIcons();
    updateSummary();
  }

  function updateSummary() {
    const values = Object.values(state);
    const passed = values.filter((s) => s.status === 'passed').length;
    const failed = values.filter((s) => s.status === 'failed').length;
    const pending = values.filter((s) => s.status === 'pending' || s.status === 'testing').length;
    document.getElementById('count-passed').textContent = `${passed}/5`;
    document.getElementById('count-failed').textContent = `${failed}/5`;
    document.getElementById('count-pending').textContent = `${pending}/5`;

    const done = passed + failed;
    const pct = Math.round((done / 5) * 100);
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-percent').textContent = `${pct}%`;
    document.getElementById('progress-label').textContent = `${done} / 5 Requirements`;

    const banner = document.getElementById('status-banner');
    const bannerIcon = document.getElementById('banner-icon');
    const bannerTitle = document.getElementById('banner-title');
    const bannerSubtitle = document.getElementById('banner-subtitle');

    if (done === 0) {
      banner.className = 'system-status-banner unknown';
      bannerIcon.className = 'check-badge pending';
      bannerIcon.innerHTML = ICONS.pending;
      bannerTitle.textContent = 'Tests have not been run yet';
      bannerSubtitle.textContent = 'Click "Run All Tests" to verify all 5 requirements.';
    } else if (done < 5) {
      banner.className = 'system-status-banner unknown';
      bannerIcon.className = 'check-badge testing';
      bannerIcon.innerHTML = ICONS.testing;
      bannerTitle.textContent = 'Testing in progress…';
      bannerSubtitle.textContent = `${done} of 5 requirements checked so far.`;
    } else if (failed === 0) {
      banner.className = 'system-status-banner healthy';
      bannerIcon.className = 'check-badge passed';
      bannerIcon.innerHTML = ICONS.passed;
      bannerTitle.textContent = 'SYSTEM HEALTHY';
      bannerSubtitle.textContent = '5 / 5 requirements passed.';
    } else {
      banner.className = 'system-status-banner unhealthy';
      bannerIcon.className = 'check-badge failed';
      bannerIcon.innerHTML = ICONS.failed;
      bannerTitle.textContent = 'SOME TESTS FAILED';
      bannerSubtitle.textContent = `${passed} passed, ${failed} failed out of 5.`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  async function runSingle(key, { standalone = false } = {}) {
    const title = TESTS.find((t) => t.key === key).title;
    setCardState(key, 'testing');
    log(`Testing ${title}...`, 'info');
    const { ok, data } = await SecureFlow.apiFetch(`/api/tests/run/${key}`, { method: 'POST' });
    if (!ok) {
      setCardState(key, 'failed', { errorMessage: data.error || 'Request failed.', durationMs: 0 });
      log(`✕ ${title} FAILED — ${data.error || 'Request failed.'}`, 'fail');
      return;
    }
    setCardState(key, data.status.toLowerCase(), { message: data.message, errorMessage: data.errorMessage, durationMs: data.durationMs });
    log(`${data.status === 'PASSED' ? '✓' : '✕'} ${title} ${data.status}`, data.status === 'PASSED' ? 'ok' : 'fail');
    if (standalone) loadHistory();
  }

  async function runAll() {
    document.getElementById('run-all-btn').disabled = true;
    TESTS.forEach((t) => setCardState(t.key, 'pending'));
    logStarted = false;
    log('Starting system test...', 'info');
    for (const t of TESTS) {
      await runSingle(t.key);
    }
    const failedCount = Object.values(state).filter((s) => s.status === 'failed').length;
    const passedCount = Object.values(state).filter((s) => s.status === 'passed').length;
    log(failedCount === 0 ? `All requirements successfully tested. ${passedCount} / 5 Requirements Passed.` : `Testing complete with failures. ${passedCount} / 5 Requirements Passed.`,
      failedCount === 0 ? 'ok' : 'fail');
    document.getElementById('run-all-btn').disabled = false;
    loadHistory();
  }

  async function loadHistory() {
    const tbody = document.querySelector('#history-table tbody');
    const { ok, data } = await SecureFlow.apiFetch('/api/tests/history');
    if (!ok) { tbody.innerHTML = `<tr><td colspan="5" class="empty-row">${data.error || 'Could not load history.'}</td></tr>`; return; }
    if (!data.history.length) { tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No test runs yet.</td></tr>`; return; }
    tbody.innerHTML = data.history.map((h) => `
      <tr>
        <td>${h.requirement}</td>
        <td><span class="badge ${h.status === 'PASSED' ? 'badge-green' : 'badge-red'}"><span class="dot"></span>${h.status}</span></td>
        <td>${SecureFlow.formatDate(h.timestamp)}</td>
        <td>${h.durationMs} ms</td>
        <td class="text-muted" style="max-width:260px;">${h.status === 'PASSED' ? (h.message || '') : (h.errorMessage || '')}</td>
      </tr>`).join('');
  }

  document.getElementById('run-all-btn').addEventListener('click', runAll);
  document.getElementById('clear-history-btn').addEventListener('click', async () => {
    await SecureFlow.apiFetch('/api/tests/history', { method: 'DELETE' });
    loadHistory();
  });

  async function init() {
    const user = await SecureFlow.requireUser();
    if (!user) return;
    if (user.role !== 'Admin') { window.location.href = '/access-denied'; return; }
    SecureFlow.renderSidebar('/testing', user);
    renderCards();
    updateSummary();
    loadHistory();
  }

  init();
})();
