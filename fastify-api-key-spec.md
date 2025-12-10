# Specifiche: fastify-api-key

Plugin Fastify per autenticazione tramite API Key con supporto scopes, rate limiting e gestione avanzata delle chiavi.

---

## 1. Metadata Progetto

```yaml
name: fastify-api-key
version: 1.0.0
description: Complete API Key authentication for Fastify with scopes, multiple sources, and TypeScript support
license: MIT
author: fracabu
keywords:
  - fastify
  - fastify-plugin
  - api-key
  - authentication
  - auth
  - security
  - scopes
  - permissions
  - authorization
  - api-authentication
engines:
  node: ">=20.0.0"
type: module
```

---

## 2. Analisi di Mercato

### 2.1 Competitor Esistente

| Package | Downloads/week | Ultimo Update | Fastify 5 | TypeScript |
|---------|----------------|---------------|-----------|------------|
| `fastify-api-key` | 153 | Agosto 2022 | No | Parziale |

### 2.2 Gap Identificati

Il competitor esistente manca di:
- Supporto Fastify v5
- Sistema di scopes/permissions
- Multiple sources per estrazione chiave
- Rate limiting per chiave
- Key rotation
- TypeScript types completi
- Timing-safe comparison

### 2.3 Differenziazione

| Feature | Competitor | Nostro |
|---------|------------|--------|
| Fastify 5 support | No | Si |
| TypeScript-first | No | Si |
| Multiple sources | No | Si |
| Scopes/Permissions | No | Si |
| Rate limiting info | No | Si |
| Timing-safe compare | No | Si |
| Hooks/Events | No | Si |

---

## 3. Struttura Directory

```
fastify-api-key/
├── src/
│   ├── index.ts              # Entry point, export plugin
│   ├── plugin.ts             # Implementazione plugin
│   ├── types.ts              # TypeScript types/interfaces
│   ├── extractors.ts         # Estrazione chiave da request
│   ├── validators.ts         # Validazione e comparison
│   ├── decorators.ts         # Fastify decorators
│   ├── errors.ts             # Errori custom
│   └── utils.ts              # Utility functions
├── test/
│   ├── plugin.test.ts        # Test plugin integration
│   ├── extractors.test.ts    # Test estrazione chiavi
│   ├── validators.test.ts    # Test validazione
│   ├── scopes.test.ts        # Test sistema scopes
│   └── helpers.ts            # Test utilities
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── LICENSE
└── CHANGELOG.md
```

---

## 4. TypeScript Types

### 4.1 Opzioni Plugin

