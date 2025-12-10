import fp from 'fastify-plugin';
import { fastifyApiKeyPlugin } from './plugin.js';
import type { FastifyApiKeyOptions } from './types.js';

// Re-export all types
export type {
  FastifyApiKeyOptions,
  ApiKeySource,
  ApiKeyValidationResult,
  ApiKeyValidator,
  ApiKeyErrorHandler,
  ApiKeyHook,
  ApiKeyGuardOptions,
  ApiKeyData,
} from './types.js';

// Re-export all errors
export {
  ApiKeyError,
  MissingApiKeyError,
  InvalidApiKeyError,
  InsufficientScopesError,
  RateLimitExceededError,
} from './errors.js';

// Re-export utilities
export { timingSafeCompare, hasAllScopes, hasAnyScope, generateApiKey } from './utils.js';

// Default export: wrapped plugin
export default fp<FastifyApiKeyOptions>(fastifyApiKeyPlugin, {
  fastify: '5.x',
  name: 'fastify-api-key',
});

// Named export for explicit imports
export const fastifyApiKey = fp<FastifyApiKeyOptions>(fastifyApiKeyPlugin, {
  fastify: '5.x',
  name: 'fastify-api-key',
});
