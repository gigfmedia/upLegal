import { describe, it, expect } from 'vitest';
import {
  canUseAIFeature,
  AI_SUBSCRIPTION_PRICE_CLP,
  AI_SUBSCRIPTION_TRIAL_DAYS,
  AI_LIMITS,
} from '@/lib/aiFeatures';

describe('aiFeatures — gating por plan (Fase 3.5)', () => {
  it('sin suscripción (free) no habilita ninguna feature', () => {
    expect(canUseAIFeature('document_analysis', 'free')).toBe(false);
    expect(canUseAIFeature('case_chat', 'free')).toBe(false);
    expect(canUseAIFeature('case_analysis', 'free')).toBe(false);
  });

  it('plan essential habilita todas las features', () => {
    expect(canUseAIFeature('document_analysis', 'essential')).toBe(true);
    expect(canUseAIFeature('case_chat', 'essential')).toBe(true);
    expect(canUseAIFeature('case_analysis', 'essential')).toBe(true);
    expect(canUseAIFeature('jurisprudence', 'essential')).toBe(true);
    expect(canUseAIFeature('document_drafting', 'essential')).toBe(true);
  });

  it('plan desconocido se trata como free (sin features)', () => {
    expect(canUseAIFeature('document_analysis', 'vip')).toBe(false);
  });

  it('la suscripción es mensual a $49.900 CLP con trial de 5 días', () => {
    expect(AI_SUBSCRIPTION_PRICE_CLP).toBe(49900);
    expect(AI_SUBSCRIPTION_TRIAL_DAYS).toBe(5);
    expect(AI_LIMITS.maxDocumentSizeBytes).toBe(20 * 1024 * 1024);
  });
});
