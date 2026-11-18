// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createProspectingEngine } from './engine.mjs';
import { createProspectingMailer } from './mailerRuntime.mjs';

const BASE_SETTINGS = {
  enabled: true,
  dry_run: true,
  daily_target: 5,
  max_sends_per_run: 5,
  max_sends_per_day: 10,
  schedule_time: '10:00:00',
  timezone: 'America/Santiago',
  sender_name: 'Juan de Legalup',
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

function createHarness({
  settings = BASE_SETTINGS,
  todayCount = 0,
  ledgerReady = true,
  mailerResult = { ok: true, id: 'resend-1', attempts: 1 },
  discoveryResult = null,
  revalidateResult = { valid: true, rolled_over: false, day_key: '2026-11-04' },
  revalidateError = null,
  mailer: mailerOverride = null,
  eligibleProspects = null,
} = {}) {
  const state = {
    settings: { ...settings },
    order: [],
    revalidateCalls: [],
    updates: [],
    sends: [],
    sendsCreated: [],
    retryableSends: [],
    claimed: [],
    finalized: [],
    results: [],
    contacted: [],
    failedProspects: [],
    unknownProspects: [],
    skippedSends: [],
    attempts: new Map(),
    released: [],
    mailerCalls: [],
    eligibleCalls: [],
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
    async getCapacity() {
      const limit = Math.min(Number(settings.daily_target), Number(settings.max_sends_per_day));
      return {
        ledger_ready: ledgerReady,
        recovery_required: false,
        day_key: '2026-11-04',
        daily_target: settings.daily_target,
        max_sends_per_day: settings.max_sends_per_day,
        max_sends_per_run: settings.max_sends_per_run,
        limit,
        used: todayCount,
        remaining: Math.max(0, limit - todayCount),
      };
    },
    async filterNewCandidates(candidates) {
      return {
        inserted: candidates.map((candidate, index) => ({ ...candidate, id: `prospect-${index + 1}` })),
        accepted: candidates,
        rejected: [],
      };
    },
    async listEligibleForRun(runId, options) {
      state.eligibleCalls.push({ runId, options });
      return eligibleProspects || prospects;
    },
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
    async claimSendAttempt({ sendId }) {
      const send = state.sends.find((row) => row.id === sendId);
      if (!send) return { claimed: false, reason: 'send_not_found' };
      if (send.attempt >= 3) return { claimed: false, reason: 'attempts_exhausted' };
      state.claimed.push(sendId);
      state.order.push('claim');
      const attemptId = `attempt-${state.claimed.length}`;
      state.attempts.set(attemptId, send);
      return { claimed: true, attempt_id: attemptId, attempt_no: send.attempt + 1 };
    },
    async revalidateAttemptDay({ attemptId }) {
      state.revalidateCalls.push({ attemptId });
      state.order.push('revalidate');
      if (revalidateError) throw revalidateError;
      return revalidateResult;
    },
    async finalizeSendAttempt(args) {
      const send = state.attempts.get(args.attemptId);
      state.order.push('finalize');
      if (!send) return { finalized: false, reason: 'attempt_not_found' };
      state.finalized.push(args);
      if (args.providerContacted) send.attempt += 1;
      const terminal = args.outcome !== 'released' || !args.transient;
      const status = args.outcome === 'sent' ? 'sent' : args.outcome === 'unknown' ? 'unknown' : 'failed';
      send.status = status;
      send.last_error = args.error || null;
      send.last_error_transient = Boolean(args.transient);
      state.results.push({
        sendId: send.id,
        status,
        transient: Boolean(args.transient),
        terminal,
      });
      if (args.outcome === 'sent') {
        state.contacted.push(send.prospect_id);
      } else if (args.outcome === 'unknown') {
        state.unknownProspects.push(send.prospect_id);
      } else if (terminal) {
        state.failedProspects.push(send.prospect_id);
      }
      return { finalized: true, outcome: args.outcome, terminal };
    },
    async markSendSkipped(sendId, reason) {
      state.skippedSends.push({ sendId, reason });
    },
    async listRetryableSends() {
      return state.retryableSends.filter((send) => (
        send.status === 'failed' && send.last_error_transient && send.attempt < 3
      ));
    },
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

  const mailer = mailerOverride || {
    async sendProspectEmail(payload) {
      state.mailerCalls.push(payload);
      state.order.push('mailer');
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

  it('daily_target es tope estricto de elegibles y envíos', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, daily_target: 1, max_sends_per_run: 5, max_sends_per_day: 10 },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true, actorId: 'admin-1' });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.eligibleCalls[0].options).toMatchObject({ limit: 1 });
    expect(state.run.summary.limits).toMatchObject({ daily_target: 1, target_remaining: 1, planned: 1 });
    expect(state.mailerCalls).toHaveLength(1);
    expect(state.contacted).toEqual(['prospect-1']);
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

  it('revalida el claim inmediatamente antes del proveedor', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true, actorId: 'admin-1' });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.revalidateCalls).toEqual([{ attemptId: 'attempt-1' }]);
    expect(state.order.slice(0, 4)).toEqual(['claim', 'revalidate', 'mailer', 'finalize']);
    expect(state.finalized[0]).toMatchObject({ outcome: 'sent' });
  });

  it('continúa el envío cuando la revalidación cruza medianoche', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      revalidateResult: { valid: true, rolled_over: true, day_key: '2026-11-05' },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.mailerCalls).toHaveLength(1);
    expect(state.run.summary.notes).toContain('send_revalidation_day_rollover');
  });

  it('no envía si el prospecto fue bloqueado después del claim', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      revalidateResult: { valid: false, reason: 'prospect_blocked', status: 'unsubscribed' },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(final.skipped).toBe(1);
    expect(state.mailerCalls).toHaveLength(0);
    expect(state.finalized).toHaveLength(0);
    expect(state.run.summary.notes).toContain('send_revalidation_prospect_blocked');
  });

  it('no envía si el prospecto fue suprimido después del claim', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      revalidateResult: { valid: false, reason: 'suppressed' },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.mailerCalls).toHaveLength(0);
    expect(state.finalized).toHaveLength(0);
    expect(state.run.summary.notes).toContain('send_revalidation_suppressed');
  });

  it('falla cerrado y libera la reserva si la revalidación no responde', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      revalidateError: new Error('rpc_timeout'),
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('failed');
    expect(state.mailerCalls).toHaveLength(0);
    expect(state.finalized).toEqual([expect.objectContaining({
      outcome: 'released',
      transient: true,
      providerContacted: false,
      releaseReason: 'revalidation_failed',
    })]);
    expect(state.run.summary.notes).toContain('send_revalidation_failed');
  });

  it('falla cerrado si la revalidación devuelve un contrato inválido', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      revalidateResult: {},
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('failed');
    expect(state.mailerCalls).toHaveLength(0);
    expect(state.finalized[0]).toMatchObject({ outcome: 'released', providerContacted: false });
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

  it('no envía si el ledger no está listo', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false },
      ledgerReady: false,
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final).toMatchObject({ status: 'skipped', reason: 'ledger_not_ready' });
    expect(state.sends).toHaveLength(0);
    expect(state.mailerCalls).toHaveLength(0);
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

  it('fallo transitorio no ambiguo de Resend marca el envío como failed y no contacta', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailerResult: { ok: false, id: null, attempts: 1, error: 'rate_limit', transient: true, ambiguous: false },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('failed');
    expect(state.contacted).toHaveLength(0);
    expect(state.results[0]).toMatchObject({ status: 'failed', transient: true });
    expect(state.run.summary.failed_details[0]).toMatchObject({ email: 'juan@estudio.cl', transient: true });
  });

  it('429/425 explícitos se contabilizan como intento sin marcarlos ambiguos', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailerResult: {
        ok: false,
        id: null,
        attempts: 1,
        error: 'rate_limit',
        transient: true,
        ambiguous: false,
        definitiveRejection: true,
      },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('failed');
    expect(state.unknownProspects).toHaveLength(0);
    expect(state.finalized[0]).toMatchObject({
      outcome: 'released',
      transient: true,
      definitiveRejection: true,
      providerContacted: true,
      releaseReason: 'provider_rejected',
    });
  });

  it.each([429, 425])('tres claims con %i hacen tres llamadas HTTP y bloquean el cuarto claim', async (status) => {
    const resendSend = vi.fn(async () => {
      throw Object.assign(new Error('rate limit'), { statusCode: status });
    });
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 4 },
      mailer: createProspectingMailer({ resend: { emails: { send: resendSend } } }),
    });
    const retrySend = {
      id: 'retry-send-1',
      run_id: 'run-1',
      prospect_id: 'prospect-1',
      to_email: 'juan@estudio.cl',
      subject: 'Contacto LegalUp',
      html: '<p>Hola</p>',
      idempotency_key: 'legalup-prospect-1',
      status: 'failed',
      last_error_transient: true,
      attempt: 0,
    };
    state.sends.push(retrySend);
    state.retryableSends.push(retrySend, retrySend, retrySend, retrySend);

    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    await started.execution;

    expect(resendSend).toHaveBeenCalledTimes(3);
    expect(state.claimed).toHaveLength(3);
    expect(state.finalized).toHaveLength(3);
    expect(state.finalized.every((entry) => (
      entry.providerContacted === true && entry.definitiveRejection === true
    ))).toBe(true);
    expect(retrySend.attempt).toBe(3);
    expect(state.run.summary.notes).toContain('send_claim_attempts_exhausted');
  });

  it('un claim con 429 llama al mailer una sola vez', async () => {
    const resendSend = vi.fn(async () => {
      throw Object.assign(new Error('rate limit'), { statusCode: 429 });
    });
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailer: createProspectingMailer({ resend: { emails: { send: resendSend } } }),
    });
    const retrySend = {
      id: 'retry-send-1',
      run_id: 'run-1',
      prospect_id: 'prospect-1',
      to_email: 'juan@estudio.cl',
      subject: 'Contacto LegalUp',
      html: '<p>Hola</p>',
      idempotency_key: 'legalup-prospect-1',
      status: 'failed',
      last_error_transient: true,
      attempt: 0,
    };
    state.sends.push(retrySend);
    state.retryableSends.push(retrySend);

    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    await started.execution;

    expect(resendSend).toHaveBeenCalledTimes(1);
    expect(state.claimed).toHaveLength(1);
  });

  it('un resultado ambiguo no se reintenta en la misma ejecución ni en una corrida posterior', async () => {
    const resendSend = vi.fn(async () => {
      throw Object.assign(new Error('upstream failed'), { statusCode: 500 });
    });
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailer: createProspectingMailer({ resend: { emails: { send: resendSend } } }),
      eligibleProspects: [],
    });
    const retrySend = {
      id: 'retry-send-1',
      run_id: 'run-1',
      prospect_id: 'prospect-1',
      to_email: 'juan@estudio.cl',
      subject: 'Contacto LegalUp',
      html: '<p>Hola</p>',
      idempotency_key: 'legalup-prospect-1',
      status: 'failed',
      last_error_transient: true,
      attempt: 0,
    };
    state.sends.push(retrySend);
    state.retryableSends.push(retrySend);

    const first = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const firstFinal = await first.execution;
    expect(firstFinal.unknown).toBe(1);
    expect(resendSend).toHaveBeenCalledTimes(1);
    expect(retrySend).toMatchObject({ status: 'unknown', attempt: 1 });

    const second = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    await second.execution;
    expect(resendSend).toHaveBeenCalledTimes(1);
    expect(state.claimed).toHaveLength(1);
  });

  it('error ambiguo de Resend marca el envío y el prospecto como unknown, sin failed ni reintento', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: false, max_sends_per_run: 1 },
      mailerResult: { ok: false, id: null, attempts: 1, error: 'timeout', transient: true, ambiguous: true },
    });
    const started = await engine.startRun({ trigger: 'manual', mode: 'send', confirm: true });
    const final = await started.execution;
    expect(final.status).toBe('partial');
    expect(final.unknown).toBe(1);
    expect(state.contacted).toHaveLength(0);
    expect(state.failedProspects).toHaveLength(0);
    expect(state.unknownProspects).toEqual(['prospect-1']);
    expect(state.results[0]).toMatchObject({ status: 'unknown', terminal: true });
    expect(state.run.summary.ambiguous_details[0]).toMatchObject({ email: 'juan@estudio.cl', error: 'timeout' });
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

  it('modo test se bloquea mientras dry_run esté activo', async () => {
    const { engine, state } = createHarness({
      settings: { ...BASE_SETTINGS, dry_run: true, enabled: false },
    });
    await expect(engine.startRun({ trigger: 'manual', mode: 'test', testRecipient: 'test@legalup.cl' }))
      .rejects.toThrow('dry_run_enabled');
    expect(state.mailerCalls).toHaveLength(0);
  });

  it('sendTestEmail directo se bloquea con dry_run activo', async () => {
    const { engine, state } = createHarness();
    await expect(engine.sendTestEmail({
      run: state.run,
      settings: state.settings,
      testRecipient: 'test@legalup.cl',
      summary: {},
    })).rejects.toThrow('dry_run_enabled');
    expect(state.mailerCalls).toHaveLength(0);
  });

  it('executeRun directo no envía con dry_run activo', async () => {
    const { engine, state } = createHarness();
    const final = await engine.executeRun({
      run: state.run,
      lockToken: 'lock-1',
      settings: state.settings,
      trigger: 'manual',
      mode: 'send',
      actorId: 'admin-1',
      confirm: true,
      testRecipient: null,
    });
    expect(final).toMatchObject({ status: 'failed', error: 'dry_run_enabled' });
    expect(state.mailerCalls).toHaveLength(0);
    expect(state.sends).toHaveLength(0);
    expect(state.released).toEqual(['lock-1']);
  });

  it('modo test envía solo al destinatario solicitado cuando está permitido', async () => {
    const { engine, state } = createHarness({ settings: { ...BASE_SETTINGS, dry_run: false } });
    const started = await engine.startRun({ trigger: 'manual', mode: 'test', testRecipient: 'test@legalup.cl' });
    const final = await started.execution;
    expect(final.status).toBe('succeeded');
    expect(state.mailerCalls).toHaveLength(1);
    expect(state.mailerCalls[0].to).toBe('test@legalup.cl');
    expect(state.mailerCalls[0].subject.startsWith('[Prueba]')).toBe(true);
    expect(state.sends).toHaveLength(0);
  });
});
