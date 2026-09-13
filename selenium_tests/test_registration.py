# selenium_tests/test_registration.py
import time

import config
from pages import RegisterPage, LoginPage, AdminPage


def _unique_suffix():
    # Time-based, so back-to-back `pytest -v` runs never collide on a
    # duplicate username/email.
    return str(int(time.time() * 1000))[-9:]


def test_user_registration(driver):
    """4. USER REGISTRATION — fills in the real registration form with a
    freshly generated, unique account, submits it, and verifies the
    application's own success message. Afterwards, cleans up the test
    account through the Admin Dashboard's real Delete feature so repeated
    runs never pile up leftover accounts."""
    suffix = _unique_suffix()
    username = f"selenium_{suffix}"
    email = f"selenium_{suffix}@example.com"

    register_page = RegisterPage(driver).open()
    register_page.fill_and_submit(
        fullName=f"Selenium QA {suffix}",
        username=username,
        email=email,
        password="SeleniumTest@123",
        confirmPassword="SeleniumTest@123",
        employeeId=f"SEL-{suffix}",
        department="Quality Assurance",
        phone="555-0100",
    )

    success_text = register_page.wait_for_success()
    assert "Registration successful" in success_text
    assert "awaiting employee verification" in success_text

    # ---- Cleanup: log in as Admin and delete the account we just made ----
    login_page = LoginPage(driver).open()
    login_page.login(config.ADMIN_USERNAME, config.ADMIN_PASSWORD)
    login_page.wait_for_redirect_away()

    admin_page = AdminPage(driver).wait_until_loaded().open_users_tab()
    admin_page.delete_user_by_username(username)


def test_duplicate_registration_is_rejected(driver):
    """A registration re-using an existing username must be rejected --
    confirms the uniqueness check is real, not just decorative UI."""
    register_page = RegisterPage(driver).open()
    register_page.fill_and_submit(
        fullName="Duplicate Test",
        username=config.EMPLOYEE_USERNAME,  # already exists (seeded account)
        email="duplicate-test@example.com",
        password="SeleniumTest@123",
        confirmPassword="SeleniumTest@123",
        employeeId="SEL-DUP-001",
        department="Quality Assurance",
    )

    error_text = register_page.wait_for_error()
    assert "already exists" in error_text
