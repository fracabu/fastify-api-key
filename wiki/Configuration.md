# Configuration

## Plugin Options

```typescript
await app.register(fastifyApiKey, {
  // Required: validation function
  validate: async (key) => { ... },

  // Optional settings
  extractFrom: ['header'],
  header: 'x-api-key',
  query: 'api_key',
  body: 'apiKey',
  cookie: 'api_key',
  prefix: '',
  timingSafe: true,
  decoratorName: 'apiKey',
  allowAnonymous: false,
  onError: (error, request, reply) => { ... },
  onValidation: (result, request) => { ... }
})
```

## Options Reference

### `validate` (required)

Async function to validate the API key. Must return a `ValidationResult`:

```typescript
type ValidationResult = {
  valid: boolean
  scopes?: string[]
  metadata?: Record<string, unknown>
  rateLimit?: {
    limit: number
    remaining: number
    reset: number
  }
}
```

### `extractFrom`

Array of sources to extract API key from, in priority order.

| Value | Description |
|-------|-------------|
| `'header'` | HTTP header (default: `x-api-key`) |
| `'query'` | Query parameter (default: `api_key`) |
| `'body'` | Request body field (default: `apiKey`) |
| `'cookie'` | Cookie (default: `api_key`) |

```typescript
extractFrom: ['header', 'query', 'cookie']
```

### `header`

Header name for API key extraction.

```typescript
header: 'x-api-key'       // default
header: 'Authorization'   // use Authorization header
```

### `query`

Query parameter name.

```typescript
query: 'api_key'   // default: ?api_key=xxx
query: 'token'     // custom: ?token=xxx
```

### `body`

Body field name for POST/PUT requests.

```typescript
body: 'apiKey'   // default
body: 'token'    // custom
```

### `cookie`

Cookie name.

```typescript
cookie: 'api_key'  // default
cookie: 'session'  // custom
```

### `prefix`

Prefix to strip from the API key before validation.

```typescript
prefix: 'Bearer '   // "Bearer sk_xxx" => "sk_xxx"
prefix: 'ApiKey '   // "ApiKey abc123" => "abc123"
```

### `timingSafe`

Enable timing-safe string comparison to prevent timing attacks.

```typescript
timingSafe: true   // default, recommended
timingSafe: false  // disable (not recommended)
```

### `decoratorName`

Custom name for the Fastify decorator.

```typescript
decoratorName: 'apiKey'      // default: app.apiKey()
decoratorName: 'authKey'     // custom: app.authKey()
```

### `allowAnonymous`

Allow requests without API key to proceed.

```typescript
allowAnonymous: true   // request.apiKey will be null
allowAnonymous: false  // default, returns 401
```

### `onError`

Custom error handler.

```typescript
onError: (error, request, reply) => {
  // Log error
  request.log.error(error)

  // Custom response
  reply.code(401).send({
    error: 'Unauthorized',
    message: error.message
  })
}
```

### `onValidation`

Hook called after validation (success or failure).

```typescript
onValidation: (result, request) => {
  // Audit logging
  console.log({
    ip: request.ip,
    valid: result.valid,
    scopes: result.scopes,
    timestamp: new Date()
  })
}
```

## Route Options

When using `app.apiKey()` as preHandler:

```typescript
app.apiKey({
  scopes: ['admin', 'write'],  // ALL scopes required
  anyScope: ['read', 'admin']  // At least ONE scope required
})
```

## TypeScript

The plugin augments Fastify types automatically:

```typescript
// request.apiKey is typed
app.get('/test', { preHandler: app.apiKey() }, (request) => {
  request.apiKey.scopes    // string[]
  request.apiKey.metadata  // Record<string, unknown>
  request.apiKey.rateLimit // { limit, remaining, reset }
})
```
