# selenium_tests/config.py
# -----------------------------------------------------------------------
# Central configuration for the Selenium suite. Nothing in the test files
# themselves should hard-code a URL or a password -- everything comes
# from here, which in turn reads environment variables (optionally loaded
# from a local .env file) so the same suite can point at either your
# local dev server or your deployed Render URL without editing any code.
# -----------------------------------------------------------------------
import os

try:
    # Optional convenience: if python-dotenv is installed and a
    # selenium_tests/.env file exists, load it. Nothing breaks if either
    # is missing -- env vars set directly in the shell still work.
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

# ---------------------------------------------------------------------
# Target site
# ---------------------------------------------------------------------
# Point this at your deployed Render URL to test the live site, e.g.:
#   SELENIUM_BASE_URL=https://your-secureflow-app.onrender.com pytest -v
# or leave it unset to test a local `npm start` on http://127.0.0.1:4000.
BASE_URL = os.environ.get("SELENIUM_BASE_URL", "http://127.0.0.1:4000").rstrip("/")

# ---------------------------------------------------------------------
# Browser behavior
# ---------------------------------------------------------------------
# SELENIUM_HEADLESS=true runs Chrome invisibly (e.g. in CI). Left as
# "false" by default so the browser opens normally for a live classroom
# demo, as requested.
HEADLESS = os.environ.get("SELENIUM_HEADLESS", "false").strip().lower() in ("1", "true", "yes", "on")

# How long (seconds) WebDriverWait will wait for an element/condition
# before giving up. A deployed free-tier host can be slow to wake up
# from sleep, so this is a little more generous than a pure-local value.
EXPLICIT_TIMEOUT = float(os.environ.get("SELENIUM_TIMEOUT", "15"))

WINDOW_SIZE = os.environ.get("SELENIUM_WINDOW_SIZE", "1280,900")

# ---------------------------------------------------------------------
# Seeded / demo credentials
# -----------------------------------------------------------------------
# These match the development-only demo accounts that SecureFlow itself
# creates on first boot (see the main project's src/db.js -> seedIfEmpty()
# and README.md, section "Development / seed accounts"). They are
# intentionally public, documented, non-production credentials for this
# academic project -- not real secrets -- but are still centralized here
# (and overridable via env vars) rather than duplicated across test files.
# ---------------------------------------------------------------------
ADMIN_USERNAME = os.environ.get("SELENIUM_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("SELENIUM_ADMIN_PASSWORD", "Admin@123")

MANAGER_USERNAME = os.environ.get("SELENIUM_MANAGER_USERNAME", "manager")
MANAGER_PASSWORD = os.environ.get("SELENIUM_MANAGER_PASSWORD", "Manager@123")

EMPLOYEE_USERNAME = os.environ.get("SELENIUM_EMPLOYEE_USERNAME", "employee")
EMPLOYEE_PASSWORD = os.environ.get("SELENIUM_EMPLOYEE_PASSWORD", "Employee@123")

# Deliberately wrong -- used only by the invalid-login test. Not a real
# account, and not supposed to exist in the target site's database.
INVALID_USERNAME = "not_a_real_user"
INVALID_PASSWORD = "definitely-wrong-password"

# ---------------------------------------------------------------------
# Screenshots (saved automatically on test failure -- see conftest.py)
# ---------------------------------------------------------------------
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
