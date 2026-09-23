import posthog from 'posthog-js';

/**
 * 4.38C — analytics for commercial AI limit events.
 * Safe properties only: capability, code, used, limit. Never PII, document
 * names, questions, or provider internals.
 */
export type AILimitCapability = 'chat' | 'analysis' | 'research' | 'documents';

export function captureAIUsageLimitReached(
  capability: AILimitCapability,
  code: string,
  opts: { used?: number | null; limit?: number | null } = {}
): void {
  try {
    posthog.capture('ai_usage_limit_reached', {
      capability,
      code,
      used: opts.used ?? undefined,
      limit: opts.limit ?? undefined,
    });
  } catch {
    /* Telemetry must not interrupt the UX. */
  }
}

/** Commercial limit error codes returned by the backend (never provider internals). */
export const AI_COMMERCIAL_LIMIT_CODES = [
  'AI_CHAT_LIMIT_REACHED',
  'AI_ANALYSIS_LIMIT_REACHED',
  'AI_RESEARCH_LIMIT_REACHED',
  'AI_DOCUMENT_CAPACITY_REACHED',
] as const;

export function isCommercialLimitCode(code: string | null | undefined): boolean {
  return !!code && (AI_COMMERCIAL_LIMIT_CODES as readonly string[]).includes(code);
}
