import { describe, it, expect } from 'vitest';
import { classifyProviderError } from './provider.mjs';

describe('classifyProviderError (Fase 4.1.10)', () => {
  it('clasifica HTTP 429 como AI_PROVIDER_RATE_LIMITED con mensaje seguro', () => {
    const error = classifyProviderError(429, '{}');
    expect(error.code).toBe('AI_PROVIDER_RATE_LIMITED');
    expect(error.status).toBe(429);
    expect(error.retriable).toBe(true);
    expect(error.message).not.toMatch(/darkbloom|metadata|provider_name|raw/i);
    expect(error.message).toMatch(/temporalmente limitado/i);
  });

  it('detecta 429 oculto en el cuerpo de OpenRouter (free models)', () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message: 'Request failed with status code 429',
        metadata: {
          raw: 'Rate limit exceeded for the model',
          provider_name: 'SomeProvider',
        },
      },
    });
    const error = classifyProviderError(200, body);
    expect(error.code).toBe('AI_PROVIDER_RATE_LIMITED');
    expect(error.retriable).toBe(true);
  });

  it('clasifica 401/403 como AI_PROVIDER_AUTH (no reintentable)', () => {
    const error = classifyProviderError(401, 'unauthorized');
    expect(error.code).toBe('AI_PROVIDER_AUTH');
    expect(error.retriable).toBe(false);
  });

  it('clasifica 5xx como AI_PROVIDER_SERVER_ERROR (reintentable)', () => {
    const error = classifyProviderError(503, 'upstream error');
    expect(error.code).toBe('AI_PROVIDER_SERVER_ERROR');
    expect(error.retriable).toBe(true);
  });

  it('clasifica otros errores como AI_PROVIDER_ERROR sin exponer el detalle crudo', () => {
    const error = classifyProviderError(400, JSON.stringify({ error: 'invalid request' }));
    expect(error.code).toBe('AI_PROVIDER_ERROR');
    expect(error.retriable).toBe(false);
    expect(error.detail).toBeDefined();
    // El detalle crudo NUNCA va al mensaje visible (va a logging interno).
    expect(error.message).not.toContain('invalid request');
  });

  it('clasifica 400 con json_validate_failed sin falso rate limit', () => {
    const body = JSON.stringify({ error: { code: 'json_validate_failed' } });
    const error = classifyProviderError(400, body);
    expect(error.code).toBe('AI_PROVIDER_ERROR');
    expect(error.retriable).toBe(false);
  });
});
