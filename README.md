<h1 align="center">@fracabu/fastify-api-key</h1>
<h3 align="center">Complete API Key authentication for Fastify</h3>

<p align="center">
  <em>Scopes, multiple sources, and TypeScript support</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fracabu/fastify-api-key"><img src="https://img.shields.io/npm/v/@fracabu/fastify-api-key.svg" alt="npm version" /></a>
  <img src="https://github.com/fracabu/fastify-api-key/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify" alt="Fastify" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg" alt="TypeScript" />
</p>

<p align="center">
  :gb: <a href="#english">English</a> | :it: <a href="#italiano">Italiano</a>
</p>

---

## Overview

<!-- ![fastify-api-key Overview](assets/apikey-overview.png) -->

---

<a name="english"></a>
## :gb: English

### Features

- **Fastify v5** support
- **TypeScript-first** with complete type definitions
- **Multiple extraction sources** (header, query, body, cookie)
- **Scopes/permissions system**
- **Rate limiting** information support
- **Timing-safe** key comparison (prevents timing attacks)
- **Custom error handlers**
- **ESM and CJS** dual module support

### Install

```bash
npm install @fracabu/fastify-api-key
```

### Quick Start

```typescript
import Fastify from 'fastify'
import fastifyApiKey from '@fracabu/fastify-api-key'

const app = Fastify()

await app.register(fastifyApiKey, {
  validate: async (key) => {
    const apiKey = await db.apiKeys.findByKey(key)
    if (!apiKey) return { valid: false }
    return { valid: true, scopes: apiKey.scopes }
  }
})

// Protected route
app.get('/api/users', {
  preHandler: app.apiKey()
}, async (request) => {
  return { users: [] }
})

// Route with required scopes
app.delete('/api/users/:id', {
  preHandler: app.apiKey({ scopes: ['admin', 'users:delete'] })
}, handler)
```

### Utilities

```typescript
import { generateApiKey, timingSafeCompare } from '@fracabu/fastify-api-key'

const key = generateApiKey({ prefix: 'myapp', length: 32 })
// => 'myapp_aBcDeFgHiJkLmNoPqRsTuVwXyZ012345'
```

---

<a name="italiano"></a>
## :it: Italiano

### Funzionalita

- Supporto **Fastify v5**
- **TypeScript-first** con definizioni di tipo complete
- **Sorgenti di estrazione multiple** (header, query, body, cookie)
- **Sistema scopes/permessi**
- Supporto informazioni **rate limiting**
- Confronto chiavi **timing-safe** (previene timing attacks)
- **Error handler personalizzati**
- Supporto modulo duale **ESM e CJS**

### Installazione

```bash
npm install @fracabu/fastify-api-key
```

### Quick Start

```typescript
import Fastify from 'fastify'
import fastifyApiKey from '@fracabu/fastify-api-key'

const app = Fastify()

await app.register(fastifyApiKey, {
  validate: async (key) => {
    const apiKey = await db.apiKeys.findByKey(key)
    if (!apiKey) return { valid: false }
    return { valid: true, scopes: apiKey.scopes }
  }
})

// Rotta protetta
app.get('/api/users', {
  preHandler: app.apiKey()
}, async (request) => {
  return { users: [] }
})

// Rotta con scopes richiesti
app.delete('/api/users/:id', {
  preHandler: app.apiKey({ scopes: ['admin', 'users:delete'] })
}, handler)
```

---

## Security

<p align="center">
  <a href="https://www.npmjs.com/package/@fracabu/fastify-api-key"><img src="https://img.shields.io/badge/npm-provenance-brightgreen?logo=npm" alt="npm provenance" /></a>
  <a href="https://github.com/fracabu/fastify-api-key/attestations"><img src="https://img.shields.io/badge/SLSA-Level%202-blue?logo=github" alt="SLSA Level 2" /></a>
</p>

This package is published with **supply chain security** in mind:

| Feature | Status | Verification |
|---------|--------|--------------|
| npm Provenance | ✅ | `npm audit signatures` |
| GitHub Attestations | ✅ | `gh attestation verify` |
| SLSA Level | 2 | Build provenance |
| Timing-safe comparison | ✅ | Prevents timing attacks |

### Verify Package Authenticity

```bash
# Verify npm provenance
npm audit signatures

# Verify GitHub attestation
gh attestation verify $(npm pack @fracabu/fastify-api-key) --owner fracabu
```

For more details, see our [Wiki - Security](https://github.com/fracabu/fastify-api-key/wiki/Security).

---

## Requirements

- Node.js >= 20.0.0
- Fastify >= 5.0.0

## License

MIT

---

<p align="center">
  <a href="https://github.com/fracabu">
    <img src="https://img.shields.io/badge/Made_by-fracabu-8B5CF6?style=flat-square" alt="Made by fracabu" />
  </a>
</p>
