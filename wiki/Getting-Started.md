# Getting Started

## Installation

```bash
npm install @fracabu/fastify-api-key
```

## Basic Setup

### 1. Register the plugin

```typescript
import Fastify from 'fastify'
import fastifyApiKey from '@fracabu/fastify-api-key'

const app = Fastify()

await app.register(fastifyApiKey, {
  validate: async (key) => {
    // Your validation logic here
    const apiKey = await db.apiKeys.findByKey(key)

    if (!apiKey) {
      return { valid: false }
    }

    return {
      valid: true,
      scopes: apiKey.scopes,
      metadata: { userId: apiKey.userId }
    }
  }
})
```

### 2. Protect routes

```typescript
// Basic protection
app.get('/api/data', {
  preHandler: app.apiKey()
}, handler)

// With required scopes (ALL must match)
app.delete('/api/users/:id', {
  preHandler: app.apiKey({ scopes: ['admin', 'users:delete'] })
}, handler)

// With any scope (at least ONE must match)
app.get('/api/reports', {
  preHandler: app.apiKey({ anyScope: ['reports:read', 'admin'] })
}, handler)
```

### 3. Access API key info in handlers

```typescript
app.get('/api/me', {
  preHandler: app.apiKey()
}, async (request) => {
  // Access validated key info
  const { scopes, metadata } = request.apiKey

  return {
    scopes,
    userId: metadata?.userId
  }
})
```

## Sending API Keys

By default, the plugin looks for the API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/api/data
```

You can configure multiple extraction sources. See [Configuration](Configuration) for details.

## Generating API Keys

The plugin includes a utility to generate secure API keys:

```typescript
import { generateApiKey } from '@fracabu/fastify-api-key'

// Simple key
const key = generateApiKey()
// => 'ak_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345'

// Custom prefix and length
const customKey = generateApiKey({
  prefix: 'myapp',
  length: 48
})
// => 'myapp_aBcDeFgHiJkLmNoPqRsTuVwXyZ...'
```

## Next Steps

- [Configuration](Configuration) - All available options
- [Examples](Examples) - Real-world usage patterns
- [Security](Security) - Best practices
