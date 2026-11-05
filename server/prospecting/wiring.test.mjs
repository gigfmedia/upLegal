// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');

describe('prospecting server wiring', () => {
  it('registra el webhook de Resend con body crudo antes de express.json', () => {
    const raw = src.indexOf("app.post('/api/webhooks/resend', express.raw");
    const json = src.indexOf('app.use(express.json');
    expect(raw).toBeGreaterThan(-1);
    expect(json).toBeGreaterThan(-1);
    expect(raw).toBeLessThan(json);
  });

  it('protege el panel admin con requireAdmin', () => {
    expect(src.includes("const PROSPECTING_ADMIN_MOUNT = '/api/admin/prospecting';")).toBe(true);
    expect(src.includes('app.use(PROSPECTING_ADMIN_MOUNT, requireAdmin, prospecting.adminRouter)')).toBe(true);
  });

  it('expone baja pública y cron con secreto', () => {
    expect(src.includes("app.use('/api/prospecting', prospecting.publicRouter)")).toBe(true);
    expect(src.includes("app.post('/api/cron/prospecting', prospecting.cronHandler)")).toBe(true);
  });

  it('no arranca el scheduler en tests', () => {
    const idx = src.indexOf('prospecting.startScheduler();');
    expect(idx).toBeGreaterThan(-1);
    const before = src.slice(Math.max(0, idx - 200), idx);
    expect(before).toContain('if (!runningInTestMode)');
  });

  it('mantiene el error handler global después del de prospección', () => {
    const prospectingHandler = src.indexOf('return prospecting.errorHandler(error, req, res, next);');
    const globalHandler = src.indexOf("console.error('Server error:', error);");
    expect(prospectingHandler).toBeGreaterThan(-1);
    expect(globalHandler).toBeGreaterThan(prospectingHandler);
  });
});
