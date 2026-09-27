import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PLUS_PRICE_CLP_DISPLAY,
  PRO_PRICE_CLP_DISPLAY,
  PLAN_QUOTAS_DISPLAY,
  upgradeTargetForPlan,
  isPlusPlan,
  displayTier,
  chatLimitMessage,
  analysisLimitMessage,
  researchLimitMessage,
  documentLimitMessage,
} from '@/lib/planDisplay';
import { canUseAIFeature, normalizePlanCode } from '@/lib/aiFeatures';
import { documentCapacityLimitMessage } from '@/lib/aiDocumentLimits';
import { setProPendingAction, takeProPendingAction, peekProPendingAction } from '@/lib/proPurchaseIntent';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.57D Plus v1 — frontend contract (display only)', () => {
  it('display quotas mirror the certified contract', () => {
    expect(PLUS_PRICE_CLP_DISPLAY).toBe(79990);
    expect(PRO_PRICE_CLP_DISPLAY).toBe(49990);
    expect(PLAN_QUOTAS_DISPLAY.plus).toEqual({ cases: 40, documents: 150, chat: 750, analysis: 100, research: 25 });
    expect(PLAN_QUOTAS_DISPLAY.pro).toEqual({ cases: 20, documents: 50, chat: 300, analysis: 40, research: 10 });
    expect(PLAN_QUOTAS_DISPLAY.free).toEqual({ cases: 1, documents: 2, chat: 3, analysis: 1, research: 1 });
  });

  it('paywall targeting: free→pro, pro→plus, plus→none', () => {
    expect(upgradeTargetForPlan('free_case')).toBe('pro');
    expect(upgradeTargetForPlan(null)).toBe('pro');
    expect(upgradeTargetForPlan(undefined)).toBe('pro');
    expect(upgradeTargetForPlan('vip')).toBe('pro');
    expect(upgradeTargetForPlan('pro_limited')).toBe('plus');
    expect(upgradeTargetForPlan('saas_essential')).toBe('plus');
    expect(upgradeTargetForPlan('pro')).toBe('plus');
    expect(upgradeTargetForPlan('plus')).toBeNull();
    expect(isPlusPlan('plus')).toBe(true);
    expect(isPlusPlan('pro_limited')).toBe(false);
    expect(displayTier('plus')).toBe('plus');
    expect(displayTier('saas_essential')).toBe('pro');
    expect(normalizePlanCode('plus')).toBe('plus');
  });

  it('limit copy: pro mentions Plus; plus explains reset only', () => {
    expect(chatLimitMessage('pro_limited')).toContain('300');
    expect(chatLimitMessage('pro_limited')).toContain('750');
    expect(chatLimitMessage('plus')).toContain('750');
    expect(chatLimitMessage('plus')).not.toContain('Plus');
    expect(analysisLimitMessage('pro_limited')).toContain('100');
    expect(analysisLimitMessage('plus')).toContain('100');
    expect(researchLimitMessage('pro_limited')).toContain('25');
    expect(researchLimitMessage('plus')).toContain('25');
    expect(documentLimitMessage('pro_limited')).toContain('150');
    expect(documentLimitMessage('plus')).toContain('150');
    expect(documentCapacityLimitMessage('pro_limited')).toContain('50 documentos');
    expect(documentCapacityLimitMessage('pro_limited')).toContain('Plus');
    expect(documentCapacityLimitMessage('plus')).toContain('150 documentos');
    expect(documentCapacityLimitMessage('plus')).not.toContain('Plus');
    expect(documentCapacityLimitMessage()).toContain('50 documentos');
  });

  it('plus resolves the paid core feature set (no Plus-only features)', () => {
    for (const f of ['document_analysis', 'case_chat', 'case_analysis', 'jurisprudence'] as const) {
      expect(canUseAIFeature(f, 'plus')).toBe(true);
    }
    expect(canUseAIFeature('workflow_generation', 'plus')).toBe(false);
  });

  it('pending intent preserves the Plus target through signup', () => {
    expect(takeProPendingAction()).toBeNull();
    setProPendingAction('checkout_plus');
    expect(peekProPendingAction()).toBe('checkout_plus');
    expect(takeProPendingAction()).toBe('checkout_plus');
    expect(takeProPendingAction()).toBeNull();
    setProPendingAction('checkout');
    expect(takeProPendingAction()).toBe('checkout');
  });

  it('landing shows three tiers with certified values and emphasis', () => {
    const landing = read('src/pages/LegalUpPro.tsx');
    expect(landing).toContain('LegalUp Plus');
    expect(landing).toContain('$79.990');
    expect(landing).toContain('Hasta 40 casos activos');
    expect(landing).toContain('Hasta 150 documentos actuales');
    expect(landing).toContain('750 consultas IA / mes');
    expect(landing).toContain('100 análisis de documentos / mes');
    expect(landing).toContain('25 investigaciones jurídicas / mes');
    expect(landing).toContain('Recomendado');
    expect(landing).toContain('Para mayor volumen');
    expect(landing).toContain('¿Qué es LegalUp Plus?');
    expect(landing).toContain('handlePlusCTA');
    expect(landing).toContain('checkout_plus');
    // Pro card keeps certified values; Founder stays Pro-only.
    expect(landing).toContain('Hasta 20 casos activos');
    expect(landing).toContain('10 investigaciones jurídicas / mes');
    // Plus card must not advertise Founder pricing.
    const plusStart = landing.indexOf('PLUS — mismo producto');
    const plusEnd = landing.indexOf('CTA FINAL');
    const plusCard = landing.slice(plusStart, plusEnd);
    expect(plusCard).not.toContain('$19.990');
    expect(plusCard).not.toContain('Founder 15');
    // No unlimited AI, no teams/automation placeholders.
    expect(landing).not.toMatch(/consultas ilimitadas|análisis ilimitado|investigaciones ilimitadas/i);
    expect(landing).not.toMatch(/miembros del equipo|roles y permisos/i);
  });

  it('pricing modal renders Plus mode with certified copy and disclosure', () => {
    const modal = read('src/components/legalup-pro/ProPricingModal.tsx');
    expect(modal).toContain('LegalUp Plus');
    expect(modal).toContain('PLUS_PRICE_CLP_DISPLAY');
    expect(modal).toContain('PLUS_PERKS');
    expect(modal).toContain('Hasta 40 casos activos');
    expect(modal).toContain('750 consultas IA / mes');
    expect(modal).toContain('100 análisis de documentos / mes');
    expect(modal).toContain('25 investigaciones jurídicas / mes');
    expect(modal).toContain('No se aplica crédito prorrateado');
    expect(modal).toContain('plus_viewed');
    expect(modal).toContain('plus_upgrade_started');
    expect(modal).toContain('Cambiar a LegalUp Plus');
    // Pro mode certified copy intact.
    expect(modal).toContain('Activar LegalUp Pro');
    expect(modal).toContain('Founder 15');
    // Plus mode never shows Founder pricing.
    expect(modal).not.toMatch(/Founder[\s\S]{0,200}79\.990|79\.990[\s\S]{0,200}Founder/);
  });

  it('capacity paywall routes Pro→Plus and Plus→close-guidance', () => {
    const cases = read('src/pages/lawyer/CasesPage.tsx');
    expect(cases).toContain("setPaywallTarget('plus')");
    expect(cases).toContain("setPaywallTarget('pro')");
    expect(cases).toContain('plus_limit_reached');
    const cap = read('src/components/legalup-pro/ActiveCapacityModal.tsx');
    expect(cap).toContain('Ver LegalUp Plus');
    expect(cap).toContain('onUpgradeClick');
  });

  it('AI surfaces target Plus on Pro exhaustion, reset-only on Plus', () => {
    for (const [file, trigger] of [
      ['src/components/legalup-ai/AIChat.tsx', 'ai_chat_limit'],
      ['src/components/legalup-ai/AIResearchPanel.tsx', 'ai_research_limit'],
    ] as const) {
      const src = read(file);
      expect(src).toContain('upgradeTargetForPlan');
      expect(src).toContain('Ver LegalUp Plus');
      expect(src).toContain(`targetPlan="plus"`);
      expect(src).toContain(trigger);
      expect(src).toContain('target_plan');
    }
    // The shared documents workspace reuses the owner onUpgrade entry
    // (its modal auto-targets Plus for Pro) — no commercial shell inside.
    const ws = read('src/components/legalup-ai/AICaseDocumentsWorkspace.tsx');
    expect(ws).toContain('upgradeTargetForPlan');
    expect(ws).toContain('Ver LegalUp Plus');
    expect(ws).toContain('analysisLimitMessage(usagePlan)');
    expect(ws).not.toContain('ProPricingModal');
  });

  it('subscription settings expose tier, transitions and safe actions', () => {
    const card = read('src/components/legalup-pro/ProSubscriptionCard.tsx');
    expect(card).toContain('LegalUp Plus');
    expect(card).toContain('LegalUp Pro');
    expect(card).toContain('Cambiar a LegalUp Plus');
    expect(card).toContain('Volver a LegalUp Pro');
    expect(card).toContain('Cancelar suscripción');
    expect(card).toContain('downgradeScheduled');
    expect(card).toContain('upgradePending');
    expect(card).toContain('oldProCancelPending');
    expect(card).toContain('pending_init_point');
    const settings = read('src/pages/lawyer/SettingsPage.tsx');
    expect(settings).toContain('ProSubscriptionCard');
  });
});
