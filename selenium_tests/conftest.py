# selenium_tests/conftest.py
import datetime
import os

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

import config


def _build_driver():
    options = Options()
    if config.HEADLESS:
        # "--headless=new" is Chrome's modern headless mode (Chrome 109+).
        options.add_argument("--headless=new")
    options.add_argument(f"--window-size={config.WINDOW_SIZE}")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # No manual chromedriver download/path needed: Selenium 4.6+ ships
    # "Selenium Manager", which detects your installed Chrome version and
    # fetches/caches a matching chromedriver automatically the first time
    # webdriver.Chrome() is called.
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(0)  # every page/pages.py uses explicit WebDriverWait instead
    return driver


@pytest.fixture
def driver():
    """A fresh Chrome browser per test, always closed afterwards even if
    the test fails or errors."""
    drv = _build_driver()
    yield drv
    drv.quit()


@pytest.fixture
def base_url():
    return config.BASE_URL


# ---------------------------------------------------------------------
# Automatic screenshot on failure.
#
# pytest doesn't let a fixture see whether the test it served ultimately
# passed or failed, so we hook into the report generation instead: after
# each test's "call" phase, if it failed and it used the `driver`
# fixture, save a PNG named after the test + a timestamp.
# ---------------------------------------------------------------------
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when == "call" and report.failed:
        drv = item.funcargs.get("driver")
        if drv is not None:
            os.makedirs(config.SCREENSHOT_DIR, exist_ok=True)
            timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            safe_name = item.name.replace("/", "_").replace("::", "_")
            path = os.path.join(config.SCREENSHOT_DIR, f"{safe_name}-{timestamp}.png")
            try:
                drv.save_screenshot(path)
                print(f"\n[screenshot] Failure screenshot saved to: {path}")
            except Exception as exc:  # pragma: no cover - best-effort only
                print(f"\n[screenshot] Could not save screenshot: {exc}")
