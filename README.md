# fastify-api-key

[![npm version](https://img.shields.io/npm/v/fastify-api-key.svg)](https://www.npmjs.com/package/fastify-api-key)
[![CI](https://github.com/fracabu/fastify-api-key/actions/workflows/ci.yml/badge.svg)](https://github.com/fracabu/fastify-api-key/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/fracabu/fastify-api-key/branch/main/graph/badge.svg)](https://codecov.io/gh/fracabu/fastify-api-key)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Complete API Key authentication for Fastify with scopes, multiple sources, and TypeScript support.

## Features

- **Fastify v5** support
- **TypeScript-first** with complete type definitions
- **Multiple extraction sources** (header, query, body, cookie)
- **Scopes/permissions system** with `scopes` (all required) and `anyScope` (at least one)
- **Rate limiting** information support
- **Timing-safe** key comparison (prevents timing attacks)
- **Custom error handlers**
- **Validation hooks** for logging/audit
- **ESM and CJS** dual module support

## Installation

```bash
npm install fastify-api-key
```

## Requirements

- Node.js >= 20.0.0
- Fastify >= 5.0.0

## Quick Start

```typescript
import Fastify from 'fastify';
import fastifyApiKey from 'fastify-api-key';

const app = Fastify();

// Register the plugin with a validation function
await app.register(fastifyApiKey, {
  validate: async (key) => {
    // Your validation logic (database lookup, etc.)
    const apiKey = await db.apiKeys.findByKey(key);

    if (!apiKey) {
      return { valid: false };
    }

    return {
      valid: true,
      scopes: apiKey.scopes,
      metadata: { userId: apiKey.userId }
    };
  }
});

// Protected route
app.get('/api/users', {
  preHandler: app.apiKey()
}, async (request) => {
  console.log('Scopes:', request.apiKeyScopes);
  console.log('Metadata:', request.apiKey?.metadata);
  return { users: [] };
});

// Route with required scopes (all must be present)
app.delete('/api/users/:id', {
  preHandler: app.apiKey({ scopes: ['admin', 'users:delete'] })
}, async () => {
  return { deleted: true };
});

// Route with anyScope (at least one must be present)
app.get('/api/reports', {
  preHandler: app.apiKey({ anyScope: ['reports:read', 'admin'] })
}, async () => {
  return { reports: [] };
});

await app.listen({ port: 3000 });
```

## API Reference

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `validate` | `ApiKeyValidator` | **required** | Validation function |
| `sources` | `ApiKeySource[]` | `[{ type: 'header', name: 'X-API-Key' }]` | Key extraction sources |
| `errorHandler` | `ApiKeyErrorHandler` | `undefined` | Custom error handler |
| `decoratorName` | `string` | `'apiKey'` | Request decorator name |
| `allowAnonymous` | `boolean` | `false` | Allow unauthenticated requests |
| `onValidation` | `ApiKeyHook` | `undefined` | Post-validation hook |
| `timingSafe` | `boolean` | `true` | Use timing-safe comparison |

### Validation Function

The `validate` function receives the API key and request, and should return a validation result:

```typescript
interface ApiKeyValidationResult {
  valid: boolean;
  scopes?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}
```

### Guard Options

```typescript
app.apiKey({
  scopes: ['read', 'write'],      // All required
  anyScope: ['admin', 'superuser'], // At least one required
  allowAnonymous: false
})
```

## Examples

### Multiple Sources

Extract API key from multiple locations with priority:

```typescript
await app.register(fastifyApiKey, {
  sources: [
    { type: 'header', name: 'X-API-Key' },
    { type: 'header', name: 'Authorization', prefix: 'ApiKey ' },
    { type: 'query', name: 'api_key' }
  ],
  validate: async (key) => {
    // ...
  }
});
```

### Rate Limiting Information

Return rate limit info from your validator:

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => {
    const keyData = await db.apiKeys.findByKey(key);
    const usage = await rateLimiter.getUsage(key);

    return {
      valid: true,
      scopes: keyData.scopes,
      rateLimit: {
        limit: keyData.rateLimit,
        remaining: keyData.rateLimit - usage.count,
        reset: usage.resetAt
      }
    };
  }
});

// Add rate limit headers
app.addHook('onSend', (request, reply, _payload, done) => {
  if (request.apiKey?.rateLimit) {
    const { limit, remaining, reset } = request.apiKey.rateLimit;
    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', reset);
  }
  done();
});
```

### Custom Error Handler

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => { /* ... */ },
  errorHandler: async (error, request, reply) => {
    request.log.warn({ err: error }, 'API key validation failed');

    await reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### Validation Hook for Audit Logging

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => { /* ... */ },
  onValidation: async (key, result, request) => {
    await auditLog.record({
      timestamp: new Date(),
      ip: request.ip,
      path: request.url,
      method: request.method,
      apiKeyPrefix: key.substring(0, 10) + '...',
      success: result.valid,
      scopes: result.scopes
    });
  }
});
```

### Optional Authentication

```typescript
// Global anonymous access
await app.register(fastifyApiKey, {
  allowAnonymous: true,
  validate: async (key) => { /* ... */ }
});

// Route works with or without API key
app.get('/api/posts', {
  preHandler: app.apiKey()
}, async (request) => {
  if (request.apiKey) {
    // Authenticated - show all posts
    return { posts: await getAllPosts() };
  }
  // Anonymous - show only public posts
  return { posts: await getPublicPosts() };
});

// This route still requires authentication
app.post('/api/posts', {
  preHandler: app.apiKey({ allowAnonymous: false })
}, async () => {
  return { created: true };
});
```

## Exported Utilities

The package also exports utility functions:

```typescript
import {
  generateApiKey,
  timingSafeCompare,
  hasAllScopes,
  hasAnyScope
} from 'fastify-api-key';

// Generate a secure API key
const key = generateApiKey({ prefix: 'myapp', length: 32 });
// => 'myapp_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345'

// Timing-safe comparison
const isValid = timingSafeCompare(providedKey, storedKey);

// Scope helpers
hasAllScopes(['read', 'write', 'admin'], ['read', 'write']); // true
hasAnyScope(['read'], ['admin', 'read']); // true
```

## Error Classes

```typescript
import {
  ApiKeyError,
  MissingApiKeyError,
  InvalidApiKeyError,
  InsufficientScopesError,
  RateLimitExceededError
} from 'fastify-api-key';

// All errors have: code, message, statusCode, toJSON()
```

## TypeScript Support

The plugin provides full TypeScript support with Fastify module augmentation:

```typescript
import type {
  FastifyApiKeyOptions,
  ApiKeySource,
  ApiKeyValidationResult,
  ApiKeyValidator,
  ApiKeyErrorHandler,
  ApiKeyHook,
  ApiKeyGuardOptions,
  ApiKeyData
} from 'fastify-api-key';

// request.apiKey and request.apiKeyScopes are properly typed
app.get('/test', { preHandler: app.apiKey() }, async (request) => {
  const scopes = request.apiKeyScopes; // string[] | undefined
  const metadata = request.apiKey?.metadata; // Record<string, unknown>
});
```

## License

MIT
