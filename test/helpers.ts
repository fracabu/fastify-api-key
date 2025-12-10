import Fastify, { FastifyInstance } from 'fastify';
import fastifyApiKey, { FastifyApiKeyOptions } from '../src/index.js';

export async function createTestApp(options: FastifyApiKeyOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(fastifyApiKey, options);
  return app;
}

export const TEST_KEYS = {
  valid: 'sk_test_valid123',
  admin: 'sk_test_admin456',
  readOnly: 'sk_test_readonly789',
  expired: 'sk_test_expired000',
  invalid: 'sk_test_invalid999',
};

export const TEST_SCOPES = {
  admin: ['admin', 'read', 'write', 'delete'],
  readWrite: ['read', 'write'],
  readOnly: ['read'],
  none: [],
};
