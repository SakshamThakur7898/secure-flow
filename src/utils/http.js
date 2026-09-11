// src/utils/http.js
// A tiny, dependency-free router + set of helpers built directly on
// Node's `http` module. This is deliberately simple (no Express) so the
// whole project runs with `node src/server.js` and nothing to install.
import fs from 'node:fs';
import path from 'node:path';

export class Router {
  constructor() {
    this.routes = [];
  }
  // Accepts one or more handlers: (req, res, next) middleware(s) followed
  // by a final (req, res) handler. Route params are attached to req.params.
  _add(method, routePath, handlers) {
    const paramNames = [];
    const pattern = routePath
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    const regex = new RegExp(`^${pattern}$`);
    this.routes.push({ method, regex, paramNames, handlers });
  }
  get(p, ...h) { this._add('GET', p, h); }
  post(p, ...h) { this._add('POST', p, h); }
  put(p, ...h) { this._add('PUT', p, h); }
  delete(p, ...h) { this._add('DELETE', p, h); }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.regex.exec(pathname);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1]);
        });
        return { handlers: route.handlers, params };
      }
    }
    return null;
  }
}

// Runs a chain of (req, res, next) middlewares ending in a final
// (req, res) handler. Any thrown/rejected error is converted to a 500.
export function runChain(handlers, req, res) {
  let i = 0;
  function next(err) {
    if (err) {
      console.error(err);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error.' });
      return;
    }
    const fn = handlers[i++];
    if (!fn) return;
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (e) {
      next(e);
    }
  }
  next();
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    const MAX = 1024 * 1024; // 1MB guard
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

export function sendFile(res, absPath, statusCode = 200) {
  const ext = path.extname(absPath);
  const mime = MIME[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(absPath);
  stream.on('open', () => {
    res.writeHead(statusCode, { 'Content-Type': mime });
    stream.pipe(res);
  });
  stream.on('error', () => {
    sendJson(res, 404, { error: 'Not found' });
  });
}

export function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}
