# selenium_tests/test_login.py
import config
from pages import LoginPage, DashboardPage, AdminPage


def test_website_launch(driver):
    """1. WEBSITE LAUNCH — the site opens and shows the expected login page."""
    login_page = LoginPage(driver).open()

    assert login_page.is_displayed(), "Expected the login form (#login-form) to be present."
    assert "SecureFlow" in driver.title
    # The login page's own copy -- confirms we landed on the real
    # SecureFlow login screen and not an error page or a different app.
    assert "Sign In" in driver.title or "SecureFlow" in driver.page_source


def test_valid_login(driver):
    """2. VALID LOGIN — using the seeded `employee` demo account."""
    login_page = LoginPage(driver).open()
    login_page.login(config.EMPLOYEE_USERNAME, config.EMPLOYEE_PASSWORD)
    login_page.wait_for_redirect_away()

    assert "/dashboard" in driver.current_url, (
        f"Expected an Employee login to land on /dashboard, got {driver.current_url}"
    )

    dashboard = DashboardPage(driver).wait_until_loaded()
    assert "Welcome" in dashboard.welcome_text()


def test_valid_login_manager_or_admin_lands_on_admin(driver):
    """A Manager/Admin login should land on /admin instead of /dashboard --
    confirms the role-based redirect actually branches on role, not just
    "logged in vs not"."""
    login_page = LoginPage(driver).open()
    login_page.login(config.ADMIN_USERNAME, config.ADMIN_PASSWORD)
    login_page.wait_for_redirect_away()

    assert "/admin" in driver.current_url
    admin_page = AdminPage(driver).wait_until_loaded()
    assert "Admin" in admin_page.eyebrow_text()


def test_invalid_login(driver):
    """3. INVALID LOGIN — deliberately wrong credentials must be rejected,
    with the exact message SecureFlow's backend returns, and must NOT
    navigate away from the login page."""
    login_page = LoginPage(driver).open()
    login_page.login(config.INVALID_USERNAME, config.INVALID_PASSWORD)

    error_text = login_page.wait_for_error()
    assert "Invalid username or password" in error_text

    # Still on the login page -- no session was created.
    assert login_page.current_path == "/"
    assert login_page.is_displayed()
