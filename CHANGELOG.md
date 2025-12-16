# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2025-12-16

### Added

- GitHub artifact attestations for SLSA Level 2 compliance
- Security section in README with verification instructions

### Security

- Dual attestation: npm provenance + GitHub attestations
- Tarball attached to GitHub releases for verification

## [1.0.1] - 2025-12-14

### Changed

- Improved code formatting consistency

### Security

- Added npm provenance for supply chain security

## [1.0.0] - 2024-12-10

### Added

- Initial release
- API key extraction from multiple sources (header, query, body, cookie)
- Configurable extraction sources with priority ordering
- Prefix removal support (e.g., "Bearer ", "ApiKey ")
- Scope-based authorization with `scopes` (all required) and `anyScope` (at least one)
- Timing-safe key comparison to prevent timing attacks
- Custom error handlers for fine-grained error responses
- Validation hooks (`onValidation`) for logging and audit
- Rate limiting information support in validation results
- Custom metadata support for API keys
- Anonymous access mode (`allowAnonymous`)
- Custom decorator name support
- Full TypeScript support with Fastify module augmentation
- Dual ESM and CommonJS module support
- Fastify v5 compatibility
- Node.js 20+ support

### Security

- Timing-safe string comparison enabled by default
- API key redaction in request object when `timingSafe=true`

[Unreleased]: https://github.com/fracabu/fastify-api-key/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/fracabu/fastify-api-key/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/fracabu/fastify-api-key/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/fracabu/fastify-api-key/releases/tag/v1.0.0
