import { describe, it, expect } from 'vitest';
import { extractApiKey } from '../src/extractors.js';
import type { FastifyRequest } from 'fastify';

describe('extractApiKey', () => {
  const createMockRequest = (overrides: Partial<FastifyRequest> = {}): FastifyRequest =>
    ({
      headers: {},
      query: {},
      body: null,
      ...overrides,
    }) as FastifyRequest;

  describe('header extraction', () => {
    it('should extract from X-API-Key header', () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'test-key-123' },
      });

      const key = extractApiKey(request, [{ type: 'header', name: 'X-API-Key' }]);
      expect(key).toBe('test-key-123');
    });

    it('should extract from custom header', () => {
      const request = createMockRequest({
        headers: { 'x-custom-auth': 'custom-key' },
      });

      const key = extractApiKey(request, [{ type: 'header', name: 'X-Custom-Auth' }]);
      expect(key).toBe('custom-key');
    });

    it('should handle array header values', () => {
      const request = createMockRequest({
        headers: { 'x-api-key': ['first-key', 'second-key'] },
      });

      const key = extractApiKey(request, [{ type: 'header', name: 'X-API-Key' }]);
      expect(key).toBe('first-key');
    });

    it('should remove prefix from header', () => {
      const request = createMockRequest({
        headers: { authorization: 'ApiKey my-secret-key' },
      });

      const key = extractApiKey(request, [
        { type: 'header', name: 'Authorization', prefix: 'ApiKey ' },
      ]);
      expect(key).toBe('my-secret-key');
    });

    it('should remove Bearer prefix', () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer token123' },
      });

      const key = extractApiKey(request, [
        { type: 'header', name: 'Authorization', prefix: 'Bearer ' },
      ]);
      expect(key).toBe('token123');
    });

    it('should trim whitespace', () => {
      const request = createMockRequest({
        headers: { 'x-api-key': '  spaced-key  ' },
      });

      const key = extractApiKey(request, [{ type: 'header', name: 'X-API-Key' }]);
      expect(key).toBe('spaced-key');
    });
  });

  describe('query extraction', () => {
    it('should extract from query string', () => {
      const request = createMockRequest({
        query: { api_key: 'query-key' },
      });

      const key = extractApiKey(request, [{ type: 'query', name: 'api_key' }]);
      expect(key).toBe('query-key');
    });

    it('should extract from custom query param', () => {
      const request = createMockRequest({
        query: { token: 'query-token' },
      });

      const key = extractApiKey(request, [{ type: 'query', name: 'token' }]);
      expect(key).toBe('query-token');
    });

    it('should ignore non-string query values', () => {
      const request = createMockRequest({
        query: { api_key: 123 },
      });

      const key = extractApiKey(request, [{ type: 'query', name: 'api_key' }]);
      expect(key).toBeNull();
    });
  });

  describe('body extraction', () => {
    it('should extract from body', () => {
      const request = createMockRequest({
        body: { apiKey: 'body-key' },
      });

      const key = extractApiKey(request, [{ type: 'body', name: 'apiKey' }]);
      expect(key).toBe('body-key');
    });

    it('should handle null body', () => {
      const request = createMockRequest({
        body: null,
      });

      const key = extractApiKey(request, [{ type: 'body', name: 'apiKey' }]);
      expect(key).toBeNull();
    });

    it('should handle undefined body', () => {
      const request = createMockRequest({
        body: undefined,
      });

      const key = extractApiKey(request, [{ type: 'body', name: 'apiKey' }]);
      expect(key).toBeNull();
    });

    it('should ignore non-string body values', () => {
      const request = createMockRequest({
        body: { apiKey: { nested: 'value' } },
      });

      const key = extractApiKey(request, [{ type: 'body', name: 'apiKey' }]);
      expect(key).toBeNull();
    });
  });

  describe('cookie extraction', () => {
    it('should extract from cookie', () => {
      const request = createMockRequest() as FastifyRequest & { cookies: Record<string, string> };
      (request as any).cookies = { api_key: 'cookie-key' };

      const key = extractApiKey(request, [{ type: 'cookie', name: 'api_key' }]);
      expect(key).toBe('cookie-key');
    });

    it('should handle missing cookies object', () => {
      const request = createMockRequest();

      const key = extractApiKey(request, [{ type: 'cookie', name: 'api_key' }]);
      expect(key).toBeNull();
    });
  });

  describe('multiple sources', () => {
    it('should try sources in order', () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'header-key' },
        query: { api_key: 'query-key' },
      });

      const key = extractApiKey(request, [
        { type: 'header', name: 'X-API-Key' },
        { type: 'query', name: 'api_key' },
      ]);
      expect(key).toBe('header-key');
    });

    it('should fallback to next source when first is missing', () => {
      const request = createMockRequest({
        query: { api_key: 'query-key' },
      });

      const key = extractApiKey(request, [
        { type: 'header', name: 'X-API-Key' },
        { type: 'query', name: 'api_key' },
      ]);
      expect(key).toBe('query-key');
    });

    it('should return null when no source has the key', () => {
      const request = createMockRequest();

      const key = extractApiKey(request, [
        { type: 'header', name: 'X-API-Key' },
        { type: 'query', name: 'api_key' },
      ]);
      expect(key).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for empty sources array', () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'test-key' },
      });

      const key = extractApiKey(request, []);
      expect(key).toBeNull();
    });

    it('should not remove prefix if it does not match', () => {
      const request = createMockRequest({
        headers: { authorization: 'Token my-key' },
      });

      const key = extractApiKey(request, [
        { type: 'header', name: 'Authorization', prefix: 'Bearer ' },
      ]);
      expect(key).toBe('Token my-key');
    });
  });
});
