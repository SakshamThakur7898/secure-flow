// src/db.js
// -----------------------------------------------------------------------
// Persistence layer for SecureFlow.
//
// Uses Node's *built-in* experimental `node:sqlite` module. This keeps the
// whole project dependency-free (no `npm install` required, nothing to
// compile) which makes it trivial to clone and run for a grading/demo
// session. Data is a real, on-disk, relational SQLite database — not an
// in-memory mock — so restarting the server does not lose data.
// -----------------------------------------------------------------------
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'secureflow.sqlite');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName           TEXT NOT NULL,
    username           TEXT NOT NULL UNIQUE,
    email              TEXT NOT NULL UNIQUE,
    passwordHash       TEXT NOT NULL,
    employeeId         TEXT NOT NULL,
    department         TEXT NOT NULL,
    phone              TEXT,
    role               TEXT NOT NULL DEFAULT 'Employee'
                         CHECK (role IN ('Employee','Manager','Admin')),
    requestedRole      TEXT,
    verificationStatus TEXT NOT NULL DEFAULT 'pending'
                         CHECK (verificationStatus IN ('pending','verified','rejected')),
    accountStatus      TEXT NOT NULL DEFAULT 'pending'
                         CHECK (accountStatus IN ('pending','active','disabled','rejected')),
    lastLogin          TEXT,
    createdAt          TEXT NOT NULL,
    updatedAt          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token     TEXT PRIMARY KEY,
    userId    INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL,
    adminId   INTEGER NOT NULL,
    action    TEXT NOT NULL, -- 'verified' | 'rejected'
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS test_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    requirement   TEXT NOT NULL,
    status        TEXT NOT NULL, -- PASSED | FAILED
    message       TEXT,
    errorMessage  TEXT,
    durationMs    INTEGER,
    timestamp     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile_update_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    userId        INTEGER NOT NULL,
    changedFields TEXT NOT NULL, -- comma-separated, e.g. "email, phone"
    timestamp     TEXT NOT NULL,
    acknowledged  INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------
// Seed data — created only once, on first boot (idempotent).
// Documented, clearly-fake development credentials (see README).
// ---------------------------------------------------------------------
function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO users
      (fullName, username, email, passwordHash, employeeId, department, phone,
       role, requestedRole, verificationStatus, accountStatus, lastLogin, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const seedUsers = [
    {
      fullName: 'Alex Admin',
      username: 'admin',
      email: 'admin@secureflow.dev',
      password: 'Admin@123',
      employeeId: 'EMP-0001',
      department: 'IT Administration',
      phone: '+1-000-0001',
      role: 'Admin',
      verificationStatus: 'verified',
      accountStatus: 'active',
    },
    {
      fullName: 'Morgan Manager',
      username: 'manager',
      email: 'manager@secureflow.dev',
      password: 'Manager@123',
      employeeId: 'EMP-0002',
      department: 'Operations',
      phone: '+1-000-0002',
      role: 'Manager',
      verificationStatus: 'verified',
      accountStatus: 'active',
    },
    {
      fullName: 'Jane Employee',
      username: 'employee',
      email: 'employee@secureflow.dev',
      password: 'Employee@123',
      employeeId: 'EMP-0003',
      department: 'Customer Support',
      phone: '+1-000-0003',
      role: 'Employee',
      verificationStatus: 'verified',
      accountStatus: 'active',
    },
    {
      fullName: 'Pat Pending',
      username: 'pending',
      email: 'pending@secureflow.dev',
      password: 'Pending@123',
      employeeId: 'EMP-0004',
      department: 'Marketing',
      phone: '+1-000-0004',
      role: 'Employee',
      verificationStatus: 'pending',
      accountStatus: 'pending',
    },
    {
      fullName: 'Rex Rejected',
      username: 'rejected',
      email: 'rejected@secureflow.dev',
      password: 'Rejected@123',
      employeeId: 'EMP-0005',
      department: 'Sales',
      phone: '+1-000-0005',
      role: 'Employee',
      verificationStatus: 'rejected',
      accountStatus: 'rejected',
    },
  ];

  for (const u of seedUsers) {
    insert.run(
      u.fullName, u.username, u.email, hashPassword(u.password), u.employeeId,
      u.department, u.phone, u.role, u.role, u.verificationStatus, u.accountStatus,
      null, now, now
    );
  }
}
seedIfEmpty();

