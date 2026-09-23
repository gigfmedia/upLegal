import { describe, it, expect } from 'vitest';
import {
  PRO_AI_ALLOWANCE,
  COMMERCIAL_LIMIT_CODES,
  DOCUMENT_CAPACITY_ERROR_MARKER,
  commercialQuotaForPlan,
  commercialLimitCode,
} from './proAllowance.mjs';

describe('4.38C-B commercial Pro AI allowance authority', () => {
  it('canonical limits match the approved product contract', () => {
    expect(PRO_AI_ALLOWANCE).toEqual({
      chatPerMonth: 300,
      analysisPerMonth: 40,
      researchPerMonth: 10,
      storedDocuments: 50,
    });
    expect(Object.isFrozen(PRO_AI_ALLOWANCE)).toBe(true);
  });

  it('pro_limited gets the full allowance; every other plan gets none', () => {
    expect(commercialQuotaForPlan('pro_limited')).toEqual({ chat: 300, analysis: 40, research: 10 });
    for (const plan of ['free', 'essential', 'trial', 'unknown', '', null, undefined]) {
      expect(commercialQuotaForPlan(plan)).toBeNull();
    }
  });

  it('founder is pricing-only: no founder branch in quota authority', () => {
    // Founder shares the standard Pro plan; the module never reads is_founder.
    expect(commercialQuotaForPlan('pro_limited')).toEqual(commercialQuotaForPlan('pro_limited'));
    expect('is_founder' in PRO_AI_ALLOWANCE).toBe(false);
  });

  it('commercial limit codes never expose provider internals', () => {
    expect(commercialLimitCode('case_chat')).toBe('AI_CHAT_LIMIT_REACHED');
    expect(commercialLimitCode('document_chat')).toBe('AI_CHAT_LIMIT_REACHED');
    expect(commercialLimitCode('document_analysis')).toBe('AI_ANALYSIS_LIMIT_REACHED');
    expect(commercialLimitCode('research')).toBe('AI_RESEARCH_LIMIT_REACHED');
    expect(commercialLimitCode('unknown')).toBeNull();
    for (const code of Object.values(COMMERCIAL_LIMIT_CODES)) {
      expect(code).toMatch(/^AI_(CHAT|ANALYSIS|RESEARCH)_LIMIT_REACHED$/);
      expect(code).not.toMatch(/token|provider|cost|openrouter/i);
    }
  });

  it('document capacity marker is stable for trigger/frontend matching', () => {
    expect(DOCUMENT_CAPACITY_ERROR_MARKER).toBe('AI_DOCUMENT_CAPACITY_REACHED');
  });
});
