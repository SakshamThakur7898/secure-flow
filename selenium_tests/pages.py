# selenium_tests/pages.py
# -----------------------------------------------------------------------
# A deliberately small Page Object Model. Each class wraps the *actual*
# element IDs from the SecureFlow frontend (public/index.html,
# public/register.html, the sidebar injected by public/js/api.js, etc.)
# so tests read like user actions instead of raw find_element calls, and
# a future markup tweak only needs a fix in one place.
# -----------------------------------------------------------------------
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

import config


class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, config.EXPLICIT_TIMEOUT)

    @property
    def current_path(self):
        """The path portion of the current URL, e.g. '/dashboard'."""
        url = self.driver.current_url
        return url[len(config.BASE_URL):] or "/"

    def _diagnostic_wait(self, condition, what):
        """Same as self.wait.until(condition), but on timeout it raises an
        error that tells you what the browser was ACTUALLY looking at --
        current URL, page title, and whether an Access Denied / login page
        was shown instead -- instead of a bare, unhelpful TimeoutException.
        This is what you should read first when a test fails."""
        try:
            return self.wait.until(condition)
        except TimeoutException:
            url = self.driver.current_url
            title = self.driver.title
            has_login_form = len(self.driver.find_elements(By.ID, "login-form")) > 0
            has_access_denied = len(self.driver.find_elements(By.CLASS_NAME, "access-denied-shell")) > 0
            snippet = " ".join(self.driver.page_source.split())[:400]
            raise TimeoutException(
                f"Timed out waiting for: {what}\n"
                f"  current_url        = {url}\n"
                f"  title              = {title}\n"
                f"  showing login form = {has_login_form}\n"
                f"  showing Access Denied = {has_access_denied}\n"
                f"  page_source (first 400 chars) = {snippet}"
            )

    def _wait_for_text_content(self, element_id, expected_text, what):
        """Like _diagnostic_wait, but checks the element's actual DOM
        `textContent` via JS instead of Selenium's `.text` property.
        `.text` only counts text Selenium considers "visibly rendered" at
        that exact instant, which can lag behind reality on a background/
        unfocused browser window (Firefox in particular throttles
        rendering for windows without OS focus -- easy to hit when a
        script opens a new browser window per test back-to-back).
        textContent reads the real DOM value regardless of paint timing,
        which is what these tests actually care about."""
        def predicate(driver):
            els = driver.find_elements(By.ID, element_id)
            if not els:
                return False
            return expected_text in (els[0].get_attribute("textContent") or "")

        self._diagnostic_wait(predicate, what)

    def _click_when_present(self, locator, what):
        """Waits for an element to exist in the DOM (not for Selenium's
        notion of it being "visually clickable", which -- like .text -- can
        lag on a background/unfocused window) and clicks it via JavaScript.
        A JS click fires the real click event directly, sidestepping any
        native "is this pixel currently visible/unobscured" check that
        element_to_be_clickable() would otherwise perform."""
        el = self._diagnostic_wait(EC.presence_of_element_located(locator), what)
        self.driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();", el
        )
        return el


