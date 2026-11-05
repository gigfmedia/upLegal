// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('prospecting search provider detection logic', () => {
  function detectSearchProvider(env) {
    return env.SERPER_API_KEY && env.SERPER_API_KEY.trim().length > 0 
      ? 'serper' 
      : env.BRAVE_SEARCH_API_KEY && env.BRAVE_SEARCH_API_KEY.trim().length > 0 
      ? 'brave' 
      : (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_API_KEY.trim().length > 0 && env.GOOGLE_CSE_CX && env.GOOGLE_CSE_CX.trim().length > 0) 
      ? 'google_cse' 
      : null;
  }

  it('detecta SERPER como proveedor cuando SERPER_API_KEY está configurado', () => {
    expect(detectSearchProvider({ SERPER_API_KEY: 'test-key' })).toBe('serper');
  });

  it('detecta BRAVE como proveedor cuando BRAVE_SEARCH_API_KEY está configurado', () => {
    expect(detectSearchProvider({ BRAVE_SEARCH_API_KEY: 'test-key' })).toBe('brave');
  });

  it('detecta Google CSE cuando ambas variables están configuradas', () => {
    expect(detectSearchProvider({ GOOGLE_CSE_API_KEY: 'test-key', GOOGLE_CSE_CX: 'test-cx' })).toBe('google_cse');
  });

  it('prioriza SERPER sobre BRAVE y Google CSE', () => {
    expect(detectSearchProvider({ 
      SERPER_API_KEY: 'serper-key',
      BRAVE_SEARCH_API_KEY: 'brave-key',
      GOOGLE_CSE_API_KEY: 'google-key',
      GOOGLE_CSE_CX: 'google-cx',
    })).toBe('serper');
  });

  it('prioriza BRAVE sobre Google CSE cuando SERPER no está configurado', () => {
    expect(detectSearchProvider({ 
      BRAVE_SEARCH_API_KEY: 'brave-key',
      GOOGLE_CSE_API_KEY: 'google-key',
      GOOGLE_CSE_CX: 'google-cx',
    })).toBe('brave');
  });

  it('no detecta proveedor cuando SERPER_API_KEY está vacío', () => {
    expect(detectSearchProvider({ SERPER_API_KEY: '   ' })).toBe(null);
  });

  it('no detecta proveedor cuando SERPER_API_KEY es string vacío', () => {
    expect(detectSearchProvider({ SERPER_API_KEY: '' })).toBe(null);
  });

  it('no detecta proveedor cuando no hay variables configuradas', () => {
    expect(detectSearchProvider({})).toBe(null);
  });

  it('no detecta Google CSE si falta GOOGLE_CSE_CX', () => {
    expect(detectSearchProvider({ GOOGLE_CSE_API_KEY: 'test-key' })).toBe(null);
  });

  it('no detecta Google CSE si GOOGLE_CSE_CX está vacío', () => {
    expect(detectSearchProvider({ GOOGLE_CSE_API_KEY: 'test-key', GOOGLE_CSE_CX: '   ' })).toBe(null);
  });
});
