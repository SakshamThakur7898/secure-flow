// src/utils/validators.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(body) {
  const errors = {};
  const {
    fullName, username, email, password, confirmPassword,
    employeeId, department,
  } = body || {};

  if (!fullName || !fullName.trim()) errors.fullName = 'Full name is required.';
  if (!username || !username.trim()) errors.username = 'Username is required.';
  else if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
    errors.username = 'Username must be 3-30 characters (letters, numbers, ._- only).';
  }

  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (password && confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  if (!employeeId || !employeeId.trim()) errors.employeeId = 'Employee ID is required.';
  else if (!/^[a-zA-Z0-9-]{3,20}$/.test(employeeId)) {
    errors.employeeId = 'Employee ID must be 3-20 characters (letters, numbers, - only).';
  }

  if (!department || !department.trim()) errors.department = 'Department is required.';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateLogin(body) {
  const errors = {};
  if (!body || !body.identifier || !body.identifier.trim()) {
    errors.identifier = 'Email or username is required.';
  }
  if (!body || !body.password) {
    errors.password = 'Password is required.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function passwordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return { score, label: labels[score] };
}

export function validateProfileUpdate(body) {
  const errors = {};
  const { fullName, email, department } = body || {};

  if (!fullName || !fullName.trim()) errors.fullName = 'Full name is required.';
  if (!email || !email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email.';
  if (!department || !department.trim()) errors.department = 'Department is required.';

  return { valid: Object.keys(errors).length === 0, errors };
}

export const ROLES = ['Employee', 'Manager', 'Admin'];
