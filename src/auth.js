// src/auth.js
// -----------------------------------------------------------------------
// Password hashing helpers.
//
// The brief suggests bcrypt/argon2. Because this project intentionally
// ships with ZERO npm dependencies (see README "Why no dependencies?"),
// we use Node's built-in `crypto.scrypt` instead — it is a memory-hard,
// salted KDF designed for exactly this purpose (it's what Node's own
// docs recommend when bcrypt/argon2 aren't available) and is NIST/OWASP
// endorsed for password storage. Every password gets a unique random
// salt, and comparison is done in constant time to avoid timing attacks.
// -----------------------------------------------------------------------
import crypto from 'node:crypto';

const KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto.scryptSync(plainPassword, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

// ---------------------------------------------------------------------
// DEMO / TESTING NOTE (see README "Demonstrating a FAILED test"):
// To intentionally break the Login requirement for your testing
// practical, you can make this function always return true, e.g.:
//
//     export function verifyPassword(plainPassword, stored) {
//       return true; // <-- BROKEN ON PURPOSE FOR DEMO
//     }
//
// The Testing Dashboard's Login test will then correctly report
// "✕ LOGIN REQUIREMENT FAILED" because it asserts that WRONG
// credentials are rejected, and that assertion will now fail for real.
// ---------------------------------------------------------------------
export function verifyPassword(plainPassword, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(plainPassword, salt, KEYLEN);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
