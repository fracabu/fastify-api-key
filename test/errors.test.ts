import { describe, it, expect } from 'vitest';
import {
  ApiKeyError,
  MissingApiKeyError,
  InvalidApiKeyError,
  InsufficientScopesError,
  RateLimitExceededError,
} from '../src/errors.js';

describe('ApiKeyError', () => {
  it('should create error with correct properties', () => {
    const error = new ApiKeyError('TEST_ERROR', 'Test message', 500);

    expect(error.name).toBe('ApiKeyError');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(500);
    expect(error instanceof Error).toBe(true);
  });

  it('should default to 401 status code', () => {
    const error = new ApiKeyError('TEST', 'Test');
    expect(error.statusCode).toBe(401);
  });

  it('should serialize to JSON correctly', () => {
    const error = new ApiKeyError('TEST_ERROR', 'Test message', 403);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'TEST_ERROR',
      message: 'Test message',
      statusCode: 403,
    });
  });
});

describe('MissingApiKeyError', () => {
  it('should create error with correct properties', () => {
    const error = new MissingApiKeyError();

    expect(error.name).toBe('MissingApiKeyError');
    expect(error.code).toBe('MISSING_API_KEY');
    expect(error.message).toBe('API key is required');
    expect(error.statusCode).toBe(401);
  });
});

describe('InvalidApiKeyError', () => {
  it('should create error with default message', () => {
    const error = new InvalidApiKeyError();

    expect(error.name).toBe('InvalidApiKeyError');
    expect(error.code).toBe('INVALID_API_KEY');
    expect(error.message).toBe('Invalid API key');
    expect(error.statusCode).toBe(401);
  });

  it('should create error with custom message', () => {
    const error = new InvalidApiKeyError('Key has expired');
    expect(error.message).toBe('Key has expired');
  });
});

describe('InsufficientScopesError', () => {
  it('should create error with scope information', () => {
    const error = new InsufficientScopesError(['admin', 'write'], ['read']);

    expect(error.name).toBe('InsufficientScopesError');
    expect(error.code).toBe('INSUFFICIENT_SCOPES');
    expect(error.message).toBe('Insufficient scopes. Required: admin, write');
    expect(error.statusCode).toBe(403);
    expect(error.requiredScopes).toEqual(['admin', 'write']);
    expect(error.providedScopes).toEqual(['read']);
  });

  it('should serialize to JSON with scope information', () => {
    const error = new InsufficientScopesError(['admin'], ['read', 'write']);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'INSUFFICIENT_SCOPES',
      message: 'Insufficient scopes. Required: admin',
      statusCode: 403,
      requiredScopes: ['admin'],
      providedScopes: ['read', 'write'],
    });
  });
});

describe('RateLimitExceededError', () => {
  it('should create error with retry information', () => {
    const error = new RateLimitExceededError(3600);

    expect(error.name).toBe('RateLimitExceededError');
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(3600);
  });

  it('should serialize to JSON with retry information', () => {
    const error = new RateLimitExceededError(1800);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      statusCode: 429,
      retryAfter: 1800,
    });
  });
});