```typescript
// src/types.ts

/**
 * Source da cui estrarre l'API key
 */
export interface ApiKeySource {
  /** Tipo di source */
  type: 'header' | 'query' | 'body' | 'cookie';
  /** Nome del campo */
  name: string;
  /** Prefisso da rimuovere (es. "Bearer ", "ApiKey ") */
  prefix?: string;
}

/**
 * Risultato della validazione
 */
export interface ApiKeyValidationResult {
  /** Se la chiave e valida */
  valid: boolean;
  /** Scopes associati alla chiave */
  scopes?: string[];
  /** Informazioni rate limiting */
  rateLimit?: {
    /** Limite massimo richieste */
    limit: number;
    /** Richieste rimanenti */
    remaining: number;
    /** Timestamp reset (Unix) */
    reset: number;
  };
  /** Metadata custom associati alla chiave */
  metadata?: Record<string, unknown>;
  /** Messaggio errore se non valida */
  errorMessage?: string;
}

/**
 * Funzione di validazione custom
 */
export type ApiKeyValidator = (
  key: string,
  request: FastifyRequest
) => ApiKeyValidationResult | Promise<ApiKeyValidationResult>;

/**
 * Handler errori custom
 */
export type ApiKeyErrorHandler = (
  error: ApiKeyError,
  request: FastifyRequest,
  reply: FastifyReply
) => void | Promise<void>;

/**
 * Hook chiamato quando una chiave viene validata
 */
export type ApiKeyHook = (
  key: string,
  result: ApiKeyValidationResult,
  request: FastifyRequest
) => void | Promise<void>;

/**
 * Opzioni del plugin
 */
export interface FastifyApiKeyOptions {
  /**
   * Sources da cui estrarre l'API key (in ordine di priorita)
   * @default [{ type: 'header', name: 'X-API-Key' }]
   */
  sources?: ApiKeySource[];

  /**
   * Funzione di validazione della chiave
   * @required
   */
  validate: ApiKeyValidator;

  /**
   * Handler errori custom
   * Se non specificato, usa errori standard
   */
  errorHandler?: ApiKeyErrorHandler;

  /**
   * Nome del decorator per accedere ai dati della chiave
   * @default 'apiKey'
   */
  decoratorName?: string;

  /**
   * Se true, la validazione fallisce silenziosamente (no throw)
   * Utile per route opzionalmente autenticate
   * @default false
   */
  allowAnonymous?: boolean;

  /**
   * Hook chiamato dopo validazione (success o fail)
   */
  onValidation?: ApiKeyHook;

  /**
   * Se true, usa timing-safe comparison per le chiavi
   * @default true
   */
  timingSafe?: boolean;
}

/**
 * Opzioni per il preHandler decorator
 */
export interface ApiKeyGuardOptions {
  /** Scopes richiesti (tutti devono essere presenti) */
  scopes?: string[];
  /** Scopes richiesti (almeno uno deve essere presente) */
  anyScope?: string[];
  /** Override allowAnonymous per questa route */
  allowAnonymous?: boolean;
}

/**
 * Dati API key disponibili nella request
 */
export interface ApiKeyData {
  /** La chiave usata (hashata se timingSafe=true) */
  key: string;
  /** Scopes della chiave */
  scopes: string[];
  /** Rate limit info */
  rateLimit?: ApiKeyValidationResult['rateLimit'];
  /** Metadata custom */
  metadata: Record<string, unknown>;
}
```

### 4.2 Errori Custom

```typescript
// src/errors.ts

export class ApiKeyError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 401) {
    super(message);
    this.name = 'ApiKeyError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class MissingApiKeyError extends ApiKeyError {
  constructor() {
    super(
      'MISSING_API_KEY',
      'API key is required',
      401
    );
  }
}

export class InvalidApiKeyError extends ApiKeyError {
  constructor(message?: string) {
    super(
      'INVALID_API_KEY',
      message || 'Invalid API key',
      401
    );
  }
}

export class InsufficientScopesError extends ApiKeyError {
  public readonly requiredScopes: string[];
  public readonly providedScopes: string[];

  constructor(required: string[], provided: string[]) {
    super(
      'INSUFFICIENT_SCOPES',
      `Insufficient scopes. Required: ${required.join(', ')}`,
      403
    );
    this.requiredScopes = required;
    this.providedScopes = provided;
  }
}

export class RateLimitExceededError extends ApiKeyError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      'Rate limit exceeded',
      429
    );
    this.retryAfter = retryAfter;
  }
}
```

### 4.3 Augmentation Fastify

```typescript
// src/types.ts (continua)

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * PreHandler per proteggere route con API key
     */
    apiKey: (options?: ApiKeyGuardOptions) => preHandlerHookHandler;

    /**
     * Alias per retrocompatibilita
     */
    requireApiKey: (scopes?: string[]) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    /**
     * Dati API key (disponibile dopo validazione)
     */
    apiKey?: ApiKeyData;

    /**
     * Alias per accesso rapido agli scopes
     */
    apiKeyScopes?: string[];
  }
}
```

---

## 5. Implementazione Core

### 5.1 Entry Point

