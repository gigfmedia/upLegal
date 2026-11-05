// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createProspectingModule } from './index.mjs';

const SECRET = 'cron-secret-for-tests';

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function createReq({ secret, headers = {} } = {}) {
  return {
    headers,
    get(name) {
      const lower = String(name).toLowerCase();
      if (lower === 'x-cron-secret') return secret || headers['x-cron-secret'] || null;
      if (lower === 'authorization') return headers.authorization || null;
      return headers[lower] || null;
    },
  };
}

function createModule({ now, settings }) {
  const module = createProspectingModule({
    supabase: {},
    resend: null,
    env: { PROSPECTING_CRON_SECRET: SECRET },
    clock: () => now,
    logger: { info() {}, warn() {}, error() {} },
  });
  module.repository.getSettings = vi.fn(async () => settings);
  module.engine.startRun = vi.fn(async () => ({
    skipped: false,
    run: { id: 'run-1' },
    execution: Promise.resolve({ run_id: 'run-1', status: 'succeeded' }),
  }));
  return module;
}

const settings = {
  enabled: true,
  dry_run: true,
  schedule_time: '10:00:00',
  timezone: 'America/Santiago',
};

async function invoke(module, req) {
  const res = createRes();
  let caught = null;
  await module.cronHandler(req, res, (error) => { caught = error; });
  if (caught) module.errorHandler(caught, { path: '/api/cron/prospecting' }, res, () => {});
  return res;
}

describe('prospecting cron handler', () => {
  it('rechaza si falta el secreto configurado', async () => {
    const module = createProspectingModule({
      supabase: {},
      resend: null,
      env: {},
      clock: () => new Date('2026-01-15T13:00:00Z'),
      logger: { info() {}, warn() {}, error() {} },
    });
    const res = await invoke(module, createReq({ secret: SECRET }));
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('cron_secret_not_configured');
  });

  it('rechaza secretos incorrectos', async () => {
    const module = createModule({ now: new Date('2026-01-15T13:00:00Z'), settings });
    const res = await invoke(module, createReq({ secret: 'otro' }));
    expect(res.statusCode).toBe(401);
    expect(module.engine.startRun).not.toHaveBeenCalled();
  });

  it('acepta x-cron-secret y Authorization Bearer', async () => {
    for (const req of [
      createReq({ secret: SECRET }),
      createReq({ headers: { authorization: `Bearer ${SECRET}` } }),
    ]) {
      const module = createModule({ now: new Date('2026-01-15T13:00:00Z'), settings });
      const res = await invoke(module, req);
      expect(res.statusCode).toBe(202);
      expect(module.engine.startRun).toHaveBeenCalledWith({ trigger: 'cron', mode: 'send', actorId: null });
    }
  });

  it('no ejecuta si la automatización está desactivada', async () => {
    const module = createModule({ now: new Date('2026-01-15T13:00:00Z'), settings: { ...settings, enabled: false } });
    const res = await invoke(module, createReq({ secret: SECRET }));
    expect(res.body).toMatchObject({ skipped: true, reason: 'automation_disabled' });
    expect(module.engine.startRun).not.toHaveBeenCalled();
  });

  it('respeta 10:00 America/Santiago en horario de verano (UTC-3)', async () => {
    const before = createModule({ now: new Date('2026-01-15T12:59:00Z'), settings });
    expect((await invoke(before, createReq({ secret: SECRET }))).body).toMatchObject({ skipped: true, reason: 'not_due' });
    expect(before.engine.startRun).not.toHaveBeenCalled();

    const atTime = createModule({ now: new Date('2026-01-15T13:00:00Z'), settings });
    expect((await invoke(atTime, createReq({ secret: SECRET }))).statusCode).toBe(202);
    expect(atTime.engine.startRun).toHaveBeenCalledTimes(1);
  });

  it('respeta 10:00 America/Santiago en horario de invierno (UTC-4)', async () => {
    const before = createModule({ now: new Date('2026-07-15T13:59:00Z'), settings });
    expect((await invoke(before, createReq({ secret: SECRET }))).body).toMatchObject({ skipped: true, reason: 'not_due' });
    expect(before.engine.startRun).not.toHaveBeenCalled();

    const atTime = createModule({ now: new Date('2026-07-15T14:00:00Z'), settings });
    expect((await invoke(atTime, createReq({ secret: SECRET }))).statusCode).toBe(202);
    expect(atTime.engine.startRun).toHaveBeenCalledTimes(1);
  });
});
