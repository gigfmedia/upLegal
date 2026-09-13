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

describe('4.32B — intro pricing source of truth', () => {
  const server = readFileSync(resolve('server.mjs'), 'utf-8');

  it('initial price derives from lifetime approved payments, not subscription record', () => {
    const idx = server.indexOf('let initialPrice = PRO_INTRO_PRICE_CLP');
    expect(idx).toBeGreaterThan(-1);
    const block = server.slice(idx, idx + 600);
    expect(block).toContain('pro_subscription_payments');
    expect(block).toContain("eq('status', 'approved')");
    expect(block).toContain('PRO_INTRO_SUCCESSFUL_PAYMENTS');
    expect(block).toContain('PRO_STANDARD_PRICE_CLP');
  });

  it('Founder status has zero branches in price selection', () => {
    const idx = server.indexOf('let initialPrice = PRO_INTRO_PRICE_CLP');
    const block = server.slice(idx, idx + 600);
    expect(block).not.toContain('is_founder');
    expect(block).not.toContain('isFounder');
    expect(block).not.toContain('founder');
  });

  it('checkout charges the derived initialPrice (not a hardcoded amount)', () => {
    expect(server).toContain('transaction_amount: initialPrice');
  });
});

describe('4.32B — public pricing consistency (LegalUpPro)', () => {
  const landing = readFileSync(resolve('src/pages/LegalUpPro.tsx'), 'utf-8');

  it('canonical intro→standard rule is stated', () => {
    expect(landing).toContain('$19.990');
    expect(landing).toContain('$49.990');
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
