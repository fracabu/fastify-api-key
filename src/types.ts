import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import type { ApiKeyError } from './errors.js';

/**
 * Source from which to extract the API key
 */
export interface ApiKeySource {
  /** Source type */
  type: 'header' | 'query' | 'body' | 'cookie';
  /** Field name */
  name: string;
  /** Prefix to remove (e.g., "Bearer ", "ApiKey ") */
  prefix?: string;
}

/**
 * Validation result returned by the validate function
 */
export interface ApiKeyValidationResult {
  /** Whether the key is valid */
  valid: boolean;
  /** Scopes associated with the key */
  scopes?: string[];
  /** Rate limiting information */
  rateLimit?: {
    /** Maximum requests allowed */
    limit: number;
    /** Remaining requests */
    remaining: number;
    /** Unix timestamp when limit resets */
    reset: number;
  };
  /** Custom metadata associated with the key */
  metadata?: Record<string, unknown>;
  /** Error message if validation failed */
  errorMessage?: string;
}

/**
 * Custom validation function
 */
export type ApiKeyValidator = (
  key: string,
  request: FastifyRequest
) => ApiKeyValidationResult | Promise<ApiKeyValidationResult>;

/**
 * Custom error handler
 */
export type ApiKeyErrorHandler = (
  error: ApiKeyError,
  request: FastifyRequest,
  reply: FastifyReply
) => void | Promise<void>;

/**
 * Hook called after validation
 */
export type ApiKeyHook = (
  key: string,
  result: ApiKeyValidationResult,
  request: FastifyRequest
) => void | Promise<void>;

/**
 * Plugin options
 */
export interface FastifyApiKeyOptions {
  /**
   * Sources to extract API key from (in priority order)
   * @default [{ type: 'header', name: 'X-API-Key' }]
   */
  sources?: ApiKeySource[];

  /**
   * Validation function (required)
   */
  validate: ApiKeyValidator;

  /**
   * Custom error handler
   */
  errorHandler?: ApiKeyErrorHandler;

  /**
   * Decorator name for accessing key data
   * @default 'apiKey'
   */
  decoratorName?: string;

  /**
   * Allow requests without API key
   * @default false
   */
  allowAnonymous?: boolean;

  /**
   * Hook called after validation (success or failure)
   */
  onValidation?: ApiKeyHook;

  /**
   * Use timing-safe comparison
   * @default true
   */
  timingSafe?: boolean;
}

/**
 * Options for the route guard
 */
export interface ApiKeyGuardOptions {
  /** Scopes required (all must be present) */
  scopes?: string[] | undefined;
  /** Scopes required (at least one must be present) */
  anyScope?: string[] | undefined;
  /** Override allowAnonymous for this route */
  allowAnonymous?: boolean | undefined;
}

/**
 * API key data available on request
 */
export interface ApiKeyData {
  /** The key (redacted if timingSafe=true) */
  key: string;
  /** Scopes granted */
  scopes: string[];
  /** Rate limit information */
  rateLimit?: ApiKeyValidationResult['rateLimit'];
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

// Fastify module augmentation
declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Create a preHandler guard for API key authentication
     */
    apiKey: (options?: ApiKeyGuardOptions) => preHandlerHookHandler;

    /**
     * Alias for backwards compatibility
     */
    requireApiKey: (scopes?: string[]) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    /**
     * API key data (available after successful validation)
     */
    apiKey?: ApiKeyData;

    /**
     * Quick access to API key scopes
     */
    apiKeyScopes?: string[];
  }
}
