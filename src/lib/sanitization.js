/**
 * Server-side input sanitization module for XSS prevention and payload normalization.
 */

/**
 * Strips HTML/script tags and trims whitespace.
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return input;
  let cleaned = input.trim();
  // Strip <script>...</script> tags and content
  cleaned = cleaned.replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '');
  // Strip HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  return cleaned;
}

/**
 * Normalizes email address: trims whitespace and converts to lowercase.
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Recursively sanitizes object properties:
 * - Trims strings
 * - Strips HTML/script tags from text fields
 * - Converts email fields to lowercase
 * - Leaves password fields untouched (only trims leading/trailing if requested, but preserves symbols)
 */
export function sanitizeInput(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeText(data);
  if (Array.isArray(data)) return data.map(sanitizeInput);
  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'email') {
          result[key] = sanitizeEmail(value);
        } else if (lowerKey.includes('password')) {
          result[key] = value; // Passwords preserve exact characters
        } else {
          result[key] = sanitizeText(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeInput(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return data;
}

/**
 * Helper to parse a request body using Zod schema, returning a structured error list if invalid.
 */
export function parseAndValidate(schema, body) {
  const sanitized = sanitizeInput(body);
  const result = schema.safeParse(sanitized);

  if (!result.success) {
    const issueMap = {};
    const formattedErrors = result.error.issues.map((issue) => {
      const field = issue.path.join('.') || 'root';
      if (!issueMap[field]) issueMap[field] = issue.message;
      return { field, message: issue.message };
    });

    return {
      success: false,
      sanitizedData: null,
      errors: formattedErrors,
      firstError: formattedErrors[0]?.message || 'Validation failed',
      fieldErrors: issueMap,
    };
  }

  return {
    success: true,
    sanitizedData: result.data,
    errors: [],
    firstError: null,
    fieldErrors: {},
  };
}
