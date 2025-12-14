import { describe, it, expect } from 'vitest';
import { validateScopes } from '../src/validators.js';

describe('validateScopes', () => {
  describe('required scopes (all must be present)', () => {
    it('should return valid when all required scopes are present', () => {
      const result = validateScopes(['read', 'write', 'admin'], ['read', 'write']);
      expect(result.valid).toBe(true);
      expect(result.missing).toBeUndefined();
    });

    it('should return invalid when some required scopes are missing', () => {
      const result = validateScopes(['read'], ['read', 'write', 'admin']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['write', 'admin']);
    });

    it('should return invalid when all required scopes are missing', () => {
      const result = validateScopes([], ['read', 'write']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['read', 'write']);
    });

    it('should return valid when required scopes is empty', () => {
      const result = validateScopes(['read'], []);
      expect(result.valid).toBe(true);
    });

    it('should return valid when required scopes is undefined', () => {
      const result = validateScopes(['read'], undefined);
      expect(result.valid).toBe(true);
    });
  });

  describe('any scopes (at least one must be present)', () => {
    it('should return valid when at least one anyScope is present', () => {
      const result = validateScopes(['viewer'], undefined, ['viewer', 'admin']);
      expect(result.valid).toBe(true);
    });

    it('should return valid when multiple anyScopes are present', () => {
      const result = validateScopes(['viewer', 'admin'], undefined, ['viewer', 'admin']);
      expect(result.valid).toBe(true);
    });

    it('should return invalid when no anyScopes are present', () => {
      const result = validateScopes(['read'], undefined, ['admin', 'superuser']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['admin', 'superuser']);
    });

    it('should return valid when anyScopes is empty', () => {
      const result = validateScopes(['read'], undefined, []);
      expect(result.valid).toBe(true);
    });

    it('should return valid when anyScopes is undefined', () => {
      const result = validateScopes(['read'], undefined, undefined);
      expect(result.valid).toBe(true);
    });
  });

  describe('combined scopes and anyScope', () => {
    it('should require both scopes AND anyScope to pass', () => {
      // Has all required scopes and at least one anyScope
      const result = validateScopes(
        ['read', 'write', 'admin'],
        ['read', 'write'],
        ['admin', 'super']
      );
      expect(result.valid).toBe(true);
    });

    it('should fail if required scopes missing even if anyScope present', () => {
      const result = validateScopes(['admin'], ['read', 'write'], ['admin', 'super']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['read', 'write']);
    });

    it('should fail if anyScope missing even if all required present', () => {
      const result = validateScopes(['read', 'write'], ['read', 'write'], ['admin', 'super']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['admin', 'super']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty provided scopes', () => {
      const result = validateScopes([], ['admin']);
      expect(result.valid).toBe(false);
    });

    it('should handle all empty arrays', () => {
      const result = validateScopes([], [], []);
      expect(result.valid).toBe(true);
    });

    it('should handle duplicate scopes in required', () => {
      const result = validateScopes(['admin'], ['admin', 'admin']);
      expect(result.valid).toBe(true);
    });

    it('should handle duplicate scopes in provided', () => {
      const result = validateScopes(['admin', 'admin'], ['admin']);
      expect(result.valid).toBe(true);
    });
  });
});
