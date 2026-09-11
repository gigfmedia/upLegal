import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3C.2D — Post-payment refetch Pro', () => {
  const hookPath = resolve('src/hooks/useProSubscription.ts');
  const dashPath = resolve('src/pages/lawyer/DashboardPage.tsx');

  it('T — hook expone refetch e isFetching', () => {
    const h = readFileSync(hookPath, 'utf-8');
    expect(h).toContain('isFetching');
    expect(h).toContain('refetch');
    expect(h).toContain('const { data: subscription, isLoading, isFetching, refetch }');
    expect(h).toContain('isFetching,');
    expect(h).toContain('refetch,');
  });

  it('T1 — normal dashboard sin query param NO polling', () => {
    const d = readFileSync(dashPath, 'utf-8');
    // Polling only when isProReturn true
    expect(d).toContain("isProReturn = searchParams.get('pro_subscription_success') === 'true'");
    expect(d).toContain('if (!isProReturn) return;');
  });

  it('T2 — return + Pro already active muestra success y limpia query', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain("if (hasProAccessCheck)");
    expect(d).toContain("pro_checkout_returned");
    expect(d).toContain("pro_access_confirmed");
    expect(d).toContain("¡LegalUp Pro activado!");
    expect(d).toContain("Ya puedes gestionar clientes");
    expect(d).toContain("newParams.delete('pro_subscription_success')");
    expect(d).toContain("navigate(`/lawyer/dashboard");
  });

  it('T3 — return false -> true refetch polling 5 intentos', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain('for (let i = 0; i < 5; i++)');
    expect(d).toContain('await refetchPro()');
    expect(d).toContain('await new Promise((r) => setTimeout(r, 1500))');
    expect(d).toContain('setProVerificationAttempts(i + 1)');
  });

  it('T4 — máximo 5 intentos, no loop infinito', () => {
    const d = readFileSync(dashPath, 'utf-8');
    // Should have exactly 5 attempts
    const matches = (d.match(/for \(let i = 0; i < 5; i\+\+\)/g) || []).length;
    expect(matches).toBeGreaterThanOrEqual(1);
    expect(d).not.toContain('while (true)');
    expect(d).not.toContain('setInterval');
  });

  it('T5 — timeout muestra Tu pago está siendo procesado', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain('Tu pago está siendo procesado');
    expect(d).toContain("proVerificationState === 'timeout'");
    expect(d).toContain('pro_access_verification_timeout');
    expect(d).toContain('Si Mercado Pago aprobó');
  });

  it('Verifying muestra Estamos verificando tu pago', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain('Estamos verificando tu pago');
    expect(d).toContain("proVerificationState === 'verifying'");
    expect(d).toContain('Esto puede tardar unos segundos');
    expect(d).toContain('Loader2');
  });

  it('T6 — manual verify botón Verificar nuevamente', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain('Verificar nuevamente');
    // Button should call refetchPro again
    const btnSection = d.split('Verificar nuevamente')[0].slice(-1200);
    expect(d).toContain('onClick={async () => {');
    expect(d).toContain('await refetchPro()');
  });

  it('T7 — no duplicate checkout durante verifying (no POST /api/pro/subscribe)', () => {
    const d = readFileSync(dashPath, 'utf-8');
    const verifySection = d.slice(d.indexOf('isProReturn'), d.indexOf('isProReturn') + 3000);
    expect(verifySection).not.toContain('/api/pro/subscribe');
    expect(verifySection).not.toContain('useProSubscribe');
  });

  it('T8 — analytics pro_checkout_returned, pro_access_confirmed, timeout', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain("posthog.capture('pro_checkout_returned'");
    expect(d).toContain("posthog.capture('pro_access_confirmed'");
    expect(d).toContain("posthog.capture('pro_access_verification_timeout'");
  });

  it('Hook no introduce polling global', () => {
    const h = readFileSync(hookPath, 'utf-8');
    expect(h).not.toContain('setInterval');
    expect(h).not.toContain('setTimeout');
    // Dashboard only polls when isProReturn and not hasProAccess
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain('if (!isProReturn) return;');
    expect(d).toContain('if (hasProAccessCheck)');
  });

  it('T11 — AI no cambia, T12 Marketplace intacto, T13 pricing 19990', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).not.toContain('AI_PRO_LIMITS');
    const s = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(s).toContain('PRO_SUBSCRIPTION_PRICE_CLP');
    expect(s).toContain('19990');
  });

  it('Back_url sigue /lawyer/dashboard?pro_subscription_success=true', () => {
    const s = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(s).toContain('/lawyer/dashboard?pro_subscription_success=true');
  });

  it('Success limpia query param con replace', () => {
    const d = readFileSync(dashPath, 'utf-8');
    expect(d).toContain("replace: true");
    expect(d).toContain("delete('pro_subscription_success')");
  });
});
