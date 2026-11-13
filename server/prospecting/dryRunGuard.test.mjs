// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createProspectingModule } from './index.mjs';

const BASE_SETTINGS = {
  enabled: false,
  dry_run: true,
  schedule_time: '10:00:00',
  timezone: 'America/Santiago',
  sender_name: 'Juan de Legalup',
  sender_email: 'juan@legalup.cl',
  reply_to: 'juan@legalup.cl',
  app_url: 'https://legalup.cl/pro',
};

function createModule({ settings, resendSend = vi.fn(async () => ({ data: { id: 'resend-test' } })) } = {}) {
  const module = createProspectingModule({
    supabase: {},
    resend: { emails: { send: resendSend } },
    requireAdminMiddleware: (req, res, next) => next(),
    env: { PROSPECTING_UNSUBSCRIBE_SECRET: 'unsubscribe-secret' },
    logger: { info() {}, warn() {}, error() {} },
    clock: () => new Date('2026-11-04T13:00:00.000Z'),
    sleep: async () => {},
  });
  module.repository.getSettings = vi.fn(async () => settings);
  return { module, resendSend };
}

async function startApp(module) {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/prospecting', module.adminRouter);
  app.use(module.errorHandler);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function postJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('prospecting dry_run guard', () => {
  it('bloquea POST /test-email cuando dry_run está activo', async () => {
    const { module, resendSend } = createModule({ settings: { ...BASE_SETTINGS, dry_run: true } });
    const app = await startApp(module);
    try {
      const response = await postJson(app.baseUrl, '/api/admin/prospecting/test-email', { to: 'test@legalup.cl' });
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('dry_run_enabled');
      expect(resendSend).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('bloquea POST /run con mode=test cuando dry_run está activo', async () => {
    const { module, resendSend } = createModule({ settings: { ...BASE_SETTINGS, dry_run: true } });
    const app = await startApp(module);
    try {
      const response = await postJson(app.baseUrl, '/api/admin/prospecting/run', {
        mode: 'test',
        test_recipient: 'test@legalup.cl',
      });
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('dry_run_enabled');
      expect(resendSend).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('permite el envío de prueba cuando dry_run está desactivado', async () => {
    const { module, resendSend } = createModule({ settings: { ...BASE_SETTINGS, dry_run: false } });
    module.repository.claimRun = vi.fn(async () => ({
      claimed: true,
      lock_token: 'lock-1',
      run: { id: 'run-1', run_key: 'test:run-1', status: 'running', summary: {} },
    }));
    module.repository.releaseLock = vi.fn(async () => {});
    module.repository.updateRun = vi.fn(async (runId, patch) => ({ id: runId, ...patch }));
    const app = await startApp(module);
    try {
      const response = await postJson(app.baseUrl, '/api/admin/prospecting/test-email', { to: 'test@legalup.cl' });
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('succeeded');
      expect(resendSend).toHaveBeenCalledOnce();
      expect(resendSend.mock.calls[0][0].to).toEqual(['test@legalup.cl']);
    } finally {
      await app.close();
    }
  });
});
