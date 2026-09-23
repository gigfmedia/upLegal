/**
 * FASE 4.38C-B — canonical Pro AI commercial allowance (single authority).
 *
 * Resource capacity (no monthly reset): active Cases (20, owned by Case
 * capacity, not this module), stored AI documents per lawyer.
 * Monthly consumption (calendar month UTC, no rollover): chat questions
 * (case_chat + document_chat share one pool), document analyses, research.
 *
 * Only successful logical operations consume commercial quota
 * (quota_units = 1). Failed operations and provider retries never charge.
 * Founder receives the same allowance (no branching by is_founder).
 * Legacy `essential` AI subscriptions keep their own entitlement: this module
 * returns null for any plan other than pro_limited.
 */

/** Monthly/standing commercial limits for current paid LegalUp Pro. */
export const PRO_AI_ALLOWANCE = Object.freeze({
  /** Successful AI questions per UTC month, shared case_chat + document_chat pool. */
  chatPerMonth: 300,
  /** Successful document analyses per UTC month. */
  analysisPerMonth: 40,
  /** Successful research/jurisprudence operations per UTC month. */
  researchPerMonth: 10,
  /** Current stored ai_documents rows per lawyer (deleting frees a slot). */
  storedDocuments: 50,
});

/** Commercial limit error codes per metering capability (never provider internals). */
export const COMMERCIAL_LIMIT_CODES = Object.freeze({
  case_chat: 'AI_CHAT_LIMIT_REACHED',
  document_chat: 'AI_CHAT_LIMIT_REACHED',
  document_analysis: 'AI_ANALYSIS_LIMIT_REACHED',
  research: 'AI_RESEARCH_LIMIT_REACHED',
});

/** Stable DB marker prefix for the stored-document capacity trigger error. */
export const DOCUMENT_CAPACITY_ERROR_MARKER = 'AI_DOCUMENT_CAPACITY_REACHED';

/**
 * Commercial quota for a resolved plan, or null when no commercial quota
 * applies (legacy essential, trial, free). Shape matches ai_begin_operation
 * commercial params: { chat, analysis, research } monthly successful units.
 */
export function commercialQuotaForPlan(plan) {
  if (plan !== 'pro_limited') return null;
  return {
    chat: PRO_AI_ALLOWANCE.chatPerMonth,
    analysis: PRO_AI_ALLOWANCE.analysisPerMonth,
    research: PRO_AI_ALLOWANCE.researchPerMonth,
  };
}

/** Commercial limit code for a metering capability (null when unknown). */
export function commercialLimitCode(capability) {
  return COMMERCIAL_LIMIT_CODES[capability] ?? null;
}