```typescript
// src/index.ts

import fp from 'fastify-plugin';
import { fastifyApiKeyPlugin } from './plugin.js';
import type { FastifyApiKeyOptions } from './types.js';

export { FastifyApiKeyOptions } from './types.js';
export * from './errors.js';

export default fp<FastifyApiKeyOptions>(fastifyApiKeyPlugin, {
  fastify: '5.x',
  name: 'fastify-api-key'
});
```

### 5.2 Plugin Principale

```typescript
// src/plugin.ts

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  FastifyApiKeyOptions,
  ApiKeyGuardOptions,
  ApiKeyData
} from './types.js';
import { extractApiKey } from './extractors.js';
import {
  MissingApiKeyError,
  InvalidApiKeyError,
  InsufficientScopesError
} from './errors.js';

const DEFAULT_SOURCES = [
  { type: 'header' as const, name: 'X-API-Key' }
];

export async function fastifyApiKeyPlugin(
  fastify: FastifyInstance,
  options: FastifyApiKeyOptions
): Promise<void> {
  const {
    sources = DEFAULT_SOURCES,
    validate,
    errorHandler,
    decoratorName = 'apiKey',
    allowAnonymous = false,
    onValidation,
    timingSafe = true
  } = options;

  // Decorator per dati API key
  fastify.decorateRequest(decoratorName, null);
  fastify.decorateRequest('apiKeyScopes', null);

  // Funzione guard principale
  const createGuard = (guardOptions: ApiKeyGuardOptions = {}) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const shouldAllowAnonymous = guardOptions.allowAnonymous ?? allowAnonymous;

      // 1. Estrai API key
      const key = extractApiKey(request, sources);

      if (!key) {
        if (shouldAllowAnonymous) {
          return; // Continua senza autenticazione
        }
        const error = new MissingApiKeyError();
        if (errorHandler) {
          return errorHandler(error, request, reply);
        }
        throw error;
      }

      // 2. Valida API key
      const result = await validate(key, request);

      // Hook post-validazione
      if (onValidation) {
        await onValidation(key, result, request);
      }

      if (!result.valid) {
        if (shouldAllowAnonymous) {
          return;
        }
        const error = new InvalidApiKeyError(result.errorMessage);
        if (errorHandler) {
          return errorHandler(error, request, reply);
        }
        throw error;
      }

      // 3. Verifica scopes
      const requiredScopes = guardOptions.scopes || [];
      const anyScopes = guardOptions.anyScope || [];
      const providedScopes = result.scopes || [];

      // Tutti gli scopes richiesti devono essere presenti
      if (requiredScopes.length > 0) {
        const hasAllScopes = requiredScopes.every(s => providedScopes.includes(s));
        if (!hasAllScopes) {
          const error = new InsufficientScopesError(requiredScopes, providedScopes);
          if (errorHandler) {
            return errorHandler(error, request, reply);
          }
          throw error;
        }
      }

      // Almeno uno degli anyScopes deve essere presente
      if (anyScopes.length > 0) {
        const hasAnyScope = anyScopes.some(s => providedScopes.includes(s));
        if (!hasAnyScope) {
          const error = new InsufficientScopesError(anyScopes, providedScopes);
          if (errorHandler) {
            return errorHandler(error, request, reply);
          }
          throw error;
        }
      }

      // 4. Popola request con dati API key
      const apiKeyData: ApiKeyData = {
        key: timingSafe ? '[REDACTED]' : key,
        scopes: providedScopes,
        rateLimit: result.rateLimit,
        metadata: result.metadata || {}
      };

      (request as any)[decoratorName] = apiKeyData;
      request.apiKeyScopes = providedScopes;
    };
  };

  // Decorate fastify instance
  fastify.decorate('apiKey', createGuard);

  // Alias per retrocompatibilita
  fastify.decorate('requireApiKey', (scopes?: string[]) => {
    return createGuard({ scopes });
  });
}
```

### 5.3 Extractors

