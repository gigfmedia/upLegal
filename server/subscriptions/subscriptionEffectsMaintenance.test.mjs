// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { runSubscriptionEffectsMaintenance } from './subscriptionEffects.mjs';

function makeSupabase({ expired = 0, expireError = null, claimError = null } = {}) {
  const calls = [];
  return {
    calls,
    async rpc(name, params = {}) {
      calls.push(name);
      if (name === 'expire_subscription_effects') {
        return { data: expired, error: expireError };
      }
      if (name === 'claim_subscription_effect') {
        if (claimError) return { data: null, error: claimError };
        return { data: null, error: null };
      }
      throw new Error(`unexpected_rpc:${name}`);
    },
  };
}

const logger = { error: vi.fn() };

describe('runSubscriptionEffectsMaintenance', () => {
  it('still drains when the H4 expiry RPC is missing', async () => {
    const supabase = makeSupabase({ expireError: { message: 'function not found' } });

    const result = await runSubscriptionEffectsMaintenance(supabase, {}, { logger });

    expect(result).toMatchObject({ expired: 0, processed: 0 });
    expect(supabase.calls).toContain('claim_subscription_effect');
    expect(logger.error).toHaveBeenCalledWith(
      '[SubscriptionEffects] expiry failed (drain continues)',
      { error: 'function not found' },
    );
  });

  it('reports expiry and drain together', async () => {
    const supabase = makeSupabase({ expired: 3 });

    await expect(
      runSubscriptionEffectsMaintenance(supabase, {}, { logger }),
    ).resolves.toMatchObject({ expired: 3, processed: 0 });
  });

  it('reports the expiry result when the drain fails', async () => {
    const supabase = makeSupabase({ expired: 2, claimError: { message: 'claim_down' } });

    const result = await runSubscriptionEffectsMaintenance(supabase, {}, { logger });

    expect(result).toMatchObject({ expired: 2, processed: 0, error: 'claim_down' });
  });
});
