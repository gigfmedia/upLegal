// Server-owned model choices: preserve the existing document-analysis selector.
const ANALYSIS_MODELS = new Set([
  'openai/gpt-4o-mini',
  'z-ai/glm-5.2:free',
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-120b:fastest',
  'deepseek-ai/DeepSeek-R1:fastest',
]);

export function resolveAnalysisModel(requested, trustedDefault) {
  if (requested == null || requested === '') return trustedDefault;
  if (typeof requested !== 'string') return null;
  const model = requested.trim();
  return model === trustedDefault || ANALYSIS_MODELS.has(model) ? model : null;
}

export function hasCanonicalDocumentReference(doc, userId, workspace) {
  if (!doc || !userId || !workspace) return false;
  if (doc.lawyer_id !== userId || workspace.lawyer_id !== userId || workspace.id !== doc.workspace_id) return false;
  // Exact comparison rejects alternate prefixes, traversal, URL encoding and URLs.
  return Boolean(doc.id && doc.workspace_id) &&
    doc.file_path === `${userId}/${doc.workspace_id}/${doc.id}/original.pdf`;
}

// 4.34C: honest evidence location. Extraction preserves no physical PDF page
// boundaries (concatenated text + char-window chunks), so a chunk index must
// never be presented as a physical page. page_number stays null (reserved for
// future certified page tracking); fragment_index carries chunk order.
export function fragmentIndexFromId(fragmentId) {
  if (typeof fragmentId !== 'string') return null;
  const n = parseInt(fragmentId.split('::').pop() || '', 10);
  return Number.isFinite(n) ? n : null;
}

export function honestEvidenceLocation(fragmentId) {
  return { fragment_index: fragmentIndexFromId(fragmentId), page_number: null };
}
