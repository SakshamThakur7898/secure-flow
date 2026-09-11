// src/sessions.js
import { generateToken } from './auth.js';
import { createSessionRow, getSessionRow, deleteSessionRow, findUserById } from './db.js';

export const SESSION_COOKIE = 'sf_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(userId) {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  createSessionRow(token, userId, expiresAt);
  return { token, expiresAt };
}

// Returns the authenticated user row (including passwordHash — caller
// must strip it before sending to the client) or null.
export function getUserForToken(token) {
  if (!token) return null;
  const session = getSessionRow(token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSessionRow(token);
    return null;
  }
  return findUserById(session.userId) || null;
}

export function destroySession(token) {
  if (token) deleteSessionRow(token);
}

export function parseCookies(cookieHeader = '') {
  const out = {};
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

export function sessionCookieHeader(token, { clear = false } = {}) {
  if (clear) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}
