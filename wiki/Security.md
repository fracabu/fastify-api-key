# Security

## Supply Chain Security

This package is published with multiple layers of supply chain security to ensure authenticity and integrity.

### Attestations

| Type | Status | Verification |
|------|--------|--------------|
| npm Provenance | ✅ Enabled | `npm audit signatures` |
| GitHub Attestations | ✅ Enabled | `gh attestation verify` |
| SLSA Level | 2 | Build provenance |

### What is SLSA?

[SLSA](https://slsa.dev/) (Supply-chain Levels for Software Artifacts) is a security framework that provides guarantees about the integrity of software artifacts.

**Level 2** means:
- Build process is authenticated
- Provenance is tamper-resistant
- Build is reproducible from source

### Verify Package Authenticity

#### npm Provenance

```bash
# Verify all packages in your project
npm audit signatures

# Output: "1 package has a verified registry signature"
```

#### GitHub Attestations

```bash
# Download and verify the tarball
gh attestation verify $(npm pack @fracabu/fastify-api-key) --owner fracabu
```

Example output:
```
Loaded digest sha256:abc123... for file fracabu-fastify-api-key-1.0.2.tgz
Loaded 1 attestation from GitHub API
✓ Verification succeeded!
```

### View Attestation Details

Visit the [Attestations page](https://github.com/fracabu/fastify-api-key/attestations) to see:
- All signed builds
- Build provenance JSON
- Workflow details
- Commit SHA

---

## API Key Security Best Practices

### 1. Generate Strong Keys

Use the built-in generator:

```typescript
import { generateApiKey } from '@fracabu/fastify-api-key'

// Secure random key with prefix
const key = generateApiKey({
  prefix: 'prod',
  length: 32  // 256 bits of entropy
})
```

### 2. Store Keys Securely

```typescript
import { createHash } from 'crypto'

// Hash keys before storing in database
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// Store only the hash
await db.apiKeys.create({
  keyHash: hashKey(apiKey),
  scopes: ['read'],
  userId: user.id
})
```

### 3. Use Timing-Safe Comparison

The plugin uses timing-safe comparison by default:

```typescript
await app.register(fastifyApiKey, {
  timingSafe: true,  // default, prevents timing attacks
  validate: async (key) => { ... }
})
```

### 4. Implement Rate Limiting

Return rate limit info from your validator:

```typescript
validate: async (key) => {
  const apiKey = await db.apiKeys.findByKey(hashKey(key))

  return {
    valid: true,
    rateLimit: {
      limit: apiKey.rateLimit,
      remaining: await getRemainingCalls(key),
      reset: getResetTimestamp()
    }
  }
}
```

### 5. Audit Logging

Use the `onValidation` hook:

```typescript
onValidation: (result, request) => {
  auditLog.write({
    timestamp: new Date().toISOString(),
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    path: request.url,
    valid: result.valid,
    scopes: result.scopes
  })
}
```

### 6. Key Rotation

Implement key rotation strategy:

```typescript
// Support multiple active keys per user
const apiKey = await db.apiKeys.findOne({
  where: {
    keyHash: hashKey(key),
    expiresAt: { $gt: new Date() },
    revoked: false
  }
})
```

### 7. Environment Variables

Never hardcode API keys:

```typescript
// .env
API_KEYS=key1,key2,key3

// app.ts
const validKeys = process.env.API_KEYS?.split(',') || []
```

---

## Reporting Security Issues

If you discover a security vulnerability, please report it privately:

1. **Do NOT** open a public issue
2. Email the maintainer or use GitHub's private vulnerability reporting
3. Include steps to reproduce

We aim to respond within 48 hours and patch critical issues within 7 days.
