// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isAmbiguousSendError, isExplicitProviderRejection } from './mailer.mjs';

describe('resend error ambiguity', () => {
  it.each([408, 500, 501, 502, 503, 504, 505, 599])('marca HTTP %s como ambiguo', (statusCode) => {
    expect(isAmbiguousSendError({ statusCode })).toBe(true);
  });

  it.each([400, 401, 403, 422, 429])('no marca HTTP %s como ambiguo', (statusCode) => {
    expect(isAmbiguousSendError({ statusCode })).toBe(false);
  });

  it.each(['ECONNRESET', 'ETIMEDOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'])(
    'marca el error de red %s como ambiguo',
    (code) => {
      expect(isAmbiguousSendError({ code })).toBe(true);
    },
  );

  it.each(['ECONNREFUSED', 'ENETUNREACH', 'EAI_AGAIN'])(
    'no marca el fallo previo al envío %s como ambiguo',
    (code) => {
      expect(isAmbiguousSendError({ code })).toBe(false);
    },
  );

  it('detecta timeout por mensaje', () => {
    expect(isAmbiguousSendError(new Error('Request timed out'))).toBe(true);
  });

  it('no marca errores de validación como ambiguos', () => {
    expect(isAmbiguousSendError(new Error('invalid from address'))).toBe(false);
  });
});

describe('resend explicit provider rejection', () => {
  it.each([400, 401, 403, 422, 425, 429])('marca HTTP %s como rechazo explícito no ambiguo', (statusCode) => {
    expect(isExplicitProviderRejection({ statusCode })).toBe(true);
  });

  it.each([408, 500, 501, 502, 503, 504, 505, 599])('no marca HTTP %s como rechazo explícito', (statusCode) => {
    expect(isExplicitProviderRejection({ statusCode })).toBe(false);
  });

  it.each(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH'])(
    'no marca el error de red %s como rechazo explícito',
    (code) => {
      expect(isExplicitProviderRejection({ code })).toBe(false);
    },
  );

  it('marca rate limit sin estado HTTP como rechazo explícito', () => {
    expect(isExplicitProviderRejection({ name: 'rate_limit_exceeded', message: 'Too many requests' })).toBe(true);
    expect(isExplicitProviderRejection(new Error('rate limit exceeded'))).toBe(true);
  });

  it('no marca errores sin estado HTTP como rechazo explícito', () => {
    expect(isExplicitProviderRejection(new Error('invalid from address'))).toBe(false);
  });
});
