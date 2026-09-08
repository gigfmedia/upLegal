// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { cancelMpPreapproval, reconcileMpPreapprovalStatus } from './cancelSubscription.mjs';

function mockFetchOnce(response) {
  return vi.fn(async () => ({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  }));
}
function mockFetchThrows(error) {
  return vi.fn(async () => { throw error; });
}

describe('FASE 2B — cancelMpPreapproval', () => {
  it('success 200 → ok true', async () => {
    const f = mockFetchOnce({ ok: true, status: 200, body: { id: '1', status: 'cancelled' } });
    const r = await cancelMpPreapproval({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toContain('/preapproval/1');
  });

  it('503 → ok false, not alreadyCancelled', async () => {
    const f = mockFetchOnce({ ok: false, status: 503, body: { error: 'temp' } });
    const r = await cancelMpPreapproval({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
    expect(r.alreadyCancelledHint).toBeUndefined();
  });

  it('network error → networkError true', async () => {
    const f = mockFetchThrows(new Error('fetch failed'));
    const r = await cancelMpPreapproval({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.ok).toBe(false);
    expect(r.networkError).toBe(true);
  });

  it('already cancelled hint via message → alreadyCancelledHint true', async () => {
    const f = mockFetchOnce({ ok: false, status: 400, body: { message: 'already cancelled' } });
    const r = await cancelMpPreapproval({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.ok).toBe(false);
    expect(r.alreadyCancelledHint).toBe(true);
  });

  it('already cancelled via status cancelled → ok true', async () => {
    const f = mockFetchOnce({ ok: false, status: 400, body: { status: 'cancelled' } });
    const r = await cancelMpPreapproval({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.ok).toBe(true);
    expect(r.alreadyCancelled).toBe(true);
  });
});

describe('FASE 2B — reconcileMpPreapprovalStatus', () => {
  it('GET cancelled → cancelled true', async () => {
    const f = mockFetchOnce({ ok: true, status: 200, body: { status: 'cancelled' } });
    const r = await reconcileMpPreapprovalStatus({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.cancelled).toBe(true);
  });
  it('GET active → cancelled false', async () => {
    const f = mockFetchOnce({ ok: true, status: 200, body: { status: 'authorized' } });
    const r = await reconcileMpPreapprovalStatus({ preapprovalId: '1', accessToken: 'tok', fetchImpl: f });
    expect(r.cancelled).toBe(false);
  });
});

// Integration: full cancel flow semantics (AI/Pro share same helper, test once with fake handler)
describe('FASE 2B — handler semantics (DB state)', () => {
  function makeHandler({ fetchImpl, initialStatus = 'active', preapprovalId = 'pre_1' }) {
    let dbStatus = initialStatus;
    let dbCancelledAt = null;
    const supabase = {
      from: () => ({
        update: (payload) => ({ eq: async () => { dbStatus = payload.status; dbCancelledAt = payload.cancelled_at || null; return { error: null }; } }),
      }),
    };
    async function cancel() {
      if (dbStatus === 'cancelled') return { success: true, already_cancelled: true, dbStatus };
      if (dbStatus !== 'active') return { error: 'NOT_ACTIVE', dbStatus };
      if (preapprovalId) {
        const mpResult = await cancelMpPreapproval({ preapprovalId, accessToken: 'tok', fetchImpl });
        if (!mpResult.ok) {
          if (mpResult.alreadyCancelledHint) {
            const recon = await reconcileMpPreapprovalStatus({ preapprovalId, accessToken: 'tok', fetchImpl });
            if (!recon.cancelled) return { error: 'PROVIDER_ERROR', dbStatus };
          } else {
            return { error: mpResult.networkError ? 'PROVIDER_UNREACHABLE' : 'PROVIDER_ERROR', dbStatus };
          }
        }
      }
      dbStatus = 'cancelled';
      return { success: true, dbStatus };
    }
    return { cancel, getDbStatus: () => dbStatus };
  }

  it('AI — MP success → DB cancelled, 200', async () => {
    const f = mockFetchOnce({ ok: true, status: 200, body: { status: 'cancelled' } });
    const h = makeHandler({ fetchImpl: f, initialStatus: 'active' });
    const r = await h.cancel();
    expect(r.success).toBe(true);
    expect(h.getDbStatus()).toBe('cancelled');
  });
  it('AI — MP 503 → DB sigue active, permite retry', async () => {
    const f = mockFetchOnce({ ok: false, status: 503, body: {} });
    const h = makeHandler({ fetchImpl: f, initialStatus: 'active' });
    const r = await h.cancel();
    expect(r.error).toBe('PROVIDER_ERROR');
    expect(h.getDbStatus()).toBe('active');
  });
  it('AI — network error → DB active', async () => {
    const f = mockFetchThrows(new Error('net'));
    const h = makeHandler({ fetchImpl: f, initialStatus: 'active' });
    const r = await h.cancel();
    expect(r.error).toBe('PROVIDER_UNREACHABLE');
    expect(h.getDbStatus()).toBe('active');
  });
  it('AI — retry: 1st 503, 2nd success → 2 llamadas MP, final cancelled', async () => {
    const f1 = mockFetchOnce({ ok: false, status: 503, body: {} });
    const f2 = mockFetchOnce({ ok: true, status: 200, body: { status: 'cancelled' } });
    const h1 = makeHandler({ fetchImpl: f1, initialStatus: 'active' });
    const r1 = await h1.cancel();
    expect(r1.error).toBe('PROVIDER_ERROR');
    expect(h1.getDbStatus()).toBe('active');
    // retry with new fetch mock, same DB object would be fresh fetch in real handler
    const h2 = makeHandler({ fetchImpl: f2, initialStatus: 'active' });
    const r2 = await h2.cancel();
    expect(r2.success).toBe(true);
    expect(h2.getDbStatus()).toBe('cancelled');
  });
  it('AI — already cancelled → idempotente success', async () => {
    const f = vi.fn();
    const h = makeHandler({ fetchImpl: f, initialStatus: 'cancelled' });
    const r = await h.cancel();
    expect(r.success).toBe(true);
    expect(r.already_cancelled).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
  it('Pro — same semantics (helper shared)', async () => {
    const f = mockFetchOnce({ ok: true, status: 200, body: { status: 'cancelled' } });
    const h = makeHandler({ fetchImpl: f, initialStatus: 'active' });
    const r = await h.cancel();
    expect(r.success).toBe(true);
  });
  it('Pro — 503 no marca cancelled', async () => {
    const f = mockFetchOnce({ ok: false, status: 503, body: {} });
    const h = makeHandler({ fetchImpl: f, initialStatus: 'active' });
    const r = await h.cancel();
    expect(r.error).toBe('PROVIDER_ERROR');
    expect(h.getDbStatus()).toBe('active');
  });
  it('Pro — already cancelled idempotente', async () => {
    const h = makeHandler({ fetchImpl: vi.fn(), initialStatus: 'cancelled' });
    const r = await h.cancel();
    expect(r.success).toBe(true);
  });
});
