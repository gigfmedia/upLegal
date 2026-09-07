import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3B-1 — Pro entitlement', () => {
  it('lawyer without subscription hasProAccess false', () => {
    const c = readFileSync(resolve('src/hooks/useProSubscription.ts'), 'utf-8');
    expect(c).toContain('hasProAccess');
    expect(c).toContain("status === 'active'");
  });
  it('lawyer active hasProAccess true', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('getProLawyerAccess');
    expect(c).toContain("status === 'active'");
  });
  it('expired hasProAccess false', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('expired');
  });
  it('cancelled with period still has access', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("status === 'cancelled'");
    expect(c).toContain('current_period_end');
  });
  it('non-lawyer cannot activate', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('requireAILawyer');
  });
  it('unauthenticated cannot create', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("app.post('/api/pro/subscribe'");
  });
  it('price manipulation blocked', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('PRO_SUBSCRIPTION_PRICE_CLP');
    expect(c).toContain('19990');
    expect(c).not.toContain('req.body.price');
  });
  it('lawyer A cannot use B id', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('PRO_EXTERNAL_REF_PREFIX');
    expect(c).toContain('PRO_');
  });
  it('duplicate webhook idempotent', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('handleProPreapprovalWebhook');
    expect(c).toContain('handleProAuthorizedPayment');
  });
  it('webhook falso no activa', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('x-signature');
    expect(c).toContain('timingSafeEqual');
  });
  it('marketplace still passes', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain("app.post('/api/bookings/create'");
  });
});
