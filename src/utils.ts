import { timingSafeEqual, randomBytes } from 'node:crypto';

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Compare anyway to prevent length-based timing leak
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Check if all required scopes are present
 */
export function hasAllScopes(provided: string[], required: string[]): boolean {
  return required.every((scope) => provided.includes(scope));
}

/**
 * Check if at least one required scope is present
 */
export function hasAnyScope(provided: string[], required: string[]): boolean {
  return required.some((scope) => provided.includes(scope));
}

/**
 * Generate a cryptographically secure API key
 */
export function generateApiKey(options: { prefix?: string; length?: number } = {}): string {
  const { prefix = '', length = 32 } = options;
  const bytes = randomBytes(Math.ceil((length * 3) / 4));
  const key = bytes.toString('base64url').slice(0, length);
  return prefix ? `${prefix}_${key}` : key;
}
