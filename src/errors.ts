/**
 * Base error class for API key errors
 */
export class ApiKeyError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 401) {
    super(message);
    this.name = 'ApiKeyError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Error thrown when API key is missing from request
 */
export class MissingApiKeyError extends ApiKeyError {
  constructor() {
    super('MISSING_API_KEY', 'API key is required', 401);
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Error thrown when API key is invalid
 */
export class InvalidApiKeyError extends ApiKeyError {
  constructor(message = 'Invalid API key') {
    super('INVALID_API_KEY', message, 401);
    this.name = 'InvalidApiKeyError';
  }
}

/**
 * Error thrown when API key lacks required scopes
 */
export class InsufficientScopesError extends ApiKeyError {
  public readonly requiredScopes: string[];
  public readonly providedScopes: string[];

  constructor(required: string[], provided: string[]) {
    super('INSUFFICIENT_SCOPES', `Insufficient scopes. Required: ${required.join(', ')}`, 403);
    this.name = 'InsufficientScopesError';
    this.requiredScopes = required;
    this.providedScopes = provided;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requiredScopes: this.requiredScopes,
      providedScopes: this.providedScopes,
    };
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends ApiKeyError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429);
    this.name = 'RateLimitExceededError';
    this.retryAfter = retryAfter;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}
