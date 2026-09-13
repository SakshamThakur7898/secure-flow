// src/server.js
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

import { Router, runChain, notFound, sendFile } from './utils/http.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerAdminRoutes } from './routes/adminRoutes.js';
import { registerTestRoutes } from './routes/testRoutes.js';
import { registerPageRoutes, PUBLIC_DIR } from './routes/pageRoutes.js';
import { setBaseUrl } from './testRunner.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const router = new Router();

registerAuthRoutes(router);
registerAdminRoutes(router);
registerTestRoutes(router);
registerPageRoutes(router);

const STATIC_PREFIXES = ['/css/', '/js/'];

function tryServeStatic(req, res, pathname) {
  if (!STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;

  const safeRelative = path
    .normalize(pathname)
    .replace(/^(\.\.[/\\])+/, '');

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

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    const pathname = url.pathname;

    if (tryServeStatic(req, res, pathname)) return;

    const match = router.match(req.method, pathname);

    if (!match) {
      return notFound(res);
    }

    req.params = match.params;
    runChain(match.handlers, req, res);
  });
}

const server = createServer();

server.listen(PORT, HOST, () => {
  setBaseUrl(`http://127.0.0.1:${PORT}`);

  console.log(
    `SecureFlow running at http://${HOST}:${PORT}`
  );

  console.log(
    'Seeded accounts: admin / manager / employee / pending / rejected (see README for passwords).'
  );
});