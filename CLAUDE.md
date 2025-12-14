# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fastify plugin for API Key authentication with scopes, multiple extraction sources, and TypeScript support. Targets Fastify v5 and Node.js >= 20.

## Build Commands

```bash
npm run build          # Build with tsup (ESM + CJS)
npm run dev            # Build in watch mode
npm test               # Run tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage (90% threshold)
npx vitest run test/plugin.test.ts  # Run a single test file
npm run lint           # ESLint (flat config)
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier format
npm run format:check   # Check formatting
npm run typecheck      # TypeScript type check
npm run clean          # Remove dist and coverage
```

## Architecture

### Core Files (src/)
- `index.ts` - Entry point, exports plugin wrapped with fastify-plugin
- `plugin.ts` - Main plugin implementation with guard creation logic
- `types.ts` - TypeScript interfaces and Fastify module augmentation
- `extractors.ts` - API key extraction from headers, query, body, cookies
- `validators.ts` - Scope validation helpers
- `errors.ts` - Custom error classes (ApiKeyError, MissingApiKeyError, InvalidApiKeyError, InsufficientScopesError, RateLimitExceededError)
- `utils.ts` - Timing-safe comparison, scope checking, key generation

### Test Files (test/)
- `helpers.ts` - Test utilities and fixtures
- `plugin.test.ts` - Integration tests
- `extractors.test.ts` - Unit tests for key extraction
- `validators.test.ts` - Unit tests for scope validation
- `utils.test.ts` - Unit tests for utilities
- `errors.test.ts` - Error class tests
- `scopes.test.ts` - Comprehensive scope system tests

### Key Patterns
- Plugin uses `fastify-plugin` wrapper for proper encapsulation
- Decorates `FastifyInstance` with `apiKey()` and `requireApiKey()` guard factories
- Decorates `FastifyRequest` with `apiKey` data and `apiKeyScopes`
- Sources are checked in priority order (first match wins)
- Timing-safe comparison enabled by default to prevent timing attacks

### Validation Flow
1. Extract key from configured sources (header/query/body/cookie)
2. Call user-provided `validate()` function
3. Call `onValidation` hook if provided
4. Check scopes if specified (`scopes` = all required, `anyScope` = at least one)
5. Populate request with ApiKeyData on success

## TypeScript Configuration
- ESM module (`"type": "module"`)
- Target ES2022, NodeNext module resolution
- Strict mode with all strict flags enabled
- Dual ESM/CJS output via tsup
- Types exported alongside JS (conditional exports)

## Testing
- Vitest for testing framework
- Coverage thresholds: 90% lines, 90% functions, 85% branches
- Tests in `test/` directory with `.test.ts` extension

## CI/CD
- GitHub Actions for CI (lint, test, build on Node 20 + 22)
- Release workflow with npm provenance on tag push
- Codecov integration for coverage reports
