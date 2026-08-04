// LegalUp AI — Fase 3.6: AI Usage & Cost Control.
// Unidad interna: 1 crédito = 1.000 tokens. credits_used = ceil(tokens/1000).

export const AI_CREDITS_PER_TOKEN = 1000;

/** Convierte tokens a créditos internos (entero, sin fracciones). */
export function tokensToCredits(totalTokens: number): number {
  const tokens = Math.max(0, Math.round(totalTokens || 0));
  return Math.ceil(tokens / AI_CREDITS_PER_TOKEN);
}
