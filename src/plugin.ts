import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyApiKeyOptions, ApiKeyGuardOptions, ApiKeyData } from './types.js';
import { extractApiKey } from './extractors.js';
import { validateScopes } from './validators.js';
import { MissingApiKeyError, InvalidApiKeyError, InsufficientScopesError } from './errors.js';

const DEFAULT_SOURCES = [{ type: 'header' as const, name: 'X-API-Key' }];

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
    timingSafe = true,
  } = options;

  // Decorate request with undefined as initial value
  fastify.decorateRequest(decoratorName, undefined);
  fastify.decorateRequest('apiKeyScopes', undefined);

  // Create guard factory
  const createGuard = (guardOptions: ApiKeyGuardOptions = {}): ((request: FastifyRequest, reply: FastifyReply) => Promise<void>) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const shouldAllowAnonymous = guardOptions.allowAnonymous ?? allowAnonymous;

      // 1. Extract API key
      const key = extractApiKey(request, sources);

      if (!key) {
        if (shouldAllowAnonymous) {
          return;
        }
        const error = new MissingApiKeyError();
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 2. Validate API key
      const result = await validate(key, request);

      // Call validation hook
      if (onValidation) {
        await onValidation(key, result, request);
      }

      if (!result.valid) {
        if (shouldAllowAnonymous) {
          return;
        }
        const error = new InvalidApiKeyError(result.errorMessage);
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 3. Validate scopes
      const providedScopes = result.scopes ?? [];
      const scopeResult = validateScopes(providedScopes, guardOptions.scopes, guardOptions.anyScope);

      if (!scopeResult.valid) {
        const error = new InsufficientScopesError(
          guardOptions.scopes ?? guardOptions.anyScope ?? [],
          providedScopes
        );
        if (errorHandler) {
          await errorHandler(error, request, reply);
          return;
        }
        throw error;
      }

      // 4. Populate request with API key data
      const apiKeyData: ApiKeyData = {
        key: timingSafe ? '[REDACTED]' : key,
        scopes: providedScopes,
        rateLimit: result.rateLimit,
        metadata: result.metadata ?? {},
      };

      (request as unknown as Record<string, unknown>)[decoratorName] = apiKeyData;
      request.apiKeyScopes = providedScopes;
    };
  };

  // Decorate instance
  fastify.decorate('apiKey', createGuard);
  fastify.decorate('requireApiKey', (scopes?: string[]) => createGuard({ scopes }));
}
