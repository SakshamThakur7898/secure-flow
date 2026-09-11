# SecureFlow — User Management & Storage System

An academic **software testing** project: a real, working user-management
web application (registration → employee verification → role-based
dashboards) paired with an **Admin-only Testing Dashboard** that runs live,
automated checks against the actual running application and reports genuine
PASS/FAIL results — not hardcoded green checkmarks.

---

## 1. Project purpose

This project exists to demonstrate — and let you *prove*, live, in front of
an examiner — five user-management requirements:

1. **User Login**
2. **New User Registration**
3. **Employee Verification**
4. **Role-Based Access Control**
5. **User Data Storage**

Each requirement is implemented for real (real password hashing, a real
on-disk database, real server-side authorization) and then *independently
re-verified* by the Testing Dashboard, which makes real HTTP requests to the
running server and asserts on the real responses.

---

## 2. Technology stack (and why it has zero npm dependencies)

| Layer | Technology |
|---|---|
| Server | Node.js `http` module + a small ~60-line custom router (no Express) |
| Database | **`node:sqlite`** — Node's built-in SQLite driver (real, on-disk, relational SQLite — not a mock) |
| Password hashing | **`node:crypto` `scrypt`** — salted, memory-hard, timing-safe compare |
| Sessions | Signed random tokens in an HttpOnly cookie, backed by a `sessions` table |
| Frontend | Plain HTML/CSS/JavaScript (no framework, no build step) |
| Icons / Font | Lucide icons + Google Fonts "Inter", both loaded from a CDN by the browser at runtime |

**Why not React/TypeScript/Express/bcrypt as originally suggested?** The
brief itself says: *"Choose the simplest reliable architecture that can run
locally."* This project intentionally ships with **zero npm
dependencies** — no `express`, no `bcrypt`, no bundler — so that:

- `npm install` is not even a step; you literally just run `npm start`.
- There is nothing to fail to compile/install in a locked-down classroom or
  offline lab machine.
- Every requirement in the brief (real hashing, real persistent SQL
  database, real server-side RBAC, real automated tests) is still met, using
  Node's own built-in, production-grade primitives (`node:sqlite`,
  `crypto.scrypt`) instead of third-party equivalents.

If you'd prefer to reintroduce Express/React/bcrypt for your own submission,
the code is organized so that's a mechanical swap (see `src/utils/http.js`
for the router to replace, `src/auth.js` for the hashing to replace) — but
it is **not required** for anything in this project to function correctly.

> **Note:** `node:sqlite` is a stable-enough *experimental* Node API (Node
> ≥ 22.5). You'll see one harmless `ExperimentalWarning` printed on startup —
> that's expected, not an error.

---

## 3. Installation & running locally (including Windows)

### Prerequisites
- **Node.js version 22.5 or newer** (Node 22.22+ recommended). Check with:
  ```
  node --version
  ```
  Download from https://nodejs.org if needed.

### Steps (Windows / macOS / Linux — identical)
```bash
# 1. Unzip the project, then open a terminal inside the secureflow/ folder
cd secureflow

# 2. There is nothing to install — just start the server
npm start
```
You should see:
```
SecureFlow running at http://127.0.0.1:4000
Seeded accounts: admin / manager / employee / pending / rejected (see README for passwords).
```
Open **http://127.0.0.1:4000** in your browser.

On Windows specifically: use PowerShell, Command Prompt, or Windows Terminal
— all work the same way, since the project has no OS-specific dependencies
or native modules to compile.

To change the port: `set PORT=5000 && npm start` (Windows) or
`PORT=5000 npm start` (macOS/Linux).

### Resetting the database
The database lives at `data/secureflow.sqlite` and is created automatically
on first run. To wipe it and start over with fresh seed data:
```bash
npm run seed:reset
npm start
```

---

## 4. Database setup

No setup required — `node:sqlite` creates `data/secureflow.sqlite` on first
boot and runs the schema in `src/db.js` automatically (`CREATE TABLE IF NOT
EXISTS`). Tables: `users`, `sessions`, `verification_log`, `test_history`.