// ---------------------------------------------------------------------
// User queries
// ---------------------------------------------------------------------
export function findUserByIdentifier(identifier) {
  return db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
}
export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
export function usernameExists(username) {
  return !!db.prepare('SELECT id FROM users WHERE username = ?').get(username);
}
export function emailExists(email) {
  return !!db.prepare('SELECT id FROM users WHERE email = ?').get(email);
}
export function createUser(data) {
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO users
      (fullName, username, email, passwordHash, employeeId, department, phone,
       role, requestedRole, verificationStatus, accountStatus, lastLogin, createdAt, updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    data.fullName, data.username, data.email, data.passwordHash, data.employeeId,
    data.department, data.phone || null, 'Employee', data.requestedRole || 'Employee',
    'pending', 'pending', null, now, now
  );
  return findUserById(Number(info.lastInsertRowid));
}
export function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
export function countAdmins() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Admin'").get();
  return count;
}
export function listUsers({ status } = {}) {
  if (status) {
    return db.prepare('SELECT * FROM users WHERE verificationStatus = ? ORDER BY createdAt DESC').all(status);
  }
  return db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all();
}
export function setVerification(id, verificationStatus, accountStatus) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET verificationStatus = ?, accountStatus = ?, updatedAt = ? WHERE id = ?')
    .run(verificationStatus, accountStatus, now, id);
  return findUserById(id);
}
export function setRole(id, role) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?').run(role, now, id);
  return findUserById(id);
}
export function setAccountStatus(id, accountStatus) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET accountStatus = ?, updatedAt = ? WHERE id = ?').run(accountStatus, now, id);
  return findUserById(id);
}
export function touchLastLogin(id) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET lastLogin = ?, updatedAt = ? WHERE id = ?').run(now, now, id);
}

// ---------------------------------------------------------------------
// Self-service profile edits + the resulting Admin notification.
// ---------------------------------------------------------------------
export function emailExistsForOtherUser(email, excludeId) {
  return !!db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, excludeId);
}
export function updateOwnProfile(id, { fullName, email, phone, department }) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET fullName = ?, email = ?, phone = ?, department = ?, updatedAt = ? WHERE id = ?')
    .run(fullName, email, phone || null, department, now, id);
  return findUserById(id);
}
export function insertProfileUpdateLog(userId, changedFields) {
  db.prepare('INSERT INTO profile_update_log (userId, changedFields, timestamp, acknowledged) VALUES (?,?,?,0)')
    .run(userId, changedFields.join(', '), new Date().toISOString());
}
export function listNotifications(limit = 30) {
  return db.prepare(`
    SELECT pul.id, pul.changedFields, pul.timestamp, pul.acknowledged, u.fullName AS userName, u.id AS userId
    FROM profile_update_log pul
    JOIN users u ON u.id = pul.userId
    ORDER BY pul.timestamp DESC LIMIT ?
  `).all(limit);
}
export function countUnacknowledgedNotifications() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM profile_update_log WHERE acknowledged = 0').get();
  return count;
}
export function acknowledgeNotification(id) {
  db.prepare('UPDATE profile_update_log SET acknowledged = 1 WHERE id = ?').run(id);
}
export function acknowledgeAllNotifications() {
  db.prepare('UPDATE profile_update_log SET acknowledged = 1 WHERE acknowledged = 0').run();
}

export function logVerificationAction(userId, adminId, action) {
  db.prepare('INSERT INTO verification_log (userId, adminId, action, timestamp) VALUES (?,?,?,?)')
    .run(userId, adminId, action, new Date().toISOString());
}
export function recentVerificationActivity(limit = 8) {
  return db.prepare(`
    SELECT vl.id, vl.action, vl.timestamp, u.fullName AS userName, a.fullName AS adminName
    FROM verification_log vl
    JOIN users u ON u.id = vl.userId
    JOIN users a ON a.id = vl.adminId
    ORDER BY vl.timestamp DESC LIMIT ?
  `).all(limit);
}

// ---------------------------------------------------------------------
// Session queries
// ---------------------------------------------------------------------
export function createSessionRow(token, userId, expiresAt) {
  db.prepare('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?,?,?,?)')
    .run(token, userId, new Date().toISOString(), expiresAt);
}
export function getSessionRow(token) {
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
}
export function deleteSessionRow(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ---------------------------------------------------------------------
// Test history queries
// ---------------------------------------------------------------------
export function insertTestHistory(row) {
  db.prepare(`
    INSERT INTO test_history (requirement, status, message, errorMessage, durationMs, timestamp)
    VALUES (?,?,?,?,?,?)
  `).run(row.requirement, row.status, row.message || null, row.errorMessage || null, row.durationMs, row.timestamp);
}
export function listTestHistory(limit = 100) {
  return db.prepare('SELECT * FROM test_history ORDER BY id DESC LIMIT ?').all(limit);
}
export function clearTestHistory() {
  db.prepare('DELETE FROM test_history').run();
}

// ---------------------------------------------------------------------
// Public-safe projection of a user row (never leak passwordHash)
// ---------------------------------------------------------------------
export function toSafeUser(u) {
  if (!u) return null;
  const { passwordHash, ...safe } = u;
  return safe;
}
