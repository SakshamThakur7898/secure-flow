// src/routes/adminRoutes.js
import { sendJson, readJsonBody } from '../utils/http.js';
import { currentUser } from './authRoutes.js';
import { ROLES } from '../utils/validators.js';
import {
  listUsers, findUserById, setVerification, setRole, setAccountStatus,
  toSafeUser, logVerificationAction, recentVerificationActivity, db,
  listNotifications, countUnacknowledgedNotifications, acknowledgeNotification, acknowledgeAllNotifications,
} from '../db.js';

// ---------------------------------------------------------------------
// requireRole: THE server-side authorization gate.
//
// This is what actually stops an Employee from calling an Admin API
// simply by knowing/guessing the URL -- it runs regardless of what the
// frontend shows or hides. This is checked on every request to a
// protected route below, not just once at login.
//
// DEMO NOTE (see README "Demonstrating a FAILED test"): to intentionally
// break Role-Based Access for your testing practical, comment out the
// `if (!user || !allowedRoles.includes(user.role))` block below so it
// always calls next(). The Testing Dashboard's Role-Based Access test
// will then correctly report a FAILED result because it actively tries
// an Employee session against this exact route.
// ---------------------------------------------------------------------
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = currentUser(req);
    if (!user) return sendJson(res, 401, { error: 'You must be logged in.' });
    if (!allowedRoles.includes(user.role)) {
      return sendJson(res, 403, { error: 'Access Denied. You do not have permission to perform this action.' });
    }
    req.authUser = user;
    next();
  };
}

export function registerAdminRoutes(router) {
  // ---- GET /api/admin/overview --------------------------------------
  router.get('/api/admin/overview', requireRole('Admin'), async (req, res) => {
    const all = listUsers();
    const overview = {
      totalUsers: all.length,
      verifiedEmployees: all.filter((u) => u.verificationStatus === 'verified').length,
      pendingVerification: all.filter((u) => u.verificationStatus === 'pending').length,
      activeUsers: all.filter((u) => u.accountStatus === 'active').length,
      disabledUsers: all.filter((u) => u.accountStatus === 'disabled' || u.accountStatus === 'rejected').length,
      roleDistribution: {
        Employee: all.filter((u) => u.role === 'Employee').length,
        Manager: all.filter((u) => u.role === 'Manager').length,
        Admin: all.filter((u) => u.role === 'Admin').length,
      },
      recentRegistrations: all
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(toSafeUser),
      recentVerificationActivity: recentVerificationActivity(8),
    };
    return sendJson(res, 200, overview);
  });

  // ---- GET /api/admin/users?status=pending ----------------------------
  router.get('/api/admin/users', requireRole('Admin'), async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const status = url.searchParams.get('status') || undefined;
    const users = listUsers({ status }).map(toSafeUser);
    return sendJson(res, 200, { users });
  });

  // ---- POST /api/admin/users/:id/verify -------------------------------
  router.post('/api/admin/users/:id/verify', requireRole('Admin'), async (req, res) => {
    const target = findUserById(Number(req.params.id));
    if (!target) return sendJson(res, 404, { error: 'User not found.' });
    const updated = setVerification(target.id, 'verified', 'active');
    logVerificationAction(target.id, req.authUser.id, 'verified');
    return sendJson(res, 200, { message: `${target.fullName} has been verified and activated.`, user: toSafeUser(updated) });
  });

  // ---- POST /api/admin/users/:id/reject -------------------------------
  router.post('/api/admin/users/:id/reject', requireRole('Admin'), async (req, res) => {
    const target = findUserById(Number(req.params.id));
    if (!target) return sendJson(res, 404, { error: 'User not found.' });
    const updated = setVerification(target.id, 'rejected', 'rejected');
    logVerificationAction(target.id, req.authUser.id, 'rejected');
    return sendJson(res, 200, { message: `${target.fullName}'s registration has been rejected.`, user: toSafeUser(updated) });
  });

  // ---- POST /api/admin/users/:id/role { role } -------------------------
  router.post('/api/admin/users/:id/role', requireRole('Admin'), async (req, res) => {
    let body;
    try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }
    const target = findUserById(Number(req.params.id));
    if (!target) return sendJson(res, 404, { error: 'User not found.' });
    if (!ROLES.includes(body.role)) return sendJson(res, 400, { error: 'Invalid role.' });
    const updated = setRole(target.id, body.role);
    return sendJson(res, 200, { message: `${target.fullName}'s role updated to ${body.role}.`, user: toSafeUser(updated) });
  });

  // ---- POST /api/admin/users/:id/status { status } ---------------------
  router.post('/api/admin/users/:id/status', requireRole('Admin'), async (req, res) => {
    let body;
    try { body = await readJsonBody(req); } catch { return sendJson(res, 400, { error: 'Invalid request body.' }); }
    const target = findUserById(Number(req.params.id));
    if (!target) return sendJson(res, 404, { error: 'User not found.' });
    if (!['active', 'disabled'].includes(body.status)) return sendJson(res, 400, { error: 'Invalid status.' });
    const updated = setAccountStatus(target.id, body.status);
    return sendJson(res, 200, { message: `${target.fullName}'s account is now ${body.status}.`, user: toSafeUser(updated) });
  });

  // ---- GET /api/manager/employees (Manager + Admin) --------------------
  router.get('/api/manager/employees', requireRole('Manager', 'Admin'), async (req, res) => {
    const employees = listUsers().filter((u) => u.role === 'Employee').map(toSafeUser);
    return sendJson(res, 200, { employees });
  });

  // ---- Notifications (Admin-only) ---------------------------------------
  // A "simple notification" trail of self-service profile edits, so an
  // Admin can see at a glance when a user has changed their own details.
  router.get('/api/admin/notifications', requireRole('Admin'), async (req, res) => {
    return sendJson(res, 200, {
      notifications: listNotifications(30),
      unreadCount: countUnacknowledgedNotifications(),
    });
  });
  router.post('/api/admin/notifications/:id/ack', requireRole('Admin'), async (req, res) => {
    acknowledgeNotification(Number(req.params.id));
    return sendJson(res, 200, { message: 'Notification dismissed.' });
  });
  router.post('/api/admin/notifications/ack-all', requireRole('Admin'), async (req, res) => {
    acknowledgeAllNotifications();
    return sendJson(res, 200, { message: 'All notifications dismissed.' });
  });
}
