import type { FastifyRequest } from 'fastify';
import type { ApiKeySource } from './types.js';

/**
 * Extract API key from request based on configured sources
 */
export function extractApiKey(request: FastifyRequest, sources: ApiKeySource[]): string | null {
  for (const source of sources) {
    const key = extractFromSource(request, source);
    if (key) {
      return key;
    }
  }
  return null;
}

function extractFromSource(request: FastifyRequest, source: ApiKeySource): string | null {
  let value: string | undefined;

  switch (source.type) {
    case 'header': {
      const headerValue = request.headers[source.name.toLowerCase()];
      value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      break;
    }
    case 'query': {
      const query = request.query as Record<string, unknown> | undefined;
      if (query && typeof query[source.name] === 'string') {
        value = query[source.name] as string;
      }
      break;
    }
    case 'body': {
      const body = request.body as Record<string, unknown> | null | undefined;
      if (body && typeof body[source.name] === 'string') {
        value = body[source.name] as string;
      }
      break;
    }
    case 'cookie': {
      const cookies = (request as unknown as { cookies?: Record<string, string> }).cookies;
      if (cookies) {
        value = cookies[source.name];
      }
      break;
    }
  }

  if (!value) {
    return null;
  }

  // Remove prefix if specified
  if (source.prefix && value.startsWith(source.prefix)) {
    return value.slice(source.prefix.length).trim();
  }

  return value.trim();
}
