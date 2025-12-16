# Examples

## Basic Authentication

Simple static key validation:

```typescript
import Fastify from 'fastify'
import fastifyApiKey from '@fracabu/fastify-api-key'

const app = Fastify()

const VALID_KEYS = ['key1', 'key2', 'key3']

await app.register(fastifyApiKey, {
  validate: async (key) => ({
    valid: VALID_KEYS.includes(key)
  })
})

app.get('/api/data', {
  preHandler: app.apiKey()
}, async () => {
  return { data: 'secret' }
})
```

---

## Database Validation

With PostgreSQL/MySQL:

```typescript
import { createHash } from 'crypto'

await app.register(fastifyApiKey, {
  validate: async (key) => {
    const hash = createHash('sha256').update(key).digest('hex')

    const apiKey = await db.query(
      'SELECT * FROM api_keys WHERE key_hash = $1 AND revoked = false',
      [hash]
    )

    if (!apiKey) return { valid: false }

    return {
      valid: true,
      scopes: apiKey.scopes,
      metadata: {
        userId: apiKey.user_id,
        plan: apiKey.plan
      }
    }
  }
})
```

---

## Multi-Tenant API

Different keys for different customers:

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => {
    const tenant = await db.tenants.findByApiKey(key)

    if (!tenant || !tenant.active) {
      return { valid: false }
    }

    return {
      valid: true,
      scopes: tenant.permissions,
      metadata: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        plan: tenant.plan
      }
    }
  }
})

// Access tenant info in routes
app.get('/api/resources', {
  preHandler: app.apiKey()
}, async (request) => {
  const { tenantId } = request.apiKey.metadata

  return await db.resources.findByTenant(tenantId)
})
```

---

## Role-Based Access Control

Using scopes for permissions:

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => {
    const apiKey = await db.apiKeys.findByKey(key)
    if (!apiKey) return { valid: false }

    const user = await db.users.findById(apiKey.userId)

    return {
      valid: true,
      scopes: user.roles.flatMap(role => role.permissions),
      metadata: { userId: user.id }
    }
  }
})

// Public read endpoint
app.get('/api/posts', {
  preHandler: app.apiKey({ anyScope: ['posts:read', 'admin'] })
}, handler)

// Admin-only endpoint
app.delete('/api/posts/:id', {
  preHandler: app.apiKey({ scopes: ['admin'] })
}, handler)

// Multiple scopes required
app.post('/api/posts/:id/publish', {
  preHandler: app.apiKey({ scopes: ['posts:write', 'posts:publish'] })
}, handler)
```

---

## Rate Limiting Integration

With @fastify/rate-limit:

```typescript
import fastifyRateLimit from '@fastify/rate-limit'

await app.register(fastifyApiKey, {
  validate: async (key) => {
    const apiKey = await db.apiKeys.findByKey(key)
    if (!apiKey) return { valid: false }

    const usage = await redis.get(`ratelimit:${key}`)

    return {
      valid: true,
      rateLimit: {
        limit: apiKey.rateLimit,
        remaining: apiKey.rateLimit - (parseInt(usage) || 0),
        reset: getNextHourTimestamp()
      }
    }
  }
})

// Use rate limit info
app.addHook('onSend', async (request, reply) => {
  if (request.apiKey?.rateLimit) {
    const { limit, remaining, reset } = request.apiKey.rateLimit
    reply.header('X-RateLimit-Limit', limit)
    reply.header('X-RateLimit-Remaining', remaining)
    reply.header('X-RateLimit-Reset', reset)
  }
})
```

---

## Authorization Header

Using `Authorization: Bearer <key>`:

```typescript
await app.register(fastifyApiKey, {
  extractFrom: ['header'],
  header: 'Authorization',
  prefix: 'Bearer ',  // Strip "Bearer " prefix
  validate: async (key) => {
    // key is now without "Bearer " prefix
    return { valid: key === 'my-api-key' }
  }
})
```

```bash
curl -H "Authorization: Bearer my-api-key" http://localhost:3000/api/data
```

---

## Multiple Extraction Sources

Check header first, then query string:

```typescript
await app.register(fastifyApiKey, {
  extractFrom: ['header', 'query'],
  header: 'x-api-key',
  query: 'api_key',
  validate: async (key) => {
    return { valid: await isValidKey(key) }
  }
})
```

```bash
# Both work:
curl -H "x-api-key: abc123" http://localhost:3000/api/data
curl "http://localhost:3000/api/data?api_key=abc123"
```

---

## Anonymous Access

Allow some routes without API key:

```typescript
await app.register(fastifyApiKey, {
  allowAnonymous: true,
  validate: async (key) => {
    return { valid: await isValidKey(key) }
  }
})

app.get('/api/public', {
  preHandler: app.apiKey()
}, async (request) => {
  if (request.apiKey) {
    // Authenticated request
    return { data: 'full data', user: request.apiKey.metadata }
  }
  // Anonymous request
  return { data: 'limited data' }
})
```

---

## Custom Error Responses

RFC 7807 Problem Details:

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => { ... },
  onError: (error, request, reply) => {
    reply.code(401).send({
      type: 'https://api.example.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: error.message,
      instance: request.url
    })
  }
})
```

---

## Audit Logging

Log all API key usage:

```typescript
await app.register(fastifyApiKey, {
  validate: async (key) => { ... },
  onValidation: async (result, request) => {
    await db.auditLogs.create({
      timestamp: new Date(),
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      path: request.url,
      valid: result.valid,
      scopes: result.scopes,
      metadata: result.metadata
    })
  }
})
```
