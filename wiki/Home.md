# @fracabu/fastify-api-key

Complete API Key authentication plugin for Fastify with scopes, multiple sources, and TypeScript support.

## Quick Links

- [Getting Started](Getting-Started) - Installation and basic usage
- [Configuration](Configuration) - All configuration options
- [Examples](Examples) - Real-world usage examples
- [Security](Security) - Supply chain security and best practices

## Features

| Feature | Description |
|---------|-------------|
| Multi-source extraction | Header, query, body, cookie |
| Scopes/permissions | Fine-grained access control |
| Timing-safe comparison | Prevents timing attacks |
| TypeScript-first | Complete type definitions |
| Dual module support | ESM and CommonJS |
| Fastify v5 | Full compatibility |

## Requirements

- Node.js >= 20.0.0
- Fastify >= 5.0.0

## Installation

```bash
npm install @fracabu/fastify-api-key
```

## Basic Example

```typescript
import Fastify from 'fastify'
import fastifyApiKey from '@fracabu/fastify-api-key'

const app = Fastify()

await app.register(fastifyApiKey, {
  validate: async (key) => {
    if (key === 'my-secret-key') {
      return { valid: true, scopes: ['read', 'write'] }
    }
    return { valid: false }
  }
})

app.get('/protected', {
  preHandler: app.apiKey()
}, async () => {
  return { message: 'Access granted!' }
})

await app.listen({ port: 3000 })
```

## Links

- [npm](https://www.npmjs.com/package/@fracabu/fastify-api-key)
- [GitHub](https://github.com/fracabu/fastify-api-key)
- [Issues](https://github.com/fracabu/fastify-api-key/issues)
