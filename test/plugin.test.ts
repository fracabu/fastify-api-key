import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, TEST_KEYS, TEST_SCOPES } from './helpers.js';

describe('fastify-api-key plugin', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('authentication', () => {
    it('should authenticate with valid API key', async () => {
      app = await createTestApp({
        validate: async (key) => ({
          valid: key === TEST_KEYS.valid,
          scopes: TEST_SCOPES.readOnly,
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': TEST_KEYS.valid },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
    });

    it('should reject missing API key with 401', async () => {
      app = await createTestApp({
        validate: async () => ({ valid: true }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe('MISSING_API_KEY');
    });

    it('should reject invalid API key with 401', async () => {
      app = await createTestApp({
        validate: async (key) => ({
          valid: key === TEST_KEYS.valid,
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': TEST_KEYS.invalid },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe('INVALID_API_KEY');
    });

    it('should pass custom error message from validator', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: false,
          errorMessage: 'Key has expired',
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'any-key' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toBe('Key has expired');
    });
  });

  describe('request decoration', () => {
    it('should populate request.apiKey with validation result', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['read', 'write'],
          metadata: { userId: '123', plan: 'pro' },
          rateLimit: { limit: 1000, remaining: 999, reset: 1234567890 },
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        scopes: request.apiKey?.scopes,
        metadata: request.apiKey?.metadata,
        rateLimit: request.apiKey?.rateLimit,
        apiKeyScopes: request.apiKeyScopes,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'test-key' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.scopes).toEqual(['read', 'write']);
      expect(body.metadata).toEqual({ userId: '123', plan: 'pro' });
      expect(body.rateLimit).toEqual({ limit: 1000, remaining: 999, reset: 1234567890 });
      expect(body.apiKeyScopes).toEqual(['read', 'write']);
    });

    it('should redact API key by default (timingSafe=true)', async () => {
      app = await createTestApp({
        validate: async () => ({ valid: true }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        key: request.apiKey?.key,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'secret-key' },
      });

      expect(response.json().key).toBe('[REDACTED]');
    });

    it('should expose API key when timingSafe=false', async () => {
      app = await createTestApp({
        validate: async () => ({ valid: true }),
        timingSafe: false,
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        key: request.apiKey?.key,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'secret-key' },
      });

      expect(response.json().key).toBe('secret-key');
    });
  });

  describe('anonymous access', () => {
    it('should allow anonymous when enabled globally', async () => {
      app = await createTestApp({
        allowAnonymous: true,
        validate: async () => ({ valid: true }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        authenticated: !!request.apiKey,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ authenticated: false });
    });

    it('should allow anonymous when enabled per-route', async () => {
      app = await createTestApp({
        allowAnonymous: false,
        validate: async () => ({ valid: true }),
      });

      app.get('/test', { preHandler: app.apiKey({ allowAnonymous: true }) }, async (request) => ({
        authenticated: !!request.apiKey,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ authenticated: false });
    });

    it('should deny anonymous when disabled per-route even if enabled globally', async () => {
      app = await createTestApp({
        allowAnonymous: true,
        validate: async () => ({ valid: true }),
      });

      app.get('/test', { preHandler: app.apiKey({ allowAnonymous: false }) }, async () => ({
        success: true,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should authenticate when key provided even if anonymous allowed', async () => {
      app = await createTestApp({
        allowAnonymous: true,
        validate: async () => ({
          valid: true,
          scopes: ['read'],
          metadata: { user: 'test' },
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        authenticated: !!request.apiKey,
        scopes: request.apiKey?.scopes,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'valid-key' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        authenticated: true,
        scopes: ['read'],
      });
    });

    it('should allow anonymous with invalid key when allowAnonymous is true', async () => {
      app = await createTestApp({
        allowAnonymous: true,
        validate: async () => ({ valid: false }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        authenticated: !!request.apiKey,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'invalid-key' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ authenticated: false });
    });
  });

  describe('custom sources', () => {
    it('should extract from query string', async () => {
      app = await createTestApp({
        sources: [{ type: 'query', name: 'api_key' }],
        validate: async (key) => ({
          valid: key === 'query-key',
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test?api_key=query-key',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should extract from Authorization header with prefix', async () => {
      app = await createTestApp({
        sources: [{ type: 'header', name: 'Authorization', prefix: 'ApiKey ' }],
        validate: async (key) => ({
          valid: key === 'my-secret',
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { Authorization: 'ApiKey my-secret' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should try multiple sources in order', async () => {
      app = await createTestApp({
        sources: [
          { type: 'header', name: 'X-API-Key' },
          { type: 'query', name: 'api_key' },
        ],
        validate: async (key) => ({
          valid: true,
          metadata: { key },
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        key: request.apiKey?.metadata.key,
      }));

      // Header takes priority
      const response1 = await app.inject({
        method: 'GET',
        url: '/test?api_key=query-key',
        headers: { 'X-API-Key': 'header-key' },
      });
      expect(response1.json().key).toBe('header-key');

      // Falls back to query when header missing
      const response2 = await app.inject({
        method: 'GET',
        url: '/test?api_key=query-key',
      });
      expect(response2.json().key).toBe('query-key');
    });
  });

  describe('custom error handler', () => {
    it('should use custom error handler', async () => {
      app = await createTestApp({
        validate: async () => ({ valid: false }),
        errorHandler: async (error, _request, reply) => {
          await reply.status(error.statusCode).send({
            customError: true,
            code: error.code,
            message: error.message,
          });
        },
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'invalid' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        customError: true,
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
      });
    });
  });

  describe('validation hook', () => {
    it('should call onValidation hook after validation', async () => {
      const validations: { key: string; valid: boolean }[] = [];

      app = await createTestApp({
        validate: async (key) => ({
          valid: key === 'valid-key',
        }),
        onValidation: async (key, result) => {
          validations.push({ key, valid: result.valid });
        },
      });

      app.get('/test', { preHandler: app.apiKey() }, async () => ({ success: true }));

      await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'valid-key' },
      });

      await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'invalid-key' },
      });

      expect(validations).toHaveLength(2);
      expect(validations[0]).toEqual({ key: 'valid-key', valid: true });
      expect(validations[1]).toEqual({ key: 'invalid-key', valid: false });
    });
  });

  describe('requireApiKey alias', () => {
    it('should work as alias for apiKey with scopes', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['admin'],
        }),
      });

      app.get('/test', { preHandler: app.requireApiKey(['admin']) }, async () => ({
        success: true,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'test-key' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject when scopes are insufficient', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['read'],
        }),
      });

      app.get('/test', { preHandler: app.requireApiKey(['admin']) }, async () => ({
        success: true,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'test-key' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('custom decorator name', () => {
    it('should use custom decorator name', async () => {
      app = await createTestApp({
        decoratorName: 'auth',
        validate: async () => ({
          valid: true,
          scopes: ['read'],
          metadata: { custom: true },
        }),
      });

      app.get('/test', { preHandler: app.apiKey() }, async (request) => ({
        hasAuth: !!(request as any).auth,
        scopes: (request as any).auth?.scopes,
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'X-API-Key': 'test-key' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        hasAuth: true,
        scopes: ['read'],
      });
    });
  });
});
