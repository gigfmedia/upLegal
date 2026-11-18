// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createProspectingLedger } from './ledger.mjs';

function fakeSupabase({ data = { ok: true }, error = null } = {}) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args });
      return { data, error };
    },
  };
}

function ledgerFor(supabase) {
  return createProspectingLedger({
    supabase,
    logger: { error() {} },
  });
}

describe('prospecting ledger client', () => {
  it('mapea capacity y claim al contrato SQL', async () => {
    const supabase = fakeSupabase({ data: { claimed: true, attempt_id: 'attempt-1' } });
    const ledger = ledgerFor(supabase);

    await ledger.getCapacity({ now: '2026-11-04T12:00:00.000Z' });
    await ledger.claimSendAttempt({ sendId: 'send-1', runId: 'run-1' });

    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_get_capacity',
      args: { p_now: '2026-11-04T12:00:00.000Z' },
    });
    expect(supabase.calls[1]).toMatchObject({
      name: 'prospecting_claim_send_attempt',
      args: { p_send_id: 'send-1', p_run_id: 'run-1' },
    });
  });

  it('mapea la revalidación del intento al contrato SQL', async () => {
    const supabase = fakeSupabase({ data: { valid: true, rolled_over: false } });
    const ledger = ledgerFor(supabase);

    await ledger.revalidateAttemptDay({ attemptId: 'attempt-1' });

    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_revalidate_attempt_day',
      args: { p_attempt_id: 'attempt-1' },
    });
  });

  it('normaliza respuestas en arreglo', async () => {
    const supabase = fakeSupabase({ data: [{ processed: true }] });
    const ledger = ledgerFor(supabase);
    await expect(ledger.reprocessProviderEvents({ limit: 10 })).resolves.toEqual({ processed: true });
  });

  it('envuelve errores RPC con nombre y causa', async () => {
    const supabase = fakeSupabase({ error: new Error('boom') });
    const ledger = ledgerFor(supabase);
    await expect(ledger.finalizeSendAttempt({
      attemptId: 'attempt-1',
      outcome: 'sent',
      providerMessageId: 're_1',
    })).rejects.toThrow('prospecting_ledger_rpc_failed:prospecting_finalize_send_attempt:boom');
  });

  it('recovery nunca habilita el ledger por defecto', async () => {
    const supabase = fakeSupabase({ data: { recovered: 1 } });
    const ledger = ledgerFor(supabase);
    await ledger.recoverStale({ now: '2026-11-04T12:00:00.000Z' });
    expect(supabase.calls[0]).toMatchObject({
      name: 'prospecting_recover_stale',
      args: { p_now: '2026-11-04T12:00:00.000Z', p_mark_ready: false },
    });
  });
});
