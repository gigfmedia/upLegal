/**
 * 4.45A — default document selection for the Documents & Analysis workspace.
 *
 * Explicit selection always wins. Otherwise prefer the most recently listed
 * document that already has a persisted analysis (`analysis_status ready`),
 * so the Resumen panel shows the stored summary instead of an empty
 * "Analizar" CTA whenever another (usually newer, unanalyzed) document
 * exists. Pure read-path helper: no quota, no provider, plan-agnostic.
 */
export function resolveSelectedDocument<
  T extends { id: string; analysis_status?: string | null },
>(documents: T[], selectedId: string | null): T | null {
  return (
    documents.find((doc) => doc.id === selectedId) ??
    documents.find((doc) => doc.analysis_status === 'ready') ??
    documents[0] ??
    null
  );
}
