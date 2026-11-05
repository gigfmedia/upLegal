// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createProspectingEngine } from './engine.mjs';

const BASE_SETTINGS = {
  enabled: true,
  dry_run: true,
  daily_target: 5,
  max_sends_per_run: 5,
  max_sends_per_day: 10,
  schedule_time: '10:00:00',
  timezone: 'America/Santiago',
  sender_name: 'Juan Guajardo | LegalUp',
  sender_email: 'juan@legalup.cl',
  reply_to: 'juan@legalup.cl',
  app_url: 'https://legalup.cl/pro',
};

const CANDIDATES = [
  {
    dedupe_key: 'email:juan@estudio.cl',
    email: 'juan@estudio.cl',
    contact_name: 'Juan Pérez',
    firm_name: 'Pérez & Asociados',
    website: 'https://estudio.cl',
    city: 'Santiago',
    specialties: ['Derecho laboral'],
    source: 'public_web:search',
    source_url: 'https://estudio.cl/equipo',
    validation_status: 'valid',
    status: 'validated',
    validated_at: '2026-11-04T03:00:00.000Z',
  },
  {
    dedupe_key: 'email:maria@otro.cl',
    email: 'maria@otro.cl',
    contact_name: 'María Soto',
    firm_name: 'Soto Abogados',
    website: 'https://otro.cl',
    city: 'Concepción',
    specialties: ['Derecho civil'],
    source: 'public_web:search',
    source_url: 'https://otro.cl',
    validation_status: 'valid',
    status: 'validated',
    validated_at: '2026-11-04T03:00:00.000Z',
  },
];

function createHarness({ settings = BASE_SETTINGS, todayCount = 0, mailerResult = { ok: true, id: 'resend-1', attempts: 1 }, discoveryResult = null } = {}) {
  const state = {
    settings: { ...settings },
    updates: [],
    sends: [],
    sendsCreated: [],
    claimed: [],
    results: [],
    contacted: [],
    failedProspects: [],
    released: [],
    mailerCalls: [],
    run: {
      id: 'run-1',
      run_key: 'manual:test',
      status: 'running',
      discovered: 0,
      inserted: 0,
      eligible: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      summary: {},
    },
  };

  const prospects = CANDIDATES.map((candidate, index) => ({
    ...candidate,
    id: `prospect-${index + 1}`,
    send_status: 'not_sent',
    campaign_count: 0,
  }));

  const repository = {
    async getSettings() { return state.settings; },
    async claimRun() { return { claimed: true, run: state.run, lock_token: 'lock-1' }; },
    async releaseLock(token) { state.released.push(token); },
    async updateRun(runId, patch) { Object.assign(state.run, patch); state.updates.push(patch); return state.run; },
    async getRun() { return state.run; },
    async listRuns() { return [state.run]; },
    async getLatestRun() { return state.run; },
    async recoverStaleRuns() { return { recovered: 0 }; },
    async filterNewCandidates(candidates) {
      return {
        inserted: candidates.map((candidate, index) => ({ ...candidate, id: `prospect-${index + 1}` })),
        accepted: candidates,
        rejected: [],
      };
    },
    async listEligibleForRun() { return prospects; },
    async createSend({ runId, prospect, subject, html, idempotencyKey }) {
      const send = {
        id: `send-${state.sends.length + 1}`,
        run_id: runId,
        prospect_id: prospect.id,
        to_email: prospect.email,
        subject,
        html,
        idempotency_key: idempotencyKey,
        status: 'queued',
        attempt: 0,
      };
      state.sends.push(send);
      state.sendsCreated.push(send);
      return { send, created: true };
    },
    async claimSend(sendId) {
      const send = state.sends.find((row) => row.id === sendId);
      if (!send) return null;
      state.claimed.push(sendId);
      return { ...send, attempt: send.attempt + 1 };
    },
    async markSendResult(sendId, patch) {
      const send = state.sends.find((row) => row.id === sendId);
      Object.assign(send, patch);
      state.results.push({ sendId, ...patch });
      return send;
    },
    async markProspectContacted(prospect) {
      state.contacted.push(prospect.id);
      return { ...prospect, status: 'contacted', send_status: 'sent' };
    },
    async markProspectFailed(prospectId) {
      state.failedProspects.push(prospectId);
      return { id: prospectId, status: 'failed', send_status: 'failed' };
    },
    async getTodaySendCount() { return todayCount; },
    async listRetryableSends() { return []; },
    async findProspect(id) { return prospects.find((prospect) => prospect.id === id) || null; },
    async getOverviewCounts() {
      return {
        total_prospects: prospects.length,
        pending_contact: 0,
        valid_today: prospects.length,
        sent_today: 0,
        delivered_today: 0,
        bounced_today: 0,
        complained_today: 0,
        failed_today: 0,
        suppressions: 0,
        month: { sent: 0, delivered: 0, bounced: 0, complained: 0 },
      };
    },
  };

  const discovery = {
    async discoverProspects() {
      return discoveryResult || { candidates: CANDIDATES, reason: null, stats: { provider: 'fake', pages: 2, discovered: 2 } };
    },
  };

  const mailer = {
    async sendProspectEmail(payload) {
      state.mailerCalls.push(payload);
      return mailerResult;
    },
  };

  const engine = createProspectingEngine({
    repository,
    discovery,
    mailer,
    env: { PROSPECTING_UNSUBSCRIBE_SECRET: 'unsubscribe-secret' },
    logger: { info() {}, warn() {}, error() {} },
    clock: () => new Date('2026-11-04T13:00:00.000Z'),
    sleep: async () => {},
  });

  return { engine, state, repository, prospects };
}

