// src/server.js
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { Router, runChain, notFound } from './utils/http.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerAdminRoutes } from './routes/adminRoutes.js';
import { registerTestRoutes } from './routes/testRoutes.js';
import { registerPageRoutes, PUBLIC_DIR } from './routes/pageRoutes.js';
import { sendFile } from './utils/http.js';
import { setBaseUrl } from './testRunner.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';

const router = new Router();
registerAuthRoutes(router);
registerAdminRoutes(router);
registerTestRoutes(router);
registerPageRoutes(router);

const STATIC_PREFIXES = ['/css/', '/js/'];

function tryServeStatic(req, res, pathname) {
  if (!STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  // Prevent path traversal outside of /public.
  const safeRelative = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const absPath = path.join(PUBLIC_DIR, safeRelative);
  if (!absPath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return true;
  }
  if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
    sendFile(res, absPath);
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (tryServeStatic(req, res, pathname)) return;

  const match = router.match(req.method, pathname);
  if (!match) return notFound(res);

  req.params = match.params;
  runChain(match.handlers, req, res);
});

server.listen(PORT, HOST, () => {
  setBaseUrl(`http://${HOST}:${PORT}`);
  console.log(`SecureFlow running at http://${HOST}:${PORT}`);
  console.log('Seeded accounts: admin / manager / employee / pending / rejected (see README for passwords).');
});
