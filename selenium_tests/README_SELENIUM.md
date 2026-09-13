# SecureFlow — Selenium Test Suite (Practical 2)

Browser-automation tests for the existing SecureFlow project, using
**Python + Selenium + pytest**. This is a separate, external testing
layer — it does not replace, modify, or interact with the built-in
Admin **Testing** tab (`/testing`), which stays exactly as it was.

These tests drive a real Chrome browser against the real, running
SecureFlow application (either your local `npm start` or your deployed
Render URL) through the actual UI: the same forms, buttons, and pages a
person would use.

---

## 1. What's tested

| File | Covers |
|---|---|
| `test_login.py` | **Website Launch** (login page loads), **Valid Login** (seeded `employee` account → `/dashboard`; seeded `admin` → `/admin`), **Invalid Login** (wrong credentials → rejected with the app's real error message) |
| `test_registration.py` | **User Registration** — fills the real form with a freshly-generated unique account each run, verifies the success message, then cleans the account up again using the Admin Dashboard's real **Delete** feature. Also checks a duplicate registration is rejected. |
| `test_admin.py` | **Admin Login & Access** — Admin reaches the real Admin Dashboard; an Employee is genuinely blocked (server-side) from `/admin` and `/testing`, even by typing the URL directly. |
| `test_logout.py` | **Logout** — the real Logout button ends the session, and `/dashboard` afterwards bounces back to the login page (confirms the session was actually destroyed, not just hidden). |

Every assertion checks the application's *actual* response text, URL, or
DOM state — not just "did the page open."

---

## 2. Install

You'll need **Python 3.9+** and **Google Chrome** installed.

```bash
cd selenium_tests

# (recommended) create a virtual environment first
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

That installs `selenium`, `pytest`, and `python-dotenv`. You do **not**
need to separately download `chromedriver` — Selenium 4.6+ ships
**Selenium Manager**, which detects your installed Chrome version and
fetches a matching driver automatically the first time a test runs.

---

## 3. Configure

Everything is centralized in `config.py`, which reads environment
variables (optionally from a local `.env` file — copy `.env.example` to
`.env` and edit it; `.env` itself is git-ignored, so it's safe to put
machine-specific values there).

| Variable | Default | Purpose |
|---|---|---|
| `SELENIUM_BASE_URL` | `http://127.0.0.1:4000` | The site to test. Point this at your Render URL to test the deployed site. |
| `SELENIUM_HEADLESS` | `false` | `true` runs Chrome invisibly (e.g. CI); `false` opens a real visible window for demoing live. |
| `SELENIUM_TIMEOUT` | `15` | Seconds `WebDriverWait` waits for elements/conditions. Bumped a little above a typical local value since a free-tier host can be slow to wake from sleep. |
| `SELENIUM_ADMIN_USERNAME` / `_PASSWORD` | `admin` / `Admin@123` | Seeded Admin demo account (from the main project's README). |
| `SELENIUM_MANAGER_USERNAME` / `_PASSWORD` | `manager` / `Manager@123` | Seeded Manager demo account. |
| `SELENIUM_EMPLOYEE_USERNAME` / `_PASSWORD` | `employee` / `Employee@123` | Seeded Employee demo account. |

None of these are real secrets — they're SecureFlow's own documented,
public, development-only demo credentials. They're still centralized
here (instead of duplicated across test files) so pointing the suite at
a different environment, or an account you've reset, is a one-line change.

### Testing your deployed Render site
```bash
export SELENIUM_BASE_URL=https://your-secureflow-app.onrender.com
pytest -v
```

### Testing locally
Start the app first in one terminal (`npm start` from the project root,
default `http://127.0.0.1:4000`), then in another terminal:
```bash
cd selenium_tests
pytest -v
```
(No `SELENIUM_BASE_URL` needed — that's already the default.)

### Headless (e.g. for CI)
```bash
export SELENIUM_HEADLESS=true
pytest -v
```

---

## 4. Run

```bash
cd selenium_tests
pytest -v
```

Expected output looks like:
```
test_login.py::test_website_launch PASSED
test_login.py::test_valid_login PASSED
test_login.py::test_valid_login_manager_or_admin_lands_on_admin PASSED
test_login.py::test_invalid_login PASSED
test_registration.py::test_user_registration PASSED
test_registration.py::test_duplicate_registration_is_rejected PASSED
test_admin.py::test_admin_access PASSED
test_admin.py::test_employee_cannot_access_admin PASSED
test_admin.py::test_employee_cannot_access_testing_dashboard PASSED
test_logout.py::test_logout PASSED

========================= 10 passed in 24.31s =========================
```
(`pytest.ini` in this folder already sets `-v` as the default, so plain
`pytest` shows the same verbose output.)

Run a single file or test if you only want to demo one workflow:
```bash
pytest test_login.py -v
pytest test_admin.py::test_employee_cannot_access_admin -v
```

---

## 5. Screenshots on failure

If any test fails, a screenshot is saved automatically to
`selenium_tests/screenshots/<test-name>-<timestamp>.png` (this folder is
created on first failure and is git-ignored — see the project's root
`.gitignore`). The path is also printed in the pytest output, e.g.:
```
[screenshot] Failure screenshot saved to: selenium_tests/screenshots/test_admin_access-20260913-142201.png
```

---

## 6. Project layout

```
selenium_tests/
├── config.py            # single source of truth: base URL, headless flag, credentials
├── pages.py              # lightweight Page Object Model (real element IDs from the app)
├── conftest.py           # Chrome driver fixture + automatic screenshot-on-failure
├── test_login.py         # Website Launch, Valid Login, Invalid Login
├── test_registration.py  # User Registration (+ cleanup) and duplicate rejection
├── test_admin.py         # Admin access, and blocking a non-Admin
├── test_logout.py        # Logout
├── requirements.txt
├── .env.example
├── pytest.ini
└── screenshots/          # created automatically on first failure (git-ignored)
```

## 7. Why these element IDs and not guesses
Every selector in `pages.py` (`#login-form`, `#identifier`, `#password`,
`#login-btn`, `#alert-error`, `#register-form`, `#logout-btn`,
`#page-eyebrow`, `[data-tab="users"]`, `[data-delete]`,
`#sf-confirm-yes`, `.access-denied-shell`, etc.) was taken directly from
the actual project source (`public/index.html`, `public/register.html`,
`public/js/api.js`, `public/js/admin.js`, `public/access-denied.html`) —
none of it was guessed. If you change those IDs in the app later, update
the matching line in `pages.py` and every test that uses that page object
keeps working.
