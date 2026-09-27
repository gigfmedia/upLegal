import { describe, it, expect } from 'vitest';
import { normalizePlanCode, canUseAIFeature } from '@/lib/aiFeatures';

describe('4.57B — canonical plan representation (frontend mirror)', () => {
  it('maps every known raw value to its canonical code', () => {
    expect(normalizePlanCode('free_case')).toBe('free_case');
    expect(normalizePlanCode('pro')).toBe('pro');
    expect(normalizePlanCode('pro_limited')).toBe('pro');
    expect(normalizePlanCode('saas_essential')).toBe('pro');
    expect(normalizePlanCode('essential')).toBe('legacy');
    expect(normalizePlanCode('plus')).toBe('plus');
  });

  it('fails closed on unknown/empty values', () => {
    expect(normalizePlanCode('vip')).toBeNull();
    expect(normalizePlanCode('')).toBeNull();
    expect(normalizePlanCode(null)).toBeNull();
    expect(normalizePlanCode(undefined)).toBeNull();
    expect(normalizePlanCode(42)).toBeNull();
  });

  it('plus grants no features (INACTIVE tier)', () => {
    expect(canUseAIFeature('document_analysis', 'plus')).toBe(false);
    expect(canUseAIFeature('case_chat', 'plus')).toBe(false);
    expect(canUseAIFeature('case_analysis', 'plus')).toBe(false);
    expect(canUseAIFeature('jurisprudence', 'plus')).toBe(false);
  });

  it('existing plans unchanged: free_case and pro_limited outputs identical', () => {
    expect(canUseAIFeature('document_analysis', 'free_case')).toBe(true);
    expect(canUseAIFeature('case_chat', 'free_case')).toBe(true);
    expect(canUseAIFeature('jurisprudence', 'free_case')).toBe(true);
    expect(canUseAIFeature('case_analysis', 'free_case')).toBe(false);
    expect(canUseAIFeature('document_analysis', 'pro_limited')).toBe(true);
    expect(canUseAIFeature('case_analysis', 'pro_limited')).toBe(true);
    expect(canUseAIFeature('jurisprudence', 'pro_limited')).toBe(true);
  });
});
