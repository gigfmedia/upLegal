/**
 * 4.46B — latest analyzed-document summary selector (read-path only).
 *
 * Authority: persisted `ai_document_analyses` rows. Most recently analyzed
 * first by `updated_at` DESC (re-analysis replaces the row, so a fresh
 * insert carries the analysis event time; the `set_updated_at` trigger keeps
 * UPDATEs ordered too). Skips rows with blank summaries so an empty latest
 * analysis never hides an older valid one. No provider, no quota,
 * plan-agnostic.
 */
export type LatestAnalysisRow = {
  id: string;
  document_id: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  document?: { id: string; original_filename: string; workspace_id: string } | null;
};

export function selectLatestAnalysis<T extends LatestAnalysisRow>(rows: T[]): T | null {
  const ordered = [...rows].sort((a, b) =>
    String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
  );
  return ordered.find((r) => (r.summary || '').trim().length > 0) ?? null;
}