```typescript
// src/extractors.ts

import type { FastifyRequest } from 'fastify';
import type { ApiKeySource } from './types.js';

/**
 * Estrae l'API key dalla request secondo le sources configurate
 */
export function extractApiKey(
  request: FastifyRequest,
  sources: ApiKeySource[]
): string | null {
  for (const source of sources) {
    const key = extractFromSource(request, source);
    if (key) {
      return key;
    }
  }
  return null;
}

function extractFromSource(
  request: FastifyRequest,
  source: ApiKeySource
): string | null {
  let value: string | undefined;

  switch (source.type) {
    case 'header':
      value = request.headers[source.name.toLowerCase()] as string;
      break;

    case 'query':
      value = (request.query as Record<string, string>)?.[source.name];
      break;

    case 'body':
      value = (request.body as Record<string, string>)?.[source.name];
      break;

    case 'cookie':
      value = (request.cookies as Record<string, string>)?.[source.name];
      break;
  }

  if (!value) {
    return null;
  }

  // Rimuovi prefisso se specificato
  if (source.prefix && value.startsWith(source.prefix)) {
    return value.slice(source.prefix.length).trim();
  }

  return value.trim();
}
```

### 5.4 Utilities

```typescript
// src/utils.ts

import { timingSafeEqual } from 'crypto';

/**
 * Confronta due stringhe in modo timing-safe
 * Previene timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Confronta comunque per evitare timing leak sulla lunghezza
    timingSafeEqual(bufA, bufA);
    return false;
  }

  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifica se un array di scopes include tutti gli scopes richiesti
 */
export function hasAllScopes(
  provided: string[],
  required: string[]
): boolean {
  return required.every(scope => provided.includes(scope));
}

/**
 * Verifica se un array di scopes include almeno uno degli scopes richiesti
 */
export function hasAnyScope(
  provided: string[],
  required: string[]
): boolean {
  return required.some(scope => provided.includes(scope));
}

/**
 * Genera un API key con prefisso (utility helper)
 */
export function generateApiKey(options: {
  prefix?: string;
  length?: number;
} = {}): string {
  const { prefix = '', length = 32 } = options;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return prefix ? `${prefix}_${randomPart}` : randomPart;
}
```

---

## 6. Esempi di Utilizzo

### 6.1 Setup Base

```typescript
import Fastify from 'fastify';
import fastifyApiKey from 'fastify-api-key';

const fastify = Fastify({ logger: true });

// API keys in memoria (in produzione: database)
const apiKeys = new Map([
  ['sk_live_abc123', { scopes: ['read', 'write'], clientId: 'client-1' }],
  ['sk_live_xyz789', { scopes: ['read'], clientId: 'client-2' }]
]);

await fastify.register(fastifyApiKey, {
  validate: async (key) => {
    const keyData = apiKeys.get(key);

    if (!keyData) {
      return { valid: false, errorMessage: 'Unknown API key' };
    }

    return {
      valid: true,
      scopes: keyData.scopes,
      metadata: { clientId: keyData.clientId }
    };
  }
});

// Route protetta
fastify.get('/users', {
  preHandler: fastify.apiKey()
}, async (request) => {
  // request.apiKey contiene i dati della chiave
  return {
    users: [],
    authenticatedAs: request.apiKey?.metadata.clientId
  };
});

await fastify.listen({ port: 3000 });
```

### 6.2 Multiple Sources

```typescript
await fastify.register(fastifyApiKey, {
  sources: [
    // Prima cerca nell'header X-API-Key
    { type: 'header', name: 'X-API-Key' },
    // Poi nell'header Authorization con prefisso
    { type: 'header', name: 'Authorization', prefix: 'ApiKey ' },
    // Infine nella query string
    { type: 'query', name: 'api_key' }
  ],
  validate: async (key) => {
    // ...validazione
  }
});
```

### 6.3 Scopes e Permissions

