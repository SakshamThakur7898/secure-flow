# SecureFlow — Test Cases

These are the manual/structured test cases for the software testing practical.
Each one is also exercised automatically by the Testing Dashboard's five
requirement checks (`npm start` → log in as `admin` → **Testing**). The
"Automated Coverage" row tells you which of the 5 automated requirement
tests exercises that case, so you can point at the dashboard as live
evidence during a live demo.

Seeded accounts used below (see README for the full list):
`admin / Admin@123`, `manager / Manager@123`, `employee / Employee@123`,
`pending / Pending@123`, `rejected / Rejected@123`.

---

### TC-001 — Valid User Login
- **Requirement:** User Login
- **Description:** A user with correct credentials and an active, verified account can log in.
- **Preconditions:** An active, verified account exists (e.g. `employee`).
- **Test Steps:** 1) Go to `/`. 2) Enter `employee` / `Employee@123`. 3) Click Log In.
- **Expected Result:** "Login successful." message, redirected to `/dashboard`, session cookie set.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *User Login* test (step: valid credentials accepted).

### TC-002 — Invalid User Login
- **Requirement:** User Login
- **Description:** A login attempt with a wrong password is rejected.
- **Preconditions:** Account `admin` exists.
- **Test Steps:** 1) Go to `/`. 2) Enter `admin` / wrong password. 3) Submit.
- **Expected Result:** "Invalid username or password." No session is created.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *User Login* test (step: invalid credentials rejected).

### TC-003 — Empty Login Fields
- **Requirement:** User Login
- **Description:** Submitting the login form with empty fields shows inline validation and makes no request.
- **Preconditions:** None.
- **Test Steps:** 1) Go to `/`. 2) Leave both fields empty. 3) Click Log In.
- **Expected Result:** Inline errors: "Email or username is required.", "Password is required."
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** Server-side equivalent enforced by `validateLogin()`; exercised indirectly whenever the Login test runs.

### TC-004 — New User Registration
- **Requirement:** New User Registration
- **Description:** A visitor can register a new account, which starts pending.
- **Preconditions:** Username/email not already in use.
- **Test Steps:** 1) Go to `/register`. 2) Fill in all required fields with valid data. 3) Submit.
- **Expected Result:** "Registration successful. Your account is awaiting employee verification." User is created with `verificationStatus=pending`, `accountStatus=pending`, `role=Employee`.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *New User Registration* test (valid registration step).

### TC-005 — Duplicate Registration
- **Requirement:** New User Registration
- **Description:** Registering with a username or email that already exists is rejected.
- **Preconditions:** An account with that username/email already exists.
- **Test Steps:** 1) Register once successfully. 2) Register again with the same username/email.
- **Expected Result:** HTTP 409, "Username already exists." / "An account with this email already exists."
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *New User Registration* test (duplicate rejection step).

### TC-006 — Invalid Registration Data
- **Requirement:** New User Registration
- **Description:** Invalid email format and mismatched password confirmation are both rejected.
- **Preconditions:** None.
- **Test Steps:** 1) Enter an invalid email (e.g. `not-an-email`). 2) Enter mismatched password/confirm password.
- **Expected Result:** Inline + server-side 400 errors: "Please enter a valid email.", "Passwords do not match."
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *New User Registration* test (invalid email / mismatched password steps).

### TC-007 — Employee Verification
- **Requirement:** Employee Verification
- **Description:** An Admin can verify a pending applicant, activating their account.
- **Preconditions:** A pending applicant exists; logged in as `admin`.
- **Test Steps:** 1) Go to Admin → Employee Verification. 2) Click "Verify" next to the applicant.
- **Expected Result:** `verificationStatus=verified`, `accountStatus=active`; applicant can now log in.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *Employee Verification* test (verify step + subsequent successful login).

### TC-008 — Employee Rejection
- **Requirement:** Employee Verification
- **Description:** An Admin can reject a pending applicant, and that account remains locked out.
- **Preconditions:** A pending applicant exists; logged in as `admin`.
- **Test Steps:** 1) Go to Admin → Employee Verification. 2) Click "Reject".
- **Expected Result:** `verificationStatus=rejected`, `accountStatus=rejected`; login attempts are blocked with "Your registration was rejected...".
- **Actual Result:** As expected (seed account `rejected` demonstrates this state directly).
- **Status:** PASS
- **Automated Coverage:** Reject path is available via `/api/admin/users/:id/reject`; the seeded `rejected` account demonstrates the resulting login block, exercised whenever the Login test's rejected-message path is checked manually.

