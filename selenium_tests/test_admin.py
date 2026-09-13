# selenium_tests/test_admin.py
import config
from selenium.webdriver.common.by import By
from pages import LoginPage, AdminPage, AccessDeniedPage


def test_admin_access(driver):
    """5a. ADMIN LOGIN AND ADMIN ACCESS — the seeded Admin account can log
    in and reach the real Admin Dashboard content."""
    login_page = LoginPage(driver).open()
    login_page.login(config.ADMIN_USERNAME, config.ADMIN_PASSWORD)
    login_page.wait_for_redirect_away()

    assert "/admin" in driver.current_url

    admin_page = AdminPage(driver).wait_until_loaded()
    assert "Admin" in admin_page.eyebrow_text()
    # The Admin-only overview stat cards should actually be present.
    assert len(driver.find_elements(By.ID, "overview-cards")) == 1


def test_employee_cannot_access_admin(driver):
    """5b. Confirms /admin is genuinely inaccessible to an ordinary
    Employee -- not just a hidden nav link, but a real server-side
    redirect to the Access Denied page even when typed directly."""
    login_page = LoginPage(driver).open()
    login_page.login(config.EMPLOYEE_USERNAME, config.EMPLOYEE_PASSWORD)
    login_page.wait_for_redirect_away()
    assert "/dashboard" in driver.current_url  # confirms we're logged in as the Employee

    # Now try to reach the Admin page directly by URL, exactly like
    # someone typing it into the address bar.
    driver.get(f"{config.BASE_URL}/admin")

    denied_page = AccessDeniedPage(driver)
    assert denied_page.is_displayed(), (
        "Expected an Employee account hitting /admin directly to be served "
        "the Access Denied page, not the Admin Dashboard."
    )
    assert "Access Denied" in driver.page_source


def test_employee_cannot_access_testing_dashboard(driver):
    """Same guarantee for the built-in /testing dashboard -- Admin-only."""
    login_page = LoginPage(driver).open()
    login_page.login(config.EMPLOYEE_USERNAME, config.EMPLOYEE_PASSWORD)
    login_page.wait_for_redirect_away()

    driver.get(f"{config.BASE_URL}/testing")

    denied_page = AccessDeniedPage(driver)
    assert denied_page.is_displayed()
