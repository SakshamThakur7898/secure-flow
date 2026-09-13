# selenium_tests/test_logout.py
import config
from pages import LoginPage, DashboardPage, SidebarPage


def test_logout(driver):
    """6. LOGOUT — logging in, then using the real Logout button in the
    sidebar, must return the user to the login page and actually end the
    session (not just visually hide the dashboard)."""
    login_page = LoginPage(driver).open()
    login_page.login(config.EMPLOYEE_USERNAME, config.EMPLOYEE_PASSWORD)
    login_page.wait_for_redirect_away()
    DashboardPage(driver).wait_until_loaded()

    sidebar = SidebarPage(driver)
    sidebar.logout()
    sidebar.wait_for_logged_out()

    assert login_page.current_path == "/"
    assert LoginPage(driver).is_displayed()

    # The session must be genuinely gone server-side, not just a client
    # redirect: reloading /dashboard afterwards should bounce back to login
    # rather than show cached/stale dashboard content.
    driver.get(f"{config.BASE_URL}/dashboard")
    assert LoginPage(driver).is_displayed(), (
        "Expected /dashboard to redirect back to login after logout -- "
        "the server-side session should have been destroyed."
    )
