/**
 * Client-side input keystroke restriction and validation helpers.
 */

// Keys that are always allowed for text navigation/editing
const CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/**
 * KeyDown handler to restrict input to numeric digits only (0-9).
 * Shows an inline warning if a non-digit key is blocked.
 */
export function handleNumericKeyDown(e, onBlocked) {
  if (CONTROL_KEYS.has(e.key) || e.ctrlKey || e.metaKey) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    if (typeof onBlocked === 'function') {
      onBlocked('Only numbers are allowed');
    }
  }
}

/**
 * KeyDown handler to restrict input to letters and spaces only.
 */
export function handleAlphaKeyDown(e, onBlocked) {
  if (CONTROL_KEYS.has(e.key) || e.ctrlKey || e.metaKey) {
    return;
  }
  if (!/^[a-zA-Z\s]$/.test(e.key)) {
    e.preventDefault();
    if (typeof onBlocked === 'function') {
      onBlocked('Only letters are allowed');
    }
  }
}

/**
 * Evaluates live password strength rules as specified in Task 1.
 */
export function checkPasswordRules(password = '', currentPassword = '') {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const notSameAsCurrent = !currentPassword || password !== currentPassword;

  const allPassed = minLength && hasUpper && hasLower && hasNumber && hasSpecial && notSameAsCurrent;

  return {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    notSameAsCurrent,
    allPassed,
    rules: [
      { key: 'minLength', label: 'Minimum 8 characters', passed: minLength },
      { key: 'hasUpper', label: 'At least 1 uppercase letter (A-Z)', passed: hasUpper },
      { key: 'hasLower', label: 'At least 1 lowercase letter (a-z)', passed: hasLower },
      { key: 'hasNumber', label: 'At least 1 number (0-9)', passed: hasNumber },
      { key: 'hasSpecial', label: 'At least 1 special character (!@#$%^&*)', passed: hasSpecial },
      { key: 'notSameAsCurrent', label: 'Must NOT be the same as Current Password', passed: notSameAsCurrent },
    ],
  };
}

/**
 * Validates email format.
 */
export function validateEmailFormat(email = '') {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Must be a valid email address (e.g. name@example.com)';
  }
  return '';
}

/**
 * Validates phone number (10 digits).
 */
export function validatePhoneFormat(phone = '') {
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return 'Phone number is required';
  if (digitsOnly.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }
  return '';
}

/**
 * Validates pincode (6 digits).
 */
export function validatePincodeFormat(pincode = '') {
  const digitsOnly = pincode.replace(/\D/g, '');
  if (!digitsOnly) return 'Pincode is required';
  if (digitsOnly.length !== 6) {
    return 'Must be exactly 6 digits';
  }
  return '';
}
