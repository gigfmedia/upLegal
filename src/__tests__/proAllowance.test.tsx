import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canUseAIFeature, AI_PRO_ALLOWANCE, AI_PRO_LIMITS } from '@/lib/aiFeatures';
import {
  isDocumentCapacityLimitError,
  documentCapacityLimitMessage,
} from '@/lib/aiDocumentLimits';
import { isCommercialLimitCode } from '@/lib/aiLimitAnalytics';
import { AIUsageMeter } from '@/components/legalup-ai/AIUsageMeter';

vi.mock('@/hooks/useAIUsage', () => ({
  useAIUsage: () => ({
    isLoading: false,
    data: {
      success: true,
      period_start: '2026-09-01',
      period_end: '2026-10-01',
      usage: {
        total_tokens: 1000,
        total_credits: 1,
        document_analysis_count: 12,
        chat_message_count: 123,
        jurisprudence_research_count: 3,
        estimated_cost_usd: 0,
      },
      allowance: {
        plan: 'pro_limited',
        chat: { used: 123, limit: 300 },
        analysis: { used: 12, limit: 40 },
        research: { used: 3, limit: 10 },
        documents: { used: 21, limit: 50 },
      },
      protection_limits: {
        monthly_tokens: 20000000,
        monthly_requests: 5000,
        rate_limit_per_minute: 30,
        monthly_tokens_used: 1000,
        monthly_requests_used: 135,
      },
    },
  }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.38C-B Pro allowance frontend contract', () => {
  it('pro plan includes jurisprudence with the canonical allowance', () => {
    expect(canUseAIFeature('jurisprudence', 'pro_limited')).toBe(true);
    expect(canUseAIFeature('document_analysis', 'pro_limited')).toBe(true);
    expect(canUseAIFeature('case_chat', 'pro_limited')).toBe(true);
    expect(canUseAIFeature('workflow_generation', 'pro_limited')).toBe(false);
    expect(AI_PRO_ALLOWANCE).toEqual({
      chatPerMonth: 300,
      analysisPerMonth: 40,
      researchPerMonth: 10,
      storedDocuments: 50,
    });
    expect(AI_PRO_LIMITS.maxDocuments).toBe(50);
  });

  it('document capacity error detection (marker, legacy, negative)', () => {
    expect(
      isDocumentCapacityLimitError({ code: 'P0001', message: 'AI_DOCUMENT_CAPACITY_REACHED: Alcanzaste el límite de 50 documentos almacenados de tu plan.' })
    ).toBe(true);
    expect(
      isDocumentCapacityLimitError({ code: 'P0001', message: 'Alcanzaste el límite de 10 documento(s) de tu plan.' })
    ).toBe(true);
    expect(isDocumentCapacityLimitError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isDocumentCapacityLimitError(null)).toBe(false);
    expect(documentCapacityLimitMessage()).toContain('50 documentos');
    expect(documentCapacityLimitMessage()).not.toMatch(/token|costo|proveedor|plan Ultra|upgrade/i);
  });

  it('commercial limit codes recognized; provider codes are not commercial', () => {
    for (const code of ['AI_CHAT_LIMIT_REACHED', 'AI_ANALYSIS_LIMIT_REACHED', 'AI_RESEARCH_LIMIT_REACHED', 'AI_DOCUMENT_CAPACITY_REACHED']) {
      expect(isCommercialLimitCode(code)).toBe(true);
    }
    expect(isCommercialLimitCode('AI_PROVIDER_TIMEOUT')).toBe(false);
    expect(isCommercialLimitCode(undefined)).toBe(false);
  });

  it('AIUsageMeter renders the four commercial pools', () => {
    const { container } = render(<AIUsageMeter />);
    expect(screen.getByText('Consultas IA')).toBeInTheDocument();
    const text = container.textContent ?? '';
    for (const expected of ['123 / 300', '12 / 40', '3 / 10', '21 / 50']) {
      expect(text).toContain(expected);
    }
  });

  it('limit UX copy present without provider internals or future tiers', () => {
    const chat = read('src/components/legalup-ai/AIChat.tsx');
    expect(chat).toContain('AI_CHAT_LIMIT_REACHED');
    expect(chat).toContain('Alcanzaste las 300 consultas IA incluidas este mes');
    const research = read('src/components/legalup-ai/AIResearchPanel.tsx');
    expect(research).toContain('AI_RESEARCH_LIMIT_REACHED');
    expect(research).toContain('Alcanzaste las 10 investigaciones incluidas este mes');
    const docs = read('src/components/legalup-ai/AICaseDocumentsWorkspace.tsx');
    expect(docs).toContain('AI_ANALYSIS_LIMIT_REACHED');
    expect(docs).toContain('Alcanzaste los 40 análisis de documentos incluidos este mes');
    for (const c of [chat, research, docs]) {
      expect(c).not.toMatch(/Ultra|Unlimited|upgrade.*plan/i);
    }
    const usage = read('src/hooks/useAIUsage.ts');
    expect(usage).toContain('allowance');
    const meter = read('src/components/legalup-ai/AIUsageMeter.tsx');
    expect(meter).not.toMatch(/token|cost/i);
  });

  it('limit analytics event carries safe props only', () => {
    const lib = read('src/lib/aiLimitAnalytics.ts');
    expect(lib).toContain('ai_usage_limit_reached');
    expect(lib).toContain('capability');
    expect(lib).not.toMatch(/question:|document_name:|message_length:|query_length:|user_id:/i);
  });
});
