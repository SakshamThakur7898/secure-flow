// src/testRunner.js
// -----------------------------------------------------------------------
// Automated Requirement Verification.
//
// Every test in here makes REAL HTTP requests to the running server over
// loopback (http://127.0.0.1:<port>), using the actual API routes a
// browser would use, and asserts on the actual responses. Nothing here
// is a hardcoded "PASSED" label -- if you break the underlying logic
// (see the DEMO NOTE comments in auth.js / adminRoutes.js), these tests
// will genuinely report FAILED with a real reason.
//
// Each test also creates its own temporary, uniquely-named data (test
// users) and cleans them up afterwards so the demo stays repeatable.
// -----------------------------------------------------------------------
import { db, findUserByIdentifier } from './db.js';

let BASE_URL = 'http://127.0.0.1:4000';
export function setBaseUrl(url) { BASE_URL = url; }

// A minimal per-flow cookie jar: fetch() doesn't manage cookies for us
// across requests, so tests that need an authenticated session grab the
// Set-Cookie header themselves and thread it through manually.
function extractCookie(response) {
  const raw = response.headers.get('set-cookie');
  if (!raw) return null;
  return raw.split(';')[0]; // "sf_session=abc123"
}

async function api(pathAndMethod, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE_URL}${pathAndMethod}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, body: json, cookie: extractCookie(res) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueSuffix() {
  // Short (base-36) so generated usernames/employeeIds stay within field
  // length limits, e.g. "test_verify_a_kx3f2p9".
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

function deleteUserByUsername(username) {
  db.prepare('DELETE FROM users WHERE username = ?').run(username);
}

async function loginAs(identifier, password) {
  return api('/api/auth/login', { method: 'POST', body: { identifier, password } });
}

// -----------------------------------------------------------------------
// TEST 1 — User Login
// -----------------------------------------------------------------------
async function testLogin() {
  // (a) Wrong password against a real seeded account must be rejected.
  const bad = await loginAs('admin', 'totally-wrong-password');
  assert(bad.status === 401, 'Invalid credentials were incorrectly accepted.');

  // (b) Correct credentials for a verified/active seeded account must succeed.
  const good = await loginAs('admin', 'Admin@123');
  assert(good.status === 200, 'Valid credentials could not be authenticated.');
  assert(good.cookie, 'Login succeeded but no session was created.');

  // (c) The session must actually grant access to a protected endpoint.
  const me = await api('/api/auth/me', { cookie: good.cookie });
  assert(me.status === 200 && me.body?.user?.username === 'admin',
    'A valid session did not grant access to protected routes.');

  return 'Valid credentials were accepted and invalid credentials were rejected. Authentication and protected access are functioning correctly.';
}

// -----------------------------------------------------------------------
// TEST 2 — New User Registration
// -----------------------------------------------------------------------
async function testRegistration() {
  const suffix = uniqueSuffix();
  const username = `test_reg_${suffix}`;
  const email = `test_reg_${suffix}@example.com`;
  const validPayload = {
    fullName: 'Automated Test User',
    username, email,
    password: 'ValidPass@123',
    confirmPassword: 'ValidPass@123',
    employeeId: `TST-${suffix}`,
    department: 'Quality Assurance',
  };

  try {
    // (a) Invalid email must be rejected.
    const badEmail = await api('/api/auth/register', { method: 'POST', body: { ...validPayload, email: 'not-an-email' } });
    assert(badEmail.status === 400, 'A registration with an invalid email was incorrectly accepted.');

    // (b) Mismatched password confirmation must be rejected.
    const badConfirm = await api('/api/auth/register', { method: 'POST', body: { ...validPayload, confirmPassword: 'Different@123' } });
    assert(badConfirm.status === 400, 'A registration with mismatched passwords was incorrectly accepted.');

    // (c) A valid registration must succeed and start as pending.
    const created = await api('/api/auth/register', { method: 'POST', body: validPayload });
    assert(created.status === 201, 'A valid registration was incorrectly rejected.');
    assert(created.body?.user?.verificationStatus === 'pending', 'New account did not receive pending verification status.');
    assert(created.body?.user?.accountStatus === 'pending', 'New account did not receive pending account status.');

    // (d) A duplicate username/email must be rejected.
    const dup = await api('/api/auth/register', { method: 'POST', body: validPayload });
    assert(dup.status === 409, 'A duplicate registration was incorrectly accepted.');

    return 'New users can successfully create accounts and invalid or duplicate registration data is rejected.';
  } finally {
    deleteUserByUsername(username);
  }
}

// -----------------------------------------------------------------------
// TEST 3 — Employee Verification
// -----------------------------------------------------------------------
async function testEmployeeVerification() {
  const suffix = uniqueSuffix();
  const usernameA = `test_verify_a_${suffix}`;
  const usernameB = `test_verify_b_${suffix}`;

  const makeApplicant = (username, email, employeeId) => ({
    fullName: 'Verification Test User',
    username, email,
    password: 'ValidPass@123',
    confirmPassword: 'ValidPass@123',
    employeeId,
    department: 'Quality Assurance',
  });

  try {
    // Create two pending applicants.
    const a = await api('/api/auth/register', { method: 'POST', body: makeApplicant(usernameA, `${usernameA}@example.com`, `TST-A-${suffix}`) });
    const b = await api('/api/auth/register', { method: 'POST', body: makeApplicant(usernameB, `${usernameB}@example.com`, `TST-B-${suffix}`) });
    assert(a.status === 201 && b.status === 201, 'Could not create test applicants for the verification test.');

    // Log in as the seeded Admin.
    const adminLogin = await loginAs('admin', 'Admin@123');
    assert(adminLogin.status === 200 && adminLogin.cookie, 'Admin session could not be created for the verification test.');

    // Admin must be able to see pending applicants.
    const pendingList = await api('/api/admin/users?status=pending', { cookie: adminLogin.cookie });
    const seesA = pendingList.body?.users?.some((u) => u.username === usernameA);
    assert(pendingList.status === 200 && seesA, 'Admin could not see a newly registered pending applicant.');

    // Verify applicant A.
    const verifyRes = await api(`/api/admin/users/${a.body.user.id}/verify`, { method: 'POST', cookie: adminLogin.cookie });
    assert(verifyRes.status === 200 && verifyRes.body?.user?.verificationStatus === 'verified' && verifyRes.body?.user?.accountStatus === 'active',
      'Admin verification did not update the applicant to a verified, active account.');

    // Applicant A can now log in.
    const loginA = await loginAs(usernameA, 'ValidPass@123');
    assert(loginA.status === 200, 'A verified employee could not log in after being verified.');

    // Applicant B (still pending, never verified) must be blocked at login.
    const loginB = await loginAs(usernameB, 'ValidPass@123');
    assert(loginB.status === 403, 'An unverified employee was able to log in and access protected resources.');

    return 'Employee verification correctly controls whether a registered account becomes an authorized employee account.';
  } finally {
    deleteUserByUsername(usernameA);
    deleteUserByUsername(usernameB);
  }
}

// -----------------------------------------------------------------------
// TEST 4 — Role-Based Access
// -----------------------------------------------------------------------
async function testRoleBasedAccess() {
  // No session at all -> must be rejected.
  const anon = await api('/api/admin/overview');
  assert(anon.status === 401, 'An unauthenticated request was able to reach an Admin-only route.');

  // Employee -> must NOT reach Admin-only route.
  const empLogin = await loginAs('employee', 'Employee@123');
  assert(empLogin.status === 200, 'Seeded Employee account could not log in for the role-access test.');
  const empTriesAdmin = await api('/api/admin/overview', { cookie: empLogin.cookie });
  assert(empTriesAdmin.status === 403, 'Employee account was able to access an Admin-only route.');

  // Manager -> can reach Manager route, but NOT an Admin-only role-change route.
  const mgrLogin = await loginAs('manager', 'Manager@123');
  assert(mgrLogin.status === 200, 'Seeded Manager account could not log in for the role-access test.');
  const mgrOwnRoute = await api('/api/manager/employees', { cookie: mgrLogin.cookie });
  assert(mgrOwnRoute.status === 200, 'Manager could not access a Manager-permitted route.');
  const mgrTriesAdminOnly = await api('/api/admin/users/1/role', { method: 'POST', body: { role: 'Admin' }, cookie: mgrLogin.cookie });
  assert(mgrTriesAdminOnly.status === 403, 'Manager account was able to access an Admin-only route.');

  // Admin -> can reach the Admin route.
  const adminLogin = await loginAs('admin', 'Admin@123');
  assert(adminLogin.status === 200, 'Seeded Admin account could not log in for the role-access test.');
  const adminOwnRoute = await api('/api/admin/overview', { cookie: adminLogin.cookie });
  assert(adminOwnRoute.status === 200, 'Admin could not access an Admin-only route it is entitled to use.');

  return 'Users can access features according to their assigned roles and unauthorized role access is blocked.';
}

// -----------------------------------------------------------------------
// TEST 5 — User Data Storage
// -----------------------------------------------------------------------
async function testUserDataStorage() {
  const suffix = uniqueSuffix();
  const username = `test_storage_${suffix}`;
  const email = `test_storage_${suffix}@example.com`;
  const plainPassword = 'ValidPass@123';

  try {
    const created = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Storage Test User', username, email,
        password: plainPassword, confirmPassword: plainPassword,
        employeeId: `TST-S-${suffix}`, department: 'Quality Assurance',
      },
    });
    assert(created.status === 201, 'Could not create a test user for the storage test.');

    // Read the row directly from the database (not the API) to prove
    // real persistence, and that role/verification/account status are
    // stored correctly.
    const row = findUserByIdentifier(username);
    assert(row, 'The created user could not be retrieved from the database.');
    assert(row.role === 'Employee', 'Stored role was incorrect for a new registration.');
    assert(row.verificationStatus === 'pending', 'Stored verification status was incorrect for a new registration.');
    assert(row.accountStatus === 'pending', 'Stored account status was incorrect for a new registration.');

    // The password must never be stored as plain text.
    assert(row.passwordHash && row.passwordHash !== plainPassword, 'Password was stored as plain text.');
    assert(row.passwordHash.includes(':') && row.passwordHash.length > 40,
      'Stored password does not look like a salted hash.');

    return 'User information, role, verification status and account status are successfully persisted and retrieved from the database.';
  } finally {
    deleteUserByUsername(username);
  }
}

// -----------------------------------------------------------------------
export const TEST_DEFINITIONS = {
  login: { requirement: 'User Login', run: testLogin },
  registration: { requirement: 'New User Registration', run: testRegistration },
  verification: { requirement: 'Employee Verification', run: testEmployeeVerification },
  'role-access': { requirement: 'Role-Based Access', run: testRoleBasedAccess },
  'data-storage': { requirement: 'User Data Storage', run: testUserDataStorage },
};

export const TEST_ORDER = ['login', 'registration', 'verification', 'role-access', 'data-storage'];

export async function runOneTest(key) {
  const def = TEST_DEFINITIONS[key];
  if (!def) throw new Error(`Unknown test: ${key}`);
  const start = Date.now();
  const timestamp = new Date().toISOString();
  try {
    const message = await def.run();
    return {
      key, requirement: def.requirement, status: 'PASSED',
      message, errorMessage: null, durationMs: Date.now() - start, timestamp,
    };
  } catch (err) {
    return {
      key, requirement: def.requirement, status: 'FAILED',
      message: `${def.requirement} requirement failed.`, errorMessage: err.message,
      durationMs: Date.now() - start, timestamp,
    };
  }
}