```typescript
// Route che richiede scope specifico
fastify.get('/admin/users', {
  preHandler: fastify.apiKey({ scopes: ['admin:read'] })
}, handler);

// Route che richiede TUTTI gli scopes specificati
fastify.delete('/users/:id', {
  preHandler: fastify.apiKey({ scopes: ['users:read', 'users:delete'] })
}, handler);

// Route che richiede ALMENO UNO degli scopes
fastify.get('/reports', {
  preHandler: fastify.apiKey({ anyScope: ['reports:read', 'admin:read'] })
}, handler);
```

### 6.4 Con Rate Limiting Info

```typescript
await fastify.register(fastifyApiKey, {
  validate: async (key) => {
    const keyData = await db.apiKeys.findByKey(key);
    if (!keyData) return { valid: false };

    // Calcola rate limit
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

// Nella route, puoi aggiungere headers rate limit
fastify.addHook('onSend', (request, reply, payload, done) => {
  if (request.apiKey?.rateLimit) {
    const { limit, remaining, reset } = request.apiKey.rateLimit;
    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', reset);
  }
  done();
});
```

### 6.5 Route Opzionalmente Autenticate

```typescript
// Globalmente: alcune route permettono anonymous
await fastify.register(fastifyApiKey, {
  allowAnonymous: true,  // Default per tutte le route
  validate: async (key) => { /* ... */ }
});

// Route pubblica (no API key richiesta)
fastify.get('/public', handler);

// Route che richiede API key (override)
fastify.get('/private', {
  preHandler: fastify.apiKey({ allowAnonymous: false })
}, handler);

// Route che funziona con o senza API key
fastify.get('/mixed', {
  preHandler: fastify.apiKey({ allowAnonymous: true })
}, async (request) => {
  if (request.apiKey) {
    return { message: 'Authenticated', user: request.apiKey.metadata };
  }
  return { message: 'Anonymous access' };
});
```

### 6.6 Custom Error Handler

```typescript
await fastify.register(fastifyApiKey, {
  validate: async (key) => { /* ... */ },

  errorHandler: (error, request, reply) => {
    // Log errore
    request.log.warn({ err: error, key: '[REDACTED]' }, 'API key validation failed');

    // Risposta custom
    reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      // Aggiungi info per debugging in dev
      ...(process.env.NODE_ENV === 'development' && {
        details: error
      })
    });
  }
});
```

### 6.7 Hook per Logging/Audit

```typescript
await fastify.register(fastifyApiKey, {
  validate: async (key) => { /* ... */ },

  onValidation: async (key, result, request) => {
    // Log ogni tentativo di autenticazione
    await auditLog.record({
      timestamp: new Date(),
      ip: request.ip,
      path: request.url,
      method: request.method,
      apiKeyPrefix: key.substring(0, 10) + '...',
      success: result.valid,
      scopes: result.scopes,
      errorMessage: result.errorMessage
    });
  }
});
```

### 6.8 Integrazione con Database (Esempio Prisma)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await fastify.register(fastifyApiKey, {
  validate: async (key) => {
    // Trova API key nel database
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: { client: true }
    });

    if (!apiKey) {
      return { valid: false };
    }

    // Verifica se la chiave e scaduta
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, errorMessage: 'API key expired' };
    }

    // Verifica se la chiave e revocata
    if (apiKey.revokedAt) {
      return { valid: false, errorMessage: 'API key revoked' };
    }

    // Aggiorna ultimo utilizzo
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      valid: true,
      scopes: apiKey.scopes,
      metadata: {
        clientId: apiKey.client.id,
        clientName: apiKey.client.name,
        keyId: apiKey.id
      }
    };
  }
});
```

---

## 7. Test Cases

### 7.1 Test Plugin Base

```typescript
// test/plugin.test.ts

import { test } from 'tap';
import Fastify from 'fastify';
import fastifyApiKey from '../src/index.js';

test('should authenticate with valid API key', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    validate: async (key) => ({
      valid: key === 'valid-key',
      scopes: ['read']
    })
  });

  fastify.get('/test', {
    preHandler: fastify.apiKey()
  }, async () => ({ success: true }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/test',
    headers: { 'X-API-Key': 'valid-key' }
  });

  t.equal(response.statusCode, 200);
  t.same(response.json(), { success: true });
});

