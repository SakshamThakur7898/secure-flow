# Changelog

All notable changes to SecureFlow across iterations of this project.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

---

## [0.1.0] — Initial Release

The first working build: a complete, genuinely functional user-management
system with an Admin-only automated Testing Dashboard.

### Added
- Full user lifecycle: **Registration → pending → Admin verification →
  active → role-based login**.
- Roles: **Employee / Manager / Admin**, enforced **server-side** on every
  protected API route (`requireRole()`) *and* every protected page load
  (`/admin`, `/testing`) — not just hidden navigation links.
- Zero-dependency Node.js backend: Node's built-in `http` module with a
  small custom router, **`node:sqlite`** for a real on-disk relational
  database, and **`crypto.scrypt`** for salted, timing-safe password
  hashing. No `npm install` required.
- Database tables: `users`, `sessions`, `verification_log`, `test_history`.
- **Admin Testing Dashboard** (`/testing`) with 5 genuinely automated
  requirement checks — User Login, New User Registration, Employee
  Verification, Role-Based Access, User Data Storage — each making real
  HTTP requests against the live server and asserting on real responses
  (not hardcoded PASS labels). Includes Run All / Run Test per card, a
  live scrolling execution log, progress bar, overall system-health
  banner, and persisted Test History.
- Documented, reversible **failure-injection demo paths** (one-line
  changes) so the Login and Role-Based Access tests can be shown failing
  for real, on purpose, during a live demonstration.
- Frontend: Login, Register, User Dashboard, Admin Dashboard, Testing
  Dashboard, and Access Denied pages — plain HTML/CSS/JavaScript, no
  framework, no build step.
- Seed/demo accounts: `admin`, `manager`, `employee`, `pending`, `rejected`.
- `README.md` and `TEST_CASES.md` (TC-001 through TC-015).

---

## [0.2.0] — Fix: Admin sidebar navigation

### Fixed
- Clicking **Users** / **Employee Verification** / **Role Management** in
  the Admin sidebar did nothing, because those links point to
  `/admin#users` etc. — since you're already on `/admin`, the browser only
  changed the URL hash and never reloaded the page, so the tab-switching
  script never ran. Added a `hashchange` listener (and a check of the hash
  on first page load) so those links now correctly open their tab,
  including the Verify/Reject actions that were unreachable as a result.
- Fixed all four Admin sidebar links lighting up as "active"
  simultaneously; only the currently open tab is now highlighted.

---

## [0.3.0] — Feature: Self-service profile editing + Admin notifications

### Added
- **Edit Profile** button on the User Dashboard — any logged-in user
  (Employee/Manager/Admin) can update their own `fullName`, `email`,
  `phone`, and `department`. `username`, `employeeId`, `role`, and both
  status fields remain Admin-controlled and aren't editable here.
  Server-side email-uniqueness re-check on every save.
- New `profile_update_log` database table recording exactly which fields
  changed and when.
- **Admin notification bell** (top-right of `/admin`) — unread-count
  badge, dropdown panel listing each profile change (e.g. "Jane Employee
  updated their email, phone."), per-item **Dismiss**, and **Mark all
  read**. Lightly polls every 30s to stay current.
- New endpoints: `POST /api/auth/profile`,
  `GET /api/admin/notifications`, `POST /api/admin/notifications/:id/ack`,
  `POST /api/admin/notifications/ack-all`.

---

## [0.4.0] — Render deployment support + Mobile responsiveness

### Changed
- `server.js`: now exports `createServer()`; `HOST` defaults to
  **`0.0.0.0`** (was `127.0.0.1`) so the app is reachable when hosted
  (e.g. Render); the Testing Dashboard's automated self-tests always talk
  to `127.0.0.1` internally regardless of what the server binds to.
- `db.js`: the SQLite file location can now be overridden with a
  **`DATA_DIR`** environment variable (falls back to the local `./data`
  folder), so attaching a host's persistent disk later needs no code
  change.

### Added
- Full mobile-responsive layout: a hamburger button + slide-in sidebar
  drawer with a dark backdrop on screens ≤860px (Dashboard/Admin/Testing),
  injected automatically from shared JS — no per-page HTML changes needed.
- Tighter padding/spacing on small screens (≤480px) for cards, the
  login/register card, and the Edit Profile modal.
- Admin tab bar now wraps instead of overflowing; the notification panel
  becomes a full-width sheet on narrow screens.

---

## [0.5.0] — Feature: Permanent user deletion

Previously, **Disable** only soft-locked an account (reversible,
`accountStatus = disabled`, record stays in the database) — there was no
way to actually remove a user.

### Added
- **Delete** button (Admin → Users tab) for permanent account removal,
  behind a styled Yes/No confirmation dialog (`SecureFlow.confirmDialog`,
  reusable app-wide) instead of the native browser `confirm()`.
- New `DELETE /api/admin/users/:id` endpoint with server-side guards: an
  Admin can't delete their own account, and can't delete the last
  remaining Admin account — so it's impossible to lock yourself out.
- Enabled `PRAGMA foreign_keys = ON` so deleting a user now genuinely
  cascades to their `sessions` and `profile_update_log` rows instead of
  leaving them orphaned (this pragma was previously never set, so the
  `ON DELETE CASCADE` clauses already in the schema were silently inert).

---

## [0.6.0] — Feature: Selenium browser-automation test suite (Practical 2)

A second, independent testing layer for the college practical
"Install Selenium and test the website" — separate from, and not a
replacement for, the built-in Admin `/testing` dashboard.

### Added
- `selenium_tests/` — Python + Selenium + pytest suite driving a real
  Chrome browser through the actual UI: Website Launch, Valid/Invalid
  Login, User Registration (with a unique account per run and automatic
  cleanup via the real Admin Delete feature), duplicate-registration
  rejection, Admin login/access, an Employee genuinely blocked from
  `/admin` and `/testing`, and Logout.
- Centralized configuration (`config.py`) via `SELENIUM_BASE_URL` (so the
  same suite can target a local server or a deployed Render URL),
  `SELENIUM_HEADLESS`, and overridable seeded-credential env vars —
  nothing hard-coded across test files, optionally loaded from a
  git-ignored `.env`.
- A small Page Object Model (`pages.py`) built entirely from the actual
  element IDs already in the project's HTML/JS — no guessed selectors.
- Chrome via Selenium Manager (no manual `chromedriver` download), visible
  by default for live demos, headless via env var for CI.
- Automatic screenshot-on-failure (`selenium_tests/screenshots/`, git-ignored).
- `selenium_tests/README_SELENIUM.md` with install/run instructions.

---

## Versioning note
This project hasn't been published anywhere with formal version tags —
these numbers just label the iterations of this build for your own
tracking. Feel free to relabel them (e.g. `1.0.0`, `1.1.0`, ...) if you'd
rather follow strict semantic versioning for your submission.