class LoginPage(BasePage):
    """public/index.html — the '/' route."""

    def open(self):
        self.driver.get(f"{config.BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.ID, "login-form")))
        return self

    def is_displayed(self):
        return len(self.driver.find_elements(By.ID, "login-form")) > 0

    def login(self, identifier, password):
        self.driver.find_element(By.ID, "identifier").clear()
        self.driver.find_element(By.ID, "identifier").send_keys(identifier)
        self.driver.find_element(By.ID, "password").clear()
        self.driver.find_element(By.ID, "password").send_keys(password)
        self.driver.find_element(By.ID, "login-btn").click()
        return self

    def wait_for_error(self):
        """Waits for and returns the text of the login error alert."""
        el = self.wait.until(EC.visibility_of_element_located((By.ID, "alert-error")))
        return el.text

    def wait_for_redirect_away(self):
        """Used after a valid login: waits until we've left the login page
        and landed on either /dashboard (Employee) or /admin (Manager/Admin)."""
        self.wait.until(lambda d: "/dashboard" in d.current_url or "/admin" in d.current_url)
        return self


class RegisterPage(BasePage):
    """public/register.html — the '/register' route."""

    FIELDS = ["fullName", "username", "email", "password", "confirmPassword", "employeeId", "department", "phone"]

    def open(self):
        self.driver.get(f"{config.BASE_URL}/register")
        self.wait.until(EC.presence_of_element_located((By.ID, "register-form")))
        return self

    def fill_and_submit(self, **values):
        for field in self.FIELDS:
            if field in values:
                el = self.driver.find_element(By.ID, field)
                el.clear()
                el.send_keys(values[field])
        self.driver.find_element(By.ID, "register-btn").click()
        return self

    def wait_for_success(self):
        el = self.wait.until(EC.visibility_of_element_located((By.ID, "alert-success")))
        return el.text

    def wait_for_error(self):
        el = self.wait.until(EC.visibility_of_element_located((By.ID, "alert-error")))
        return el.text


class SidebarPage(BasePage):
    """The sidebar injected by public/js/api.js on every logged-in page
    (Dashboard, Admin, Testing) -- notably the #logout-btn."""

    def logout(self):
        self._click_when_present((By.ID, "logout-btn"), "the Logout button")
        return self

    def wait_for_logged_out(self):
        self.wait.until(EC.presence_of_element_located((By.ID, "login-form")))
        return self


class DashboardPage(BasePage):
    """public/dashboard.html — the '/dashboard' route."""

    def wait_until_loaded(self):
        self._wait_for_text_content("welcome-heading", "Welcome", "'Welcome' text in #welcome-heading")
        return self

    def welcome_text(self):
        return self.driver.find_element(By.ID, "welcome-heading").text


class AdminPage(BasePage):
    """public/admin.html — the '/admin' route."""

    def wait_until_loaded(self):
        self._wait_for_text_content(
            "page-eyebrow", "Dashboard",
            "'Dashboard' text in #page-eyebrow (i.e. the Admin Dashboard actually loading)",
        )
        return self

    def eyebrow_text(self):
        return self.driver.find_element(By.ID, "page-eyebrow").text

    def open_users_tab(self):
        self._click_when_present(
            (By.CSS_SELECTOR, '[data-tab="users"]'),
            "the 'Users' tab button"
        )

        self._diagnostic_wait(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "#users-table tbody tr")
            ),
            "at least one row in the Users table after opening it",
        )
        return self

    def delete_user_by_username(self, username):
    row = self._diagnostic_wait(
        EC.presence_of_element_located(
            (
                By.XPATH,
                f"//table[@id='users-table']//tbody/tr[td[contains(normalize-space(), '{username}')]]"
            )
        ),
        f"user row for username '{username}'",
    )

    delete_button = row.find_element(
        By.CSS_SELECTOR,
        "[data-action='delete-user'], .delete-user-btn, button"
    )

    self.driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();",
        delete_button
    )

    confirm_button = self._diagnostic_wait(
        EC.presence_of_element_located(
            (By.ID, "sf-confirm-yes")
        ),
        "the confirmation button",
    )

    self.driver.execute_script(
        "arguments[0].click();",
        confirm_button
    )

    self._diagnostic_wait(
        EC.staleness_of(row),
        f"user row for '{username}' to disappear after deletion",
    )

    return self


class AccessDeniedPage(BasePage):
    """public/access-denied.html — the access-denied page."""

    def wait_until_loaded(self):
        self._diagnostic_wait(
            EC.presence_of_element_located(
                (By.CLASS_NAME, "access-denied-shell")
            ),
            "the Access Denied page",
        )
        return self

    def is_displayed(self):
        return len(
            self.driver.find_elements(
                By.CLASS_NAME, "access-denied-shell"
            )
        ) > 0