describe('prospecting engine', () => {
  it('dry-run no crea envíos ni marca prospectos', async () => {
    const { engine, state } = createHarness();
    const started = await engine.startRun({ trigger: 'manual', mode: 'dry_run', actorId: 'admin-1' });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.sends).toHaveLength(0);
    expect(state.mailerCalls).toHaveLength(0);
    expect(state.contacted).toHaveLength(0);
    expect(state.run.summary.simulated).toBe(2);
    expect(state.run.discovered).toBe(2);
    expect(state.run.inserted).toBe(2);
    expect(state.run.eligible).toBe(2);
    expect(state.released).toEqual(['lock-1']);
  });

  it('envío real usa idempotency key, CTA exacto, baja y marca contactado', async () => {
    const { engine, state } = createHarness({ settings: { ...BASE_SETTINGS, dry_run: false } });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true, actorId: 'admin-1' });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.mailerCalls).toHaveLength(2);
    expect(state.contacted).toEqual(['prospect-1', 'prospect-2']);
    expect(state.run.sent).toBe(2);
    const payload = state.mailerCalls[0];
    expect(payload.to).toBe('juan@estudio.cl');
    expect(payload.idempotencyKey).toBe('legalup-prospect-prospect-1');
    expect(payload.headers['List-Unsubscribe']).toContain('/api/prospecting/unsubscribe?token=');
    expect(payload.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(payload.html).toContain('Me gustaría que lo probaras y me dieras tu opinión directa sobre qué aporta y qué habría que mejorar.');
    expect(payload.html).toContain('https://legalup.cl/pro');
  });

  it('envío manual se bloquea mientras dry_run esté activo', async () => {
    const { engine, state } = createHarness();
    await expect(engine.startRun({ trigger: 'manual', mode: 'send', confirm: true }))
      .rejects.toThrow('dry_run_enabled');
    expect(state.mailerCalls).toHaveLength(0);
  });

  it('envío real exige confirmación explícita', async () => {
    const { engine } = createHarness();
    await expect(engine.startRun({ trigger: 'manual', mode: 'send' }))
      .rejects.toThrow('send_requires_confirmation');
  });

  it('no envía si se agotó el límite diario', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_day: 0 },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('skipped');
    expect(final.reason).toBe('daily_send_limit_reached');
    expect(state.sends).toHaveLength(0);
  });

  it('fallo permanente marca el prospecto como failed para no reintentarlo', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailerResult: { ok: false, id: null, attempts: 1, error: 'invalid_from', transient: false },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('failed');
    expect(state.failedProspects).toEqual(['prospect-1']);
    expect(state.results[0]).toMatchObject({ status: 'failed', transient: false, terminal: true });
  });

  it('fallo transitorio de Resend marca el envío como failed y no contacta', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailerResult: { ok: false, id: null, attempts: 3, error: 'timeout', transient: true },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('failed');
    expect(state.contacted).toHaveLength(0);
    expect(state.results[0]).toMatchObject({ status: 'failed', transient: true });
    expect(state.run.summary.failed_details[0]).toMatchObject({ email: 'juan@estudio.cl', transient: true });
  });

  it('cron también respeta la automatización desactivada', async () => {
    const { engine } = createHarness({ settings: { ...BASE_SETTINGS, enabled: false } });
    const started = await engine.startRun({ trigger: 'cron', mode: 'send' });
    expect(started).toMatchObject({ skipped: true, reason: 'automation_disabled' });
  });

  it('sin proveedor de búsqueda la corrida queda skipped, no inventa prospectos', async () => {
    const { engine, state } = createHarness({
      discoveryResult: { candidates: [], reason: 'discovery_provider_not_configured', stats: { provider: null } },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'dry_run' });
    const final = await started.execution;
    expect(final).toMatchObject({ status: 'skipped', reason: 'discovery_provider_not_configured' });
    expect(state.run.status).toBe('skipped');
    expect(state.run.summary.skip_reason).toBe('discovery_provider_not_configured');
  });

  it('corrida programada se omite si la automatización está desactivada', async () => {
    const { engine } = createHarness({ settings: { ...BASE_SETTINGS, enabled: false } });
    const result = await engine.startRun({ trigger: 'scheduled', mode: 'send' });
    expect(result).toMatchObject({ skipped: true, reason: 'automation_disabled' });
  });

  it('modo test envía solo al destinatario solicitado', async () => {
    const { engine, state } = createHarness();
    const started = await engine.startRun({ trigger: 'manual', mode: 'test', testRecipient: 'test@legalup.cl' });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.mailerCalls).toHaveLength(1);
    expect(state.mailerCalls[0].to).toBe('test@legalup.cl');
    expect(state.mailerCalls[0].subject.startsWith('[Prueba]')).toBe(true);
    expect(state.sends).toHaveLength(0);
  });
});
