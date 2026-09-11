// src/routes/authRoutes.js
import { sendJson, readJsonBody } from '../utils/http.js';
import { validateRegistration, validateLogin } from '../utils/validators.js';
import {
  findUserByIdentifier, usernameExists, emailExists, createUser,
  toSafeUser, touchLastLogin,
} from '../db.js';
import { hashPassword, verifyPassword } from '../auth.js';
import { createSession, destroySession, sessionCookieHeader, parseCookies, SESSION_COOKIE, getUserForToken } from '../sessions.js';

export function registerAuthRoutes(router) {
  // ---- POST /api/auth/register -----------------------------------------
  router.post('/api/auth/register', async (req, res) => {
    let body;
    try { body = await readJsonBody(req); }
    catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }

    const { valid, errors } = validateRegistration(body);
    if (!valid) return sendJson(res, 400, { error: 'Please fix the highlighted fields.', fieldErrors: errors });

    if (usernameExists(body.username)) {
      return sendJson(res, 409, { error: 'Username already exists.', fieldErrors: { username: 'Username already exists.' } });
    }
    if (emailExists(body.email)) {
      return sendJson(res, 409, { error: 'An account with this email already exists.', fieldErrors: { email: 'Email already exists.' } });
    }

    const user = createUser({
      fullName: body.fullName.trim(),
      username: body.username.trim(),
      email: body.email.trim().toLowerCase(),
      passwordHash: hashPassword(body.password),
      employeeId: body.employeeId.trim(),
      department: body.department.trim(),
      phone: body.phone ? body.phone.trim() : null,
      requestedRole: body.role && ['Employee', 'Manager', 'Admin'].includes(body.role) ? body.role : 'Employee',
    });

    return sendJson(res, 201, {
      message: 'Registration successful. Your account is awaiting employee verification.',
      user: toSafeUser(user),
    });
  });

  // ---- POST /api/auth/login ----------------------------------------------
  router.post('/api/auth/login', async (req, res) => {
    let body;
    try { body = await readJsonBody(req); }
    catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }

    const { valid, errors } = validateLogin(body);
    if (!valid) return sendJson(res, 400, { error: 'Please fill in all required fields.', fieldErrors: errors });

    const user = findUserByIdentifier(body.identifier.trim());

    // Deliberately identical message whether the user doesn't exist or the
    // password is wrong -- never reveal which one it was.
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return sendJson(res, 401, { error: 'Invalid username or password.' });
    }

    if (user.accountStatus === 'disabled') {
      return sendJson(res, 403, { error: 'Your account has been disabled.' });
    }
    if (user.accountStatus === 'rejected' || user.verificationStatus === 'rejected') {
      return sendJson(res, 403, { error: 'Your registration was rejected. Please contact an administrator.' });
    }
    if (user.verificationStatus === 'pending' || user.accountStatus === 'pending') {
      return sendJson(res, 403, { error: 'Your account is awaiting employee verification.' });
    }

    const { token } = createSession(user.id);
    touchLastLogin(user.id);
    const fresh = { ...user, lastLogin: new Date().toISOString() };

    return sendJson(res, 200,
      { message: 'Login successful.', user: toSafeUser(fresh) },
      { 'Set-Cookie': sessionCookieHeader(token) },
    );
  });

  // ---- POST /api/auth/logout ----------------------------------------------
  router.post('/api/auth/logout', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    destroySession(cookies[SESSION_COOKIE]);
    return sendJson(res, 200, { message: 'Logged out.' }, { 'Set-Cookie': sessionCookieHeader(null, { clear: true }) });
  });

  // ---- GET /api/auth/me ----------------------------------------------------
  router.get('/api/auth/me', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const user = getUserForToken(cookies[SESSION_COOKIE]);
    if (!user) return sendJson(res, 401, { error: 'Not authenticated.' });
    return sendJson(res, 200, { user: toSafeUser(user) });
  });
}

// Shared helper used by other route modules to resolve "who is making
// this request" from the session cookie.
export function currentUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  return getUserForToken(cookies[SESSION_COOKIE]);
}
