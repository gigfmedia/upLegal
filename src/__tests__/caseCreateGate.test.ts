import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decideCreateCaseAction } from '@/lib/caseCreateGate';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

// Fixture de producción observada (4.43A §19): primer caso gratis.
const PRODUCTION_FIXTURE = {
  has_pro_access: false,
  active_case_count: 0,
  active_case_limit: 20,
  free_case_consumed: false,
  can_create_direct_case: true,
};

describe('4.43A case create gate matrix (pure)', () => {
  it('A. non-Pro primer caso gratis → abre formulario, sin modal', () => {
    expect(
      decideCreateCaseAction({ loading: false, error: false, canCreate: true, isProAtCapacity: false })
    ).toBe('open-form');
  });

  it('B. non-Pro sin cupo → paywall, sin formulario', () => {
    expect(
      decideCreateCaseAction({ loading: false, error: false, canCreate: false, isProAtCapacity: false })
    ).toBe('paywall');
  });

  it('C. Pro bajo capacidad → abre formulario', () => {
    expect(
      decideCreateCaseAction({ loading: false, error: false, canCreate: true, isProAtCapacity: false })
    ).toBe('open-form');
  });

  it('D. Pro en capacidad (20/20) → capacity UX, nunca paywall de precio', () => {
    expect(
      decideCreateCaseAction({ loading: false, error: false, canCreate: false, isProAtCapacity: true })
    ).toBe('capacity');
  });

  it('E. loading → espera, jamás paywall prematuro', () => {
    expect(
      decideCreateCaseAction({ loading: true, error: false, canCreate: false, isProAtCapacity: false })
    ).toBe('wait');
    expect(
      decideCreateCaseAction({ loading: true, error: false, canCreate: true, isProAtCapacity: false })
    ).toBe('wait');
  });

  it('F. error de lectura → retry, jamás paywall', () => {
    expect(
      decideCreateCaseAction({ loading: false, error: true, canCreate: false, isProAtCapacity: false })
    ).toBe('retry');
  });

  it('G. producción: fixture 4.43A → formulario permitido', () => {
    expect(PRODUCTION_FIXTURE.can_create_direct_case).toBe(true);
    expect(
      decideCreateCaseAction({ loading: false, error: false, canCreate: PRODUCTION_FIXTURE.can_create_direct_case, isProAtCapacity: false })
    ).toBe('open-form');
  });
});

describe('4.43A wiring CasesPage + hook (static)', () => {
  it('hook expone error explícito además de loading', () => {
    const c = read('src/hooks/useCaseEntitlement.ts');
    expect(c).toContain('const [error, setError] = useState(false)');
    expect(c).toContain('error,');
    expect(c).toContain('setError(true)');
  });

  it('CasesPage usa el decider en ambos botones y en submit', () => {
    const c = read('src/pages/lawyer/CasesPage.tsx');
    expect(c).toContain("import { decideCreateCaseAction } from '@/lib/caseCreateGate'");
    expect(c).toContain('const handleCreateClick');
    // Ningún botón decide con hasProAccess solo ni con !canCreateCase directo.
    expect(c).not.toMatch(/if\s*\(\s*!canCreateCase\s*\)/);
    expect(c).not.toMatch(/if\s*\(\s*!hasProAccess\s*\)[\s\S]{0,120}openBlockedGate/);
  });

  it('error muestra retry con refetch, no paywall', () => {
    const c = read('src/pages/lawyer/CasesPage.tsx');
    expect(c).toContain('No pudimos verificar tu acceso');
    expect(c).toContain('void refetchEntitlement()');
  });

  it('submit conserva paywall/capacity solo con lectura exitosa + denegada', () => {
    const c = read('src/pages/lawyer/CasesPage.tsx');
    const submit = c.slice(c.indexOf('const handleCreate = async'));
    expect(submit).toContain('decideCreateCaseAction');
    expect(submit).toContain("openBlockedGate('create_case')");
  });
});
