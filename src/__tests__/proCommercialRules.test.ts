import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 4.32B — commercial rule certification via source inspection.
// DB RLS behavior itself is covered by migration + manual SQL verification;
// these tests lock the certified semantics against regression.

describe('4.32B — first-free case source of truth', () => {
  const sql = readFileSync(resolve('supabase/migrations/20260917000000_pro_first_case_free.sql'), 'utf-8');

  it('counts only LAWYER_DIRECT cases (marketplace/unknown do not consume)', () => {
    expect(sql).toContain("source = 'LAWYER_DIRECT'");
    expect(sql).not.toContain('MARKETPLACE');
  });

  it('has no status filter (cancelled direct cases count)', () => {
    expect(sql.toLowerCase()).not.toContain('status');
  });

  it('preserves paid-Pro authority (has_pro_access OR first-case)', () => {
    expect(sql).toContain('has_pro_access');
    expect(sql).toContain('NOT EXISTS');
  });
});

describe('4.32B — intro pricing source of truth (4.32B.4: founder-cohort rule)', () => {
  const server = readFileSync(resolve('server.mjs'), 'utf-8');

  it('initial price follows the atomic reservation result, with explicit RPC errors', () => {
    const idx = server.indexOf('resolveProCheckoutPricing({');
    expect(idx).toBeGreaterThan(-1);
    const block = server.slice(Math.max(0, idx - 1800), idx + 1200);
    expect(block).toContain('pro_subscription_payments');
    expect(block).toContain('reserve_pro_founder_slot');
    expect(block).toContain('if (!pricing.ok)');
    expect(block).toContain('code: pricing.code');
    expect(block).toContain('FOUNDER_STATUS_UNAVAILABLE');
  });

  it('a failed/unknown reservation returns before any DB row or provider charge', () => {
    const pricingIdx = server.indexOf('if (!pricing.ok)');
    const insertIdx = server.indexOf('.insert({', pricingIdx);
    const mpIdx = server.indexOf("fetch('https://api.mercadopago.com/preapproval'", pricingIdx);
    expect(pricingIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(pricingIdx);
    expect(mpIdx).toBeGreaterThan(pricingIdx);
  });

  it('legacy lawyer_subscriptions founder count is gone (profiles/RPC are authority)', () => {
    expect(server).not.toContain('founderCount');
    expect(server).not.toContain('PRO_FOUNDER_LIMIT');
  });

  it('existing founders keep the lifetime intro-count rule (no reset)', () => {
    expect(server).toContain('resolveProCheckoutPricing');
    const helper = readFileSync(resolve('server/proFounder.mjs'), 'utf-8');
    expect(helper).toContain('PRO_INTRO_SUCCESSFUL_PAYMENTS');
    expect(helper).toContain('lifetimeApproved >= PRO_INTRO_SUCCESSFUL_PAYMENTS');
  });

  it('checkout charges the derived initialPrice (not a hardcoded amount)', () => {
    expect(server).toContain('transaction_amount: initialPrice');
  });

  it('pending checkouts are validated before activation/reuse', () => {
    const helper = readFileSync(resolve('server/proFounder.mjs'), 'utf-8');
    expect(server).toContain('validateReusableCheckout');
    expect(server).toContain('PENDING_PLAN_MISMATCH');
    expect(helper).toContain('PENDING_PRICE_MISMATCH');
    expect(helper).toContain('PENDING_FOUNDER_STATE_INVALID');
  });

  it('public capacity endpoint exposes aggregate slots only', () => {
    expect(server).toContain("app.get('/api/pro/founder-capacity'");
    expect(server).toContain("Cache-Control', 'public, max-age=30");
    expect(server).toContain("code: 'FOUNDER_CAPACITY_UNAVAILABLE'");
  });
});

describe('4.32B — public pricing consistency (LegalUpPro)', () => {
  const landing = readFileSync(resolve('src/pages/LegalUpPro.tsx'), 'utf-8');

  it('canonical intro→standard rule is conditional on server capacity', () => {
    expect(landing).toContain('$19.990');
    expect(landing).toContain('$49.990');
    expect(landing).toContain('resolveFounderAvailability');
    expect(landing).toContain('useProFounderCapacity');
    expect(landing).toContain("state === 'available'");
    expect(landing).toContain("state === 'sold_out'");
  });

  it('intro price is gated on the server preview price (post-intro Founders see standard)', () => {
    expect(landing).toContain('founderIntroAvailable');
    expect(landing).toContain('PRO_INTRO_PRICE_CLP_DISPLAY');
    expect(landing).toContain('founderAvailability.priceClp === PRO_INTRO_PRICE_CLP_DISPLAY');
  });

  it('no stale standalone-AI purchase copy', () => {
    expect(landing).not.toContain('AI Full');
    expect(landing).not.toContain('$49.900');
    expect(landing).not.toContain('por separado');
  });

  it('no contradictory regular-price disclaimer', () => {
    expect(landing).not.toContain('No hay un precio regular definitivo');
  });
});
