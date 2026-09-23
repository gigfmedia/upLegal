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
  it('pro_limited creation quotas live in DB trigger, not in a use-time helper (4.34B)', () => {
    const c = readFileSync(resolve('server.mjs'), 'utf-8');
    expect(c).toContain('isProLimited');
    expect(c).toContain('pro_limited');
    // 4.34B: creation quotas live in the DB trigger, not in a use-time helper.
    expect(c).toContain('ai_enforce_trial_limits');
    expect(c).toContain('metered');
    expect(c).not.toContain('checkAILimits');
  });
  it('4.38C Pro allowance migration replaces 1/3 with workspace-unlimited + 50 docs', () => {
    const c = readFileSync(resolve('supabase/migrations/20260930000000_pro_ai_allowance.sql'), 'utf-8');
    expect(c).toContain('ai_enforce_trial_limits');
    expect(c).toContain('AI_DOCUMENT_CAPACITY_REACHED');
    expect(c).toContain('p_chat_limit');
    expect(c).toContain('AI_CHAT_LIMIT_REACHED');
    expect(c).toContain('AI_ANALYSIS_LIMIT_REACHED');
    expect(c).toContain('AI_RESEARCH_LIMIT_REACHED');
    // Historical migration untouched.
    const legacy = readFileSync(resolve('supabase/migrations/20260912000000_pro_ai_limits.sql'), 'utf-8');
    expect(legacy).toContain('THEN 1 ELSE 3');
  });
  it('ProPricingModal copy stays concise (no quota dump)', () => {
    const c = readFileSync(resolve('src/components/legalup-pro/ProPricingModal.tsx'), 'utf-8');
    expect(c).toContain('LegalUp AI integrado');
    expect(c).not.toContain('300 consultas');
    expect(c).not.toContain('AI limitado');
    expect(c).not.toContain('1 caso');
  });
  it('DB trigger enforces Pro', () => {
    const c = readFileSync(resolve('supabase/migrations/20260912000000_pro_ai_limits.sql'), 'utf-8');
    expect(c).toContain('has_pro_access');
    expect(c).toContain('v_is_pro_limited');
  });
});