Passwords are **never** stored as plain text — see `src/auth.js`. Each
password is hashed with a unique random salt using `scrypt`, stored as
`salt:hash` hex, and compared with a timing-safe comparison.

---

## 5. Development / seed accounts

**These are clearly-fake, documented, development-only credentials.** They
are recreated automatically the first time the app runs against an empty
database (see `seedIfEmpty()` in `src/db.js`).

| Username | Password | Role | Verification | Account Status |
|---|---|---|---|---|
| `admin` | `Admin@123` | Admin | verified | active |
| `manager` | `Manager@123` | Manager | verified | active |
| `employee` | `Employee@123` | Employee | verified | active |
| `pending` | `Pending@123` | Employee | **pending** | pending |
| `rejected` | `Rejected@123` | Employee | **rejected** | rejected |

Use `pending` to demonstrate the "awaiting employee verification" login
block, and `rejected` to demonstrate the rejected-account login block.

---

## 6. User requirements implemented

- **Login** (`/`) — email/username + password, show/hide password, field
  validation, loading state, precise status messages, no leaking of which
  field was wrong.
- **Registration** (`/register`) — all required fields, inline validation,
  password strength meter, uniqueness checks, starts `pending`/`pending`.
- **Employee Verification** — Admin → *Employee Verification* tab: table of
  pending applicants with Verify / Reject actions that really flip
  `verificationStatus`/`accountStatus` and are enforced at login.
- **Role-Based Access Control** — Employee / Manager / Admin, enforced
  **server-side** on every API call (`requireRole()` in
  `src/routes/adminRoutes.js`) *and* on page loads themselves
  (`src/routes/pageRoutes.js`) — typing `/admin` or `/testing` into the
  address bar as an Employee returns a real HTTP 403 Access Denied page, not
  just a hidden nav link.
- **User Dashboard** (`/dashboard`) — welcome message, account/verification/
  role/last-login cards, full profile section, logout.
- **Admin Dashboard** (`/admin`) — overview stat cards, recent
  registrations, recent verification activity, role distribution bars, full
  user table, role management.
- **Manager Dashboard** — Managers land on `/admin` too, but the page and
  its API calls only expose the Manager-permitted "Employees" view; Admin-
  only tabs and endpoints are invisible *and* rejected server-side if
  called directly.

---

## 7. Testing requirements & the Testing Dashboard (`/testing`, Admin-only)

### What makes these tests "real" and not fake green checkmarks
Every one of the 5 automated tests (`src/testRunner.js`) makes **actual HTTP
requests over loopback** to the same running server a browser would use —
logging in, registering, verifying, checking role-gated routes, and reading
the database directly to confirm persistence — and asserts on the real
responses. Each test creates its own uniquely-named temporary data and
cleans it up afterward, so re-running the suite is always safe and
repeatable.

| Test key | Requirement | What it actually does |
|---|---|---|
| `login` | User Login | Tries a wrong password (must be rejected), then the real `admin` password (must succeed + create a session that itself grants access to a protected route). |
| `registration` | New User Registration | Tries an invalid email (rejected), mismatched passwords (rejected), a valid registration (accepted, `pending`), then a duplicate of it (rejected). |
| `verification` | Employee Verification | Registers two temp applicants, logs in as `admin`, confirms the Admin can see them as pending, verifies one, confirms it can now log in, confirms the *other* (never verified) is still blocked. |
| `role-access` | Role-Based Access | Confirms: no session → 401 on an Admin route; Employee → 403 on an Admin route; Manager → 200 on its own route but 403 on an Admin-only route; Admin → 200 on the Admin route. |
| `data-storage` | User Data Storage | Registers a temp user, reads the row back **directly from the SQLite database** (not the API), and asserts the role/verification/account-status fields and the password hash format are correct. |

### Using the dashboard
- **Run All Tests** — runs all 5 sequentially, animating each card through
  `PENDING → TESTING → PASSED/FAILED`, with a live scrolling **Test
  Execution Log**, running counts, a progress bar, and an overall
  **SYSTEM HEALTHY** / **SOME TESTS FAILED** banner.
