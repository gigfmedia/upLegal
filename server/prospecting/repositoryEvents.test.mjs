// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createProspectingRepository } from './repository.mjs';

function createFakeSupabase(result = {}) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: { ...result }, error: null };
    },
    from() {
      throw new Error('unexpected table access');
    },
  };
}

function repositoryFor(supabase) {
  return createProspectingRepository({
    supabase,
    logger: { error() {}, warn() {} },
  });
}

describe('prospecting provider events', () => {
  it('ingiere eventos a través del RPC atómico del ledger', async () => {
    const supabase = createFakeSupabase({ processed: true, applied: true, status: 'bounced' });
    const repository = repositoryFor(supabase);

    const result = await repository.ingestProviderEvent({
      providerEventId: 'msg_1',
      eventType: 'email.bounced',
      providerMessageId: 're_1',
      email: 'juan@estudio.cl',
      payload: { type: 'email.bounced' },
      now: '2026-11-04T12:00:00.000Z',
    });

    expect(result).toMatchObject({ processed: true, applied: true, status: 'bounced' });
    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_ingest_provider_event',
      args: {
        p_provider_event_id: 'msg_1',
        p_event_type: 'email.bounced',
        p_provider_message_id: 're_1',
        p_email: 'juan@estudio.cl',
        p_now: '2026-11-04T12:00:00.000Z',
      },
    });
  });

  it('expone la aplicación idempotente por id de evento', async () => {
    const supabase = createFakeSupabase({ processed: true, duplicate: true });
    const repository = repositoryFor(supabase);

    const result = await repository.applyProviderEvent({
      eventId: 'event-1',
      historical: true,
      now: '2026-11-04T12:00:00.000Z',
    });

    expect(result).toMatchObject({ processed: true, duplicate: true });
    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_apply_provider_event',
      args: {
        p_event_id: 'event-1',
        p_historical: true,
        p_now: '2026-11-04T12:00:00.000Z',
      },
    });
  });

  it('expone la revalidación del intento a través del ledger', async () => {
    const supabase = createFakeSupabase({ valid: true, rolled_over: true, day_key: '2026-11-05' });
    const repository = repositoryFor(supabase);

    const result = await repository.revalidateAttemptDay({ attemptId: 'attempt-1' });

    expect(result).toMatchObject({ valid: true, rolled_over: true });
    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_revalidate_attempt_day',
      args: { p_attempt_id: 'attempt-1' },
    });
  });

  it('reprocesa eventos pendientes sin tocar tablas directamente', async () => {
    const supabase = createFakeSupabase({ processed: 3, deferred: 1 });
    const repository = repositoryFor(supabase);

    const result = await repository.reprocessProviderEvents(50, '2026-11-04T12:00:00.000Z');

    expect(result).toMatchObject({ processed: 3, deferred: 1 });
    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_reprocess_provider_events',
      args: { p_limit: 50, p_now: '2026-11-04T12:00:00.000Z' },
    });
  });
});