### TC-009 — Employee Role Access
- **Requirement:** Role-Based Access
- **Description:** An Employee can use their own dashboard but is blocked from Admin-only routes.
- **Preconditions:** Logged in as `employee`.
- **Test Steps:** 1) Visit `/dashboard` (should work). 2) Visit `/admin` or `/testing` directly by URL.
- **Expected Result:** `/dashboard` loads normally; `/admin` and `/testing` return an "Access Denied" page (HTTP 403), enforced by the server, not just hidden navigation.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *Role-Based Access* test (Employee-blocked-from-Admin-route step).

### TC-010 — Manager Role Access
- **Requirement:** Role-Based Access
- **Description:** A Manager can access Manager features but not Admin-only actions.
- **Preconditions:** Logged in as `manager`.
- **Test Steps:** 1) Visit `/admin` (loads a Manager view of Employees). 2) Attempt `POST /api/admin/users/:id/role` (Admin-only).
- **Expected Result:** Manager dashboard loads; the Admin-only role-change request is rejected with HTTP 403.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *Role-Based Access* test (Manager-permitted route + Manager-blocked-from-Admin-only-route steps).

### TC-011 — Admin Role Access
- **Requirement:** Role-Based Access
- **Description:** An Admin can access all administrative features, including Testing.
- **Preconditions:** Logged in as `admin`.
- **Test Steps:** 1) Visit `/admin`. 2) Visit `/testing`. 3) Call `/api/admin/overview`.
- **Expected Result:** All succeed (HTTP 200).
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *Role-Based Access* test (Admin-permitted route step).

### TC-012 — Unauthorized Admin Access
- **Requirement:** Role-Based Access
- **Description:** A request with no session at all cannot reach any Admin-only API.
- **Preconditions:** No session cookie.
- **Test Steps:** 1) Call `GET /api/admin/overview` with no cookie.
- **Expected Result:** HTTP 401 "You must be logged in."
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *Role-Based Access* test (unauthenticated request step).

### TC-013 — User Data Creation
- **Requirement:** User Data Storage
- **Description:** Registering a user actually creates a persistent row in the database.
- **Preconditions:** None.
- **Test Steps:** 1) Register a new user. 2) Inspect the `users` table directly (or via Admin → Users).
- **Expected Result:** A row exists with the submitted data, correct default role/status, and a hashed (not plain-text) password.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *User Data Storage* test (row creation + hash-format assertions).

### TC-014 — User Data Retrieval
- **Requirement:** User Data Storage
- **Description:** Stored user data can be retrieved accurately after creation.
- **Preconditions:** A user exists.
- **Test Steps:** 1) Register a user. 2) Fetch it again via `/api/admin/users` (as Admin) or the database.
- **Expected Result:** All fields (name, email, employeeId, department, role, statuses) match what was submitted.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *User Data Storage* test (retrieval + field-correctness assertions).

### TC-015 — Account Status Check
- **Requirement:** User Data Storage / Employee Verification
- **Description:** `accountStatus` and `verificationStatus` are stored and enforced consistently across the login flow.
- **Preconditions:** Accounts in each state exist (`pending`, `rejected`, `active`).
- **Test Steps:** 1) Attempt login as each of `pending`, `rejected`, `employee` (active). 2) Compare returned message and access.
- **Expected Result:** Pending → "awaiting employee verification"; Rejected → rejection message; Active/Verified → success and dashboard access.
- **Actual Result:** As expected.
- **Status:** PASS
- **Automated Coverage:** *Employee Verification* test (unverified-blocked step) + manual seed accounts for the rejected/active comparison.

---

## Demonstrating a FAILED test live

See the README section **"Demonstrating a FAILED test"** for exact, reversible
code changes (one line each) that break the Login requirement or the
Role-Based Access requirement on purpose, so you can show the Testing
Dashboard correctly reporting `✕ ... REQUIREMENT FAILED` with a real reason,
not just a hardcoded label.