- **Run Test** (on each card) — runs that one requirement individually, for
  demonstrating a specific requirement in isolation.
- **Test History** — every run (individual or "Run All") is persisted to the
  `test_history` table with requirement, status, timestamp, duration, and
  message/error, and can be cleared with **Clear History**.

### Demonstrating a FAILED test (important for your practical)
The brief specifically asks for the dashboard to be *capable* of showing a
real FAILED result, not just permanently-green tests. Two ready-made,
one-line, fully reversible breakages are documented directly in the code:

**Break Login** — in `src/auth.js`, inside `verifyPassword`, add
`return true;` as the very first line (there's a `DEMO NOTE` comment marking
exactly where). Restart the server, run the **User Login** test: it will
correctly report
```
✕ LOGIN REQUIREMENT FAILED
Reason: Invalid credentials were incorrectly accepted.
```
Remove the line to restore correct behavior.

**Break Role-Based Access** — in `src/routes/adminRoutes.js`, inside
`requireRole()`, comment out the
`if (!allowedRoles.includes(user.role)) { ... }` block (there's a `DEMO
NOTE` comment marking exactly where) so it always calls `next()`. Restart
the server, run the **Role-Based Access** test: it will correctly report
```
✕ ROLE-BASED ACCESS REQUIREMENT FAILED
Reason: Employee account was able to access an Admin-only route.
```
Uncomment the block to restore correct behavior.

Because the tests hit the real server over real HTTP and assert on real
responses, *any* genuine regression in the underlying logic — not just
these two documented ones — will show up as a FAILED test with a
descriptive reason.

---

## 8. Test cases

See **[`TEST_CASES.md`](./TEST_CASES.md)** for the full structured test
case list (TC-001 through TC-015): each with Test ID, Requirement,
Description, Preconditions, Steps, Expected Result, Actual Result, Status,
and which of the 5 automated Testing Dashboard checks covers it.

---

## 9. Project structure

```
secureflow/
├── package.json              # zero dependencies — "npm start" is all you need
├── README.md
├── TEST_CASES.md
├── data/                     # secureflow.sqlite created here on first run
├── src/
│   ├── server.js             # entry point: wires router + static files + listen()
│   ├── db.js                 # node:sqlite schema, seed data, all queries
│   ├── auth.js                # password hashing (scrypt) — DEMO NOTE for failure demo
│   ├── sessions.js           # session create/verify/destroy, cookie helpers
│   ├── testRunner.js         # the 5 real, self-testing requirement checks
│   ├── reset.js              # `npm run seed:reset` — wipes the local DB
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth/register, /login, /logout, /me
│   │   ├── adminRoutes.js    # /api/admin/*, /api/manager/* + requireRole() — DEMO NOTE
│   │   ├── testRoutes.js     # /api/tests/* (Admin-only)
│   │   └── pageRoutes.js     # server-side page gating for /admin, /testing, etc.
│   └── utils/
│       ├── http.js           # tiny router, body/JSON helpers, static file serving
│       └── validators.js     # registration/login validation, password strength
└── public/
    ├── index.html / register.html / dashboard.html / admin.html / testing.html / access-denied.html
    ├── css/styles.css
    └── js/ (api.js shared helpers + one script per page)
```

---

## 10. Security notes
- Passwords: salted `scrypt`, timing-safe compare, never logged or returned
  by any API (`toSafeUser()` strips `passwordHash` before every response).
- Sessions: random 256-bit tokens in an `HttpOnly`, `SameSite=Lax` cookie;
  server-side session table with expiry.
- Authorization: checked **on the server**, on every protected API call and
  every protected page load — never relies on the frontend hiding a button
  or a link.
- Generic error messages: invalid login never reveals whether the username
  or the password was wrong.
- Input validation happens both client-side (fast feedback) and
  server-side (the actual enforcement — the client-side checks are only a
  UX convenience and can't be trusted on their own).
