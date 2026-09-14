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
