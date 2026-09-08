// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

function indexOfRoute(method, path) {
  return src.indexOf(`${method}('${path}'`);
}

describe('FASE 3E — admin empresas route precedence', () => {
  it('static /metrics before dynamic /:id', () => {
    const staticIdx = indexOfRoute('app.get', '/api/admin/empresas/metrics');
    const dynamicIdx = indexOfRoute('app.get', '/api/admin/empresas/:id');
    expect(staticIdx).toBeGreaterThan(-1);
    expect(dynamicIdx).toBeGreaterThan(-1);
    expect(staticIdx).toBeLessThan(dynamicIdx);
  });
  it('static /requests before dynamic /:id', () => {
    const staticIdx = indexOfRoute('app.get', '/api/admin/empresas/requests');
    const dynamicIdx = indexOfRoute('app.get', '/api/admin/empresas/:id');
    expect(staticIdx).toBeLessThan(dynamicIdx);
  });
  it('static routes keep requireAdmin', () => {
    expect(src.includes("app.get('/api/admin/empresas/metrics', requireAdmin")).toBe(true);
    expect(src.includes("app.get('/api/admin/empresas/requests', requireAdmin")).toBe(true);
  });
  it('dynamic detail still exists after static', () => {
    expect(src.includes("app.get('/api/admin/empresas/:id', requireAdmin")).toBe(true);
  });
  it('requests/metrics would have been shadowed before fix (documenting bug)', () => {
    // This test documents the bug: before fix, dynamic had lower index
    // Now it must be higher, so this passes
    const metricsIdx = indexOfRoute('app.get', '/api/admin/empresas/metrics');
    const requestsIdx = indexOfRoute('app.get', '/api/admin/empresas/requests');
    const idIdx = indexOfRoute('app.get', '/api/admin/empresas/:id');
    expect(metricsIdx < idIdx && requestsIdx < idIdx).toBe(true);
  });
});
