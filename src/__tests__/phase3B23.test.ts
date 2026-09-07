import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('FASE 3B-2.3 — Pro Limited', () => {
  it('aiFeatures has pro_limited', () => {
    const c = readFileSync(resolve('src/lib/aiFeatures.ts'), 'utf-8');
    expect(c).toContain('pro_limited');
    expect(c).toContain('document_analysis');
    expect(c).toContain('case_chat');
    expect(c).not.toContain("pro_limited: ['document_analysis', 'case_chat', 'jurisprudence']");
  });
  it('getAILawyerAccess precedence Pro', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('getProLawyerAccess');
    expect(c).toContain('pro_limited');
  });
  it('checkAILimits handles pro_limited 1/3', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('isProLimited');
    expect(c).toContain('maxCases = isProLimited ? 1 : 3');
  });
  it('ProPricingModal copy', () => {
    const c = readFileSync(resolve('src/components/legalup-pro/ProPricingModal.tsx'), 'utf-8');
    expect(c).toContain('AI limitado');
    expect(c).toContain('1 caso');
  });
  it('DB trigger enforces Pro', () => {
    const c = readFileSync(resolve('supabase/migrations/20260912000000_pro_ai_limits.sql'), 'utf-8');
    expect(c).toContain('has_pro_access');
    expect(c).toContain('v_is_pro_limited');
  });
});