test('should reject missing API key', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    validate: async () => ({ valid: true })
  });

  fastify.get('/test', {
    preHandler: fastify.apiKey()
  }, async () => ({ success: true }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/test'
  });

  t.equal(response.statusCode, 401);
});

test('should reject invalid API key', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    validate: async (key) => ({
      valid: key === 'valid-key'
    })
  });

  fastify.get('/test', {
    preHandler: fastify.apiKey()
  }, async () => ({ success: true }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/test',
    headers: { 'X-API-Key': 'wrong-key' }
  });

  t.equal(response.statusCode, 401);
});
```

### 7.2 Test Scopes

```typescript
// test/scopes.test.ts

import { test } from 'tap';
import Fastify from 'fastify';
import fastifyApiKey from '../src/index.js';

test('should allow access with correct scopes', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    validate: async () => ({
      valid: true,
      scopes: ['admin', 'users:read']
    })
  });

  fastify.get('/admin', {
    preHandler: fastify.apiKey({ scopes: ['admin'] })
  }, async () => ({ access: 'granted' }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/admin',
    headers: { 'X-API-Key': 'any-key' }
  });

  t.equal(response.statusCode, 200);
});

test('should deny access with insufficient scopes', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    validate: async () => ({
      valid: true,
      scopes: ['read']
    })
  });

  fastify.get('/admin', {
    preHandler: fastify.apiKey({ scopes: ['admin'] })
  }, async () => ({ access: 'granted' }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/admin',
    headers: { 'X-API-Key': 'any-key' }
  });

  t.equal(response.statusCode, 403);
});

test('should work with anyScope option', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    validate: async () => ({
      valid: true,
      scopes: ['viewer']
    })
  });

  fastify.get('/reports', {
    preHandler: fastify.apiKey({ anyScope: ['viewer', 'admin'] })
  }, async () => ({ access: 'granted' }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/reports',
    headers: { 'X-API-Key': 'any-key' }
  });

  t.equal(response.statusCode, 200);
});
```

### 7.3 Test Extractors

```typescript
// test/extractors.test.ts

import { test } from 'tap';
import Fastify from 'fastify';
import fastifyApiKey from '../src/index.js';

test('should extract from query string', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    sources: [{ type: 'query', name: 'api_key' }],
    validate: async (key) => ({
      valid: key === 'query-key'
    })
  });

  fastify.get('/test', {
    preHandler: fastify.apiKey()
  }, async () => ({ success: true }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/test?api_key=query-key'
  });

  t.equal(response.statusCode, 200);
});

test('should extract with prefix removal', async (t) => {
  const fastify = Fastify();

  await fastify.register(fastifyApiKey, {
    sources: [{ type: 'header', name: 'Authorization', prefix: 'ApiKey ' }],
    validate: async (key) => ({
      valid: key === 'my-secret-key'
    })
  });

  fastify.get('/test', {
    preHandler: fastify.apiKey()
  }, async () => ({ success: true }));

  const response = await fastify.inject({
    method: 'GET',
    url: '/test',
    headers: { 'Authorization': 'ApiKey my-secret-key' }
  });

  t.equal(response.statusCode, 200);
});

test('should try sources in order', async (t) => {
  const fastify = Fastify();
  let extractedFrom = '';

  await fastify.register(fastifyApiKey, {
    sources: [
      { type: 'header', name: 'X-API-Key' },
      { type: 'query', name: 'api_key' }
    ],
    validate: async (key) => {
      extractedFrom = key.startsWith('header') ? 'header' : 'query';
      return { valid: true };
    }
  });

  fastify.get('/test', {
    preHandler: fastify.apiKey()
  }, async () => ({ from: extractedFrom }));

  // Header ha priorita
  const response = await fastify.inject({
    method: 'GET',
    url: '/test?api_key=query-key',
    headers: { 'X-API-Key': 'header-key' }
  });

  t.equal(response.json().from, 'header');
});
```

---

## 8. README.md Template

```markdown
# fastify-api-key

