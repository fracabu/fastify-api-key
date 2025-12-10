import { describe, it, expect } from 'vitest';
import { timingSafeCompare, hasAllScopes, hasAnyScope, generateApiKey } from '../src/utils.js';

describe('timingSafeCompare', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeCompare('test', 'test')).toBe(true);
    expect(timingSafeCompare('api_key_123', 'api_key_123')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeCompare('test', 'test2')).toBe(false);
    expect(timingSafeCompare('api_key_123', 'api_key_456')).toBe(false);
  });

  it('should return false for different length strings', () => {
    expect(timingSafeCompare('short', 'longstring')).toBe(false);
    expect(timingSafeCompare('a', 'ab')).toBe(false);
  });

  it('should return false for non-string inputs', () => {
    expect(timingSafeCompare(null as any, 'test')).toBe(false);
    expect(timingSafeCompare('test', undefined as any)).toBe(false);
    expect(timingSafeCompare(123 as any, 123 as any)).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(timingSafeCompare('', '')).toBe(true);
    expect(timingSafeCompare('', 'a')).toBe(false);
  });
});

describe('hasAllScopes', () => {
  it('should return true when all required scopes are present', () => {
    expect(hasAllScopes(['read', 'write', 'admin'], ['read', 'write'])).toBe(true);
    expect(hasAllScopes(['admin'], ['admin'])).toBe(true);
  });

  it('should return false when some required scopes are missing', () => {
    expect(hasAllScopes(['read'], ['read', 'write'])).toBe(false);
    expect(hasAllScopes([], ['admin'])).toBe(false);
  });

  it('should return true for empty required scopes', () => {
    expect(hasAllScopes(['read'], [])).toBe(true);
    expect(hasAllScopes([], [])).toBe(true);
  });
});

describe('hasAnyScope', () => {
  it('should return true when at least one required scope is present', () => {
    expect(hasAnyScope(['read'], ['read', 'write'])).toBe(true);
    expect(hasAnyScope(['admin', 'read'], ['write', 'admin'])).toBe(true);
  });

  it('should return false when no required scopes are present', () => {
    expect(hasAnyScope(['read'], ['write', 'admin'])).toBe(false);
    expect(hasAnyScope([], ['admin'])).toBe(false);
  });

  it('should return false for empty required scopes', () => {
    expect(hasAnyScope(['read'], [])).toBe(false);
  });
});

describe('generateApiKey', () => {
  it('should generate a key with default length', () => {
    const key = generateApiKey();
    expect(key.length).toBe(32);
  });

  it('should generate a key with custom length', () => {
    const key = generateApiKey({ length: 16 });
    expect(key.length).toBe(16);
  });

  it('should generate a key with prefix', () => {
    const key = generateApiKey({ prefix: 'sk_live' });
    expect(key.startsWith('sk_live_')).toBe(true);
  });

  it('should generate a key with prefix and custom length', () => {
    const key = generateApiKey({ prefix: 'pk_test', length: 24 });
    expect(key.startsWith('pk_test_')).toBe(true);
    expect(key.length).toBe('pk_test_'.length + 24);
  });

  it('should generate unique keys', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey());
    }
    expect(keys.size).toBe(100);
  });

  it('should only contain URL-safe characters', () => {
    const key = generateApiKey({ length: 100 });
    expect(/^[A-Za-z0-9_-]+$/.test(key)).toBe(true);
  });
});
