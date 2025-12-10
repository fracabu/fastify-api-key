import { hasAllScopes, hasAnyScope } from './utils.js';

export interface ScopeValidationResult {
  valid: boolean;
  missing?: string[];
}

/**
 * Validate scopes against requirements
 */
export function validateScopes(
  providedScopes: string[],
  requiredScopes?: string[],
  anyScopes?: string[]
): ScopeValidationResult {
  // Check "all required" scopes
  if (requiredScopes && requiredScopes.length > 0) {
    if (!hasAllScopes(providedScopes, requiredScopes)) {
      const missing = requiredScopes.filter((s) => !providedScopes.includes(s));
      return { valid: false, missing };
    }
  }

  // Check "any of" scopes
  if (anyScopes && anyScopes.length > 0) {
    if (!hasAnyScope(providedScopes, anyScopes)) {
      return { valid: false, missing: anyScopes };
    }
  }

  return { valid: true };
}