Complete API Key authentication for Fastify with scopes, multiple sources, and TypeScript support.

[![npm version](https://badge.fury.io/js/fastify-api-key.svg)](https://www.npmjs.com/package/fastify-api-key)
[![CI](https://github.com/fracabu/fastify-api-key/actions/workflows/ci.yml/badge.svg)](https://github.com/fracabu/fastify-api-key/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Fastify v5 support
- TypeScript-first with complete type definitions
- Multiple extraction sources (header, query, body, cookie)
- Scopes/permissions system
- Rate limiting information support
- Timing-safe key comparison
- Custom error handlers
- Validation hooks for logging/audit

## Installation

```bash
npm install fastify-api-key
```

## Quick Start

```typescript
import Fastify from 'fastify';
import fastifyApiKey from 'fastify-api-key';

const fastify = Fastify();

await fastify.register(fastifyApiKey, {
  validate: async (key) => {
    const isValid = await validateKeyInDatabase(key);
    return {
      valid: isValid,
      scopes: ['read', 'write']
    };
  }
});

// Protected route
fastify.get('/api/users', {
  preHandler: fastify.apiKey()
}, async (request) => {
  return { users: [] };
});

// Route with required scopes
fastify.delete('/api/users/:id', {
  preHandler: fastify.apiKey({ scopes: ['admin', 'users:delete'] })
}, async (request) => {
  return { deleted: true };
});

await fastify.listen({ port: 3000 });
```

## API Reference

See [full documentation](https://github.com/fracabu/fastify-api-key#readme).

## License

MIT
```

---

## 9. Configurazione Build

### 9.1 package.json

```json
{
  "name": "fastify-api-key",
  "version": "1.0.0",
  "description": "Complete API Key authentication for Fastify with scopes, multiple sources, and TypeScript support",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "tap test/**/*.test.ts",
    "test:coverage": "tap test/**/*.test.ts --coverage-report=lcov",
    "lint": "eslint src test",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "fastify",
    "fastify-plugin",
    "api-key",
    "authentication",
    "auth",
    "security",
    "scopes",
    "permissions"
  ],
  "author": "fracabu",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/fracabu/fastify-api-key.git"
  },
  "bugs": {
    "url": "https://github.com/fracabu/fastify-api-key/issues"
  },
  "homepage": "https://github.com/fracabu/fastify-api-key#readme",
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "fastify-plugin": "^5.0.0"
  },
  "peerDependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "fastify": "^5.0.0",
    "tap": "^21.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.6.0"
  }
}
```

### 9.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 9.3 tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20'
});
```

### 9.4 GitHub Actions CI

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        continue-on-error: true  # Non fallire se versione esiste gia
```

---

## 10. Checklist Pre-Pubblicazione

- [ ] Implementazione core completa
- [ ] TypeScript types esportati e testati
- [ ] Test coverage > 90%
- [ ] README.md con esempi
- [ ] CHANGELOG.md iniziale
- [ ] LICENSE MIT
- [ ] CI/CD GitHub Actions funzionante
- [ ] npm publish test con --dry-run
- [ ] Security audit (timing attacks, input validation)
- [ ] Benchmark vs competitor

---

## 11. Roadmap Post-v1.0

### v1.1 - Key Management Utilities
- Helper per generazione chiavi sicure
- Hash utilities per storage
- Key rotation helpers

### v1.2 - Integrations
- Adapter Redis per caching validazione
- Adapter database comuni (Prisma, Drizzle)

### v1.3 - Advanced Features
- IP whitelist per API key
- Key expiration automatica
- Usage analytics hooks

---

*Ultimo aggiornamento: 10 Dicembre 2025*
