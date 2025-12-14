import { describe, it, expect, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, TEST_SCOPES } from './helpers.js';

describe('scopes system', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('required scopes (all must be present)', () => {
    it('should allow access when all required scopes are present', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: TEST_SCOPES.admin,
        }),
      });

      app.get('/admin', { preHandler: app.apiKey({ scopes: ['admin', 'read'] }) }, async () => ({
        access: 'granted',
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'X-API-Key': 'admin-key' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ access: 'granted' });
    });

    it('should deny access when some required scopes are missing', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: TEST_SCOPES.readOnly,
        }),
      });

      app.get('/admin', { preHandler: app.apiKey({ scopes: ['admin', 'read'] }) }, async () => ({
        access: 'granted',
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'X-API-Key': 'readonly-key' },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.code).toBe('INSUFFICIENT_SCOPES');
    });

    it('should deny access when all required scopes are missing', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: [],
        }),
      });

      app.get('/admin', { preHandler: app.apiKey({ scopes: ['admin'] }) }, async () => ({
        access: 'granted',
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'X-API-Key': 'no-scopes-key' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow access when no scopes are required', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: [],
        }),
      });

      app.get('/public', { preHandler: app.apiKey({ scopes: [] }) }, async () => ({
        access: 'granted',
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/public',
        headers: { 'X-API-Key': 'any-key' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('anyScope (at least one must be present)', () => {
    it('should allow access when at least one anyScope is present', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['viewer'],
        }),
      });

      app.get(
        '/reports',
        { preHandler: app.apiKey({ anyScope: ['viewer', 'admin', 'reports:read'] }) },
        async () => ({ access: 'granted' })
      );

      const response = await app.inject({
        method: 'GET',
        url: '/reports',
        headers: { 'X-API-Key': 'viewer-key' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should allow access when multiple anyScopes are present', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['viewer', 'admin'],
        }),
      });

      app.get(
        '/reports',
        { preHandler: app.apiKey({ anyScope: ['viewer', 'admin'] }) },
        async () => ({ access: 'granted' })
      );

      const response = await app.inject({
        method: 'GET',
        url: '/reports',
        headers: { 'X-API-Key': 'multi-scope-key' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny access when no anyScopes are present', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['read', 'write'],
        }),
      });

      app.get(
        '/admin-panel',
        { preHandler: app.apiKey({ anyScope: ['admin', 'superuser'] }) },
        async () => ({ access: 'granted' })
      );

      const response = await app.inject({
        method: 'GET',
        url: '/admin-panel',
        headers: { 'X-API-Key': 'regular-key' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('combined scopes and anyScope', () => {
    it('should require both scopes AND anyScope to pass', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['read', 'write', 'admin'],
        }),
      });

      app.get(
        '/admin-write',
        { preHandler: app.apiKey({ scopes: ['read', 'write'], anyScope: ['admin', 'superuser'] }) },
        async () => ({ access: 'granted' })
      );

      const response = await app.inject({
        method: 'GET',
        url: '/admin-write',
        headers: { 'X-API-Key': 'full-access-key' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny if required scopes missing even if anyScope present', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['admin'], // Has admin but missing read, write
        }),
      });

      app.get(
        '/admin-write',
        { preHandler: app.apiKey({ scopes: ['read', 'write'], anyScope: ['admin'] }) },
        async () => ({ access: 'granted' })
      );

      const response = await app.inject({
        method: 'GET',
        url: '/admin-write',
        headers: { 'X-API-Key': 'admin-only-key' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should deny if anyScope missing even if all required present', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['read', 'write'], // Has read, write but missing admin
        }),
      });

      app.get(
        '/admin-write',
        { preHandler: app.apiKey({ scopes: ['read', 'write'], anyScope: ['admin', 'superuser'] }) },
        async () => ({ access: 'granted' })
      );

      const response = await app.inject({
        method: 'GET',
        url: '/admin-write',
        headers: { 'X-API-Key': 'rw-only-key' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('scope patterns', () => {
    it('should support namespaced scopes', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['users:read', 'users:write', 'posts:read'],
        }),
      });

      app.get('/users', { preHandler: app.apiKey({ scopes: ['users:read'] }) }, async () => ({
        users: [],
      }));

      app.post('/users', { preHandler: app.apiKey({ scopes: ['users:write'] }) }, async () => ({
        created: true,
      }));

      app.delete(
        '/users/:id',
        { preHandler: app.apiKey({ scopes: ['users:delete'] }) },
        async () => ({ deleted: true })
      );

      // Can read users
      const readResponse = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { 'X-API-Key': 'test-key' },
      });
      expect(readResponse.statusCode).toBe(200);

      // Can write users
      const writeResponse = await app.inject({
        method: 'POST',
        url: '/users',
        headers: { 'X-API-Key': 'test-key' },
      });
      expect(writeResponse.statusCode).toBe(200);

      // Cannot delete users (missing users:delete scope)
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: '/users/123',
        headers: { 'X-API-Key': 'test-key' },
      });
      expect(deleteResponse.statusCode).toBe(403);
    });
  });

  describe('error response for insufficient scopes', () => {
    it('should include required and provided scopes in error', async () => {
      app = await createTestApp({
        validate: async () => ({
          valid: true,
          scopes: ['read'],
        }),
      });

      app.get('/admin', { preHandler: app.apiKey({ scopes: ['admin', 'write'] }) }, async () => ({
        access: 'granted',
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: { 'X-API-Key': 'readonly-key' },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.message).toContain('admin');
      expect(body.message).toContain('write');
    });
  });
});
