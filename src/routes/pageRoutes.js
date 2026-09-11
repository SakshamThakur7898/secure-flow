// src/routes/pageRoutes.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendFile } from '../utils/http.js';
import { currentUser } from './authRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function page(name) {
  return path.join(PUBLIC_DIR, name);
}

// ---------------------------------------------------------------------
// Server-side page gating.
//
// This is a *second*, independent layer of protection on top of the API
// authorization in adminRoutes.js's requireRole(). Even if someone
// disables JavaScript or types /admin or /testing directly into the
// address bar, the server checks the session + role BEFORE it ever
// sends the HTML down -- an Employee gets the Access Denied page, not
// the Admin page with its script simply failing to load data.
// ---------------------------------------------------------------------
export function registerPageRoutes(router) {
  router.get('/', async (req, res) => {
    const user = currentUser(req);
    if (user) return sendFile(res, page('dashboard-redirect.html'));
    return sendFile(res, page('index.html'));
  });

  router.get('/register', async (req, res) => sendFile(res, page('register.html')));

  router.get('/dashboard', async (req, res) => {
    const user = currentUser(req);
    if (!user) return sendFile(res, page('index.html'));
    return sendFile(res, page('dashboard.html'));
  });

  router.get('/admin', async (req, res) => {
    const user = currentUser(req);
    if (!user) return sendFile(res, page('index.html'));
    // Admin gets the full Admin Dashboard; Manager gets the same shell but
    // the page's own script only requests Manager-permitted API data.
    // Employees are blocked here, server-side, regardless of the URL.
    if (user.role !== 'Admin' && user.role !== 'Manager') return sendFile(res, page('access-denied.html'), 403);
    return sendFile(res, page('admin.html'));
  });

  router.get('/testing', async (req, res) => {
    const user = currentUser(req);
    if (!user) return sendFile(res, page('index.html'));
    if (user.role !== 'Admin') return sendFile(res, page('access-denied.html'), 403);
    return sendFile(res, page('testing.html'));
  });

  router.get('/access-denied', async (req, res) => sendFile(res, page('access-denied.html'), 403));
}
