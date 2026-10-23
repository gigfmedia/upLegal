// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { once } from 'node:events';
import { dispatchSubscriptionWebhook, normalizeProviderResourceId } from './subscriptionWebhook.mjs';
import { sendWebhookResponse } from './webhookResponse.mjs';
import { fetchProviderResource, providerFetchFailureResult } from './providerFetch.mjs';
import { processProAuthorizedPaymentEvent } from './proPaymentEvent.mjs';

function response(status, body = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function createMockSupabase() {
  const inserts = [];
  const updates = [];
  const rpcCalls = [];
  const completed = [];
  const claimed = new Set();
  const ledgerIds = new Set();

  const updateChain = () => {
    const chain = {
      eq: () => chain,
      then: (resolve, reject) => Promise.resolve({ error: null }).then(resolve, reject),
    };
    return chain;
  };

  const selectChain = (table, opts) => {
    const chain = {
      eq: () => chain,
      like: () => chain,
      order: () => chain,
      limit: () => chain,
      or: () => Promise.resolve({ count: 1, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve, reject) => Promise.resolve({
        data: [],
        count: opts?.head ? 1 : null,
        error: null,
      }).then(resolve, reject),
    };
    return chain;
  };

  const supabase = {
    from(table) {
      return {
        insert(row) {
          inserts.push({ table, row });
          if (table === 'pro_subscription_payments') {
            const id = row.provider_authorized_payment_id;
            if (ledgerIds.has(id)) return Promise.resolve({ error: { code: '23505' } });
            ledgerIds.add(id);
          }
          return Promise.resolve({ error: null });
        },
        update(row) {
          updates.push({ table, row });
          return updateChain();
        },
        delete() {
          return updateChain();
        },
        select(_columns, opts) {
          return selectChain(table, opts);
        },
      };
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      if (name === 'claim_subscription_event') {
        const id = args.p_event_id;
        if (claimed.has(id)) {
          return { data: [{ claimed: false, reason: 'busy', event_id: 'busy', claim_token: null, attempts: 1 }], error: null };
        }
        claimed.add(id);
        return {
          data: [{ claimed: true, reason: 'claimed', event_id: `event-${id}`, claim_token: `token-${id}`, attempts: 1 }],
          error: null,
        };
      }
      if (name === 'complete_subscription_event') {
        completed.push(args);
        return { data: 1, error: null };
      }
      if (name === 'fail_subscription_event') return { data: true, error: null };
      if (name === 'claim_subscription_effect') return { data: null, error: null };
      if (name === 'claim_pro_founder_slot') return { data: null, error: null };
      return { data: null, error: null };
    },
  };

  return { supabase, inserts, updates, rpcCalls, completed, claimed };
}

function createApp({ supabase, fetchImpl }) {
  const app = express();
  app.use(express.json());

  app.post('/api/mercadopago/webhook', async (req, res) => {
    try {
      const topic = req.body?.topic || req.body?.type || req.body?.action;
      const resourceId = normalizeProviderResourceId(
        req.body?.data?.id ?? req.body?.resource ?? req.query?.['data.id'] ?? req.query?.id
      );

      const handlePreapprovalWebhook = async (id) => {
        const fetched = await fetchProviderResource(`https://api.mercadopago.com/preapproval/${id}`, { fetchImpl });
        if (!fetched.ok) return providerFetchFailureResult(fetched);
        return { ok: true, id };
      };

      const handleAuthorizedPayment = async (id) => {
        const fetched = await fetchProviderResource(`https://api.mercadopago.com/v1/payments/${id}`, { fetchImpl });
        if (!fetched.ok) return providerFetchFailureResult(fetched);
        const payment = fetched.data;
        return processProAuthorizedPaymentEvent({
          supabase,
          payment,
          subscription: {
            id: 'sub-1',
            lawyer_id: 'lawyer-1',
            plan: 'pro',
            status: 'active',
            amount_clp: 19990,
            provider_subscription_id: 'pre-1',
          },
          preapprovalId: payment.preapproval_id,
          deps: {
            completePlusUpgrade: async () => ({ ok: true }),
            ensureProStandardPrice: async () => {},
            effectHandlers: { analytics: async () => {} },
          },
        });
      };

      const dispatch = await dispatchSubscriptionWebhook({
        topic,
        resourceId,
        handlers: { handlePreapprovalWebhook, handleAuthorizedPayment },
      });
      if (dispatch.handled) return sendWebhookResponse(res, dispatch.result);
      return res.status(200).send('OK');
    } catch (error) {
      return res.status(500).json({ error: String(error?.message || error) });
    }
  });

  return app;
}

async function withServer(app, fn) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function post(base, body) {
  const res = await fetch(`${base}/api/mercadopago/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
}

describe('subscription webhook over real HTTP', () => {
  it('H1: accepts underscore topic and preserves the alphanumeric preapproval id', async () => {
    const id = '2c938084726fca480172750000000000';
    const fetchImpl = vi.fn(async () => response(200, { id, status: 'authorized' }));
    const app = createApp({ supabase: createMockSupabase().supabase, fetchImpl });

    await withServer(app, async (base) => {
      const result = await post(base, { type: 'subscription_preapproval', data: { id } });
      expect(result.status).toBe(200);
      expect(result.text).toBe('OK');
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.mercadopago.com/preapproval/${id}`,
      expect.any(Object)
    );
  });

  it('H1: cancellation uses the authoritative preapproval lookup', async () => {
    const id = '2c938084726fca480172750000000000';
    const fetchImpl = vi.fn(async () => response(200, { id, status: 'cancelled' }));
    const app = createApp({ supabase: createMockSupabase().supabase, fetchImpl });

    await withServer(app, async (base) => {
      const result = await post(base, { type: 'subscription_cancelled', data: { id } });
      expect(result.status).toBe(200);
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.mercadopago.com/preapproval/${id}`,
      expect.any(Object)
    );
  });

  it('H1: ambiguous and unsupported topics are explicit 200 JSON, not silent OK', async () => {
    const app = createApp({ supabase: createMockSupabase().supabase, fetchImpl: vi.fn() });

    await withServer(app, async (base) => {
      const ambiguous = await post(base, { type: 'subscription', data: { id: 'abc' } });
      expect(ambiguous.status).toBe(200);
      expect(ambiguous.json).toMatchObject({ ignored: true, reason: 'ambiguous_subscription_topic' });

      const unknown = await post(base, { type: 'new_provider_topic', data: { id: 'abc' } });
      expect(unknown.status).toBe(200);
      expect(unknown.json).toMatchObject({ ignored: true, reason: 'unsupported_topic' });

      const missing = await post(base, { type: 'subscription_preapproval' });
      expect(missing.status).toBe(200);
      expect(missing.json).toMatchObject({ ignored: true, reason: 'missing_resource_id' });
    });
  });

  it('H2: 429/5xx/timeout return 503 so MercadoPago retries', async () => {
    const cases = [
      async () => response(429),
      async () => response(500),
      async () => { const e = new Error('timeout'); e.name = 'AbortError'; throw e; },
    ];

    for (const fetchImpl of cases) {
      const app = createApp({ supabase: createMockSupabase().supabase, fetchImpl });
      await withServer(app, async (base) => {
        const result = await post(base, { type: 'subscription_preapproval', data: { id: 'pre-1' } });
        expect(result.status).toBe(503);
        expect(result.json).toMatchObject({ error: 'processing_in_progress', retry: true });
      });
    }
  });

  it('H2: permanent 4xx is ACKed with an explicit reason and no retry', async () => {
    const app = createApp({
      supabase: createMockSupabase().supabase,
      fetchImpl: async () => response(400),
    });

    await withServer(app, async (base) => {
      const result = await post(base, { type: 'subscription_preapproval', data: { id: 'pre-1' } });
      expect(result.status).toBe(200);
      expect(result.json).toMatchObject({
        skipped: 'provider_fetch_failed',
        reason: 'provider_rejected',
        http_status: 400,
      });
    });
  });

  it('H2: 401/403 are operational auth failures and return 503 for redelivery', async () => {
    for (const status of [401, 403]) {
      const app = createApp({
        supabase: createMockSupabase().supabase,
        fetchImpl: async () => response(status),
      });

      await withServer(app, async (base) => {
        const result = await post(base, { type: 'subscription_preapproval', data: { id: 'pre-1' } });
        expect(result.status).toBe(503);
        expect(result.json).toMatchObject({ error: 'processing_in_progress', retry: true });
      });
    }
  });

  it('H3: pending then approved are separate transitions and approved activates', async () => {
    const responses = [
      response(200, { id: 'pay-1', status: 'pending', preapproval_id: 'pre-1', date_created: '2026-10-01T00:00:00Z' }),
      response(200, { id: 'pay-1', status: 'approved', preapproval_id: 'pre-1', date_created: '2026-10-01T00:00:00Z', date_last_updated: '2026-10-01T00:01:00Z' }),
    ];
    const mock = createMockSupabase();
    const app = createApp({ supabase: mock.supabase, fetchImpl: async () => responses.shift() });

    await withServer(app, async (base) => {
      expect((await post(base, { type: 'subscription_authorized_payment', data: { id: 'pay-1' } })).status).toBe(200);
      expect((await post(base, { type: 'subscription_authorized_payment', data: { id: 'pay-1' } })).status).toBe(200);
    });

    const claimIds = mock.rpcCalls
      .filter((c) => c.name === 'claim_subscription_event')
      .map((c) => c.args.p_event_id);
    expect(claimIds).toEqual(['pay-1:pending', 'pay-1']);
    const activation = mock.updates.find((u) => u.table === 'lawyer_subscriptions' && u.row.status === 'active');
    expect(activation).toBeTruthy();
  });

  it('H3: an unknown status is ACKed and does not block a later approved payment', async () => {
    const responses = [
      response(200, { id: 'pay-2', status: 'in_mediation', preapproval_id: 'pre-1', date_created: '2026-10-01T00:00:00Z' }),
      response(200, { id: 'pay-2', status: 'approved', preapproval_id: 'pre-1', date_created: '2026-10-01T00:00:00Z', date_last_updated: '2026-10-01T00:05:00Z' }),
    ];
    const mock = createMockSupabase();
    const app = createApp({ supabase: mock.supabase, fetchImpl: async () => responses.shift() });

    await withServer(app, async (base) => {
      expect((await post(base, { type: 'subscription_authorized_payment', data: { id: 'pay-2' } })).status).toBe(200);
      expect((await post(base, { type: 'subscription_authorized_payment', data: { id: 'pay-2' } })).status).toBe(200);
    });

    const claimIds = mock.rpcCalls
      .filter((c) => c.name === 'claim_subscription_event')
      .map((c) => c.args.p_event_id);
    expect(claimIds).toEqual(['pay-2:in_mediation', 'pay-2']);
    expect(mock.updates.some((u) => u.table === 'lawyer_subscriptions' && u.row.status === 'active')).toBe(true);
  });
});
