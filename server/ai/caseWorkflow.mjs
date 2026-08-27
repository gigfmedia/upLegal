// Fase 4.21: Case Workflow — helpers puros para validación y sincronización (sin DB).
import { deriveCaseActions, CASE_ACTION_TYPES } from './caseActionLayer.mjs';

export const WORKFLOW_STATUSES = new Set(['pending', 'in_progress', 'completed', 'dismissed']);
export const WORKFLOW_PERSISTABLE_TYPES = new Set([
  CASE_ACTION_TYPES.REVIEW_MISSING_INFORMATION,
  CASE_ACTION_TYPES.REVIEW_CONTRADICTIONS,
  CASE_ACTION_TYPES.REVIEW_RISKS,
  CASE_ACTION_TYPES.REVIEW_DOCUMENTS,
]);
export const WORKFLOW_ALLOWED_TRANSITIONS = {
  pending: new Set(['in_progress', 'completed', 'dismissed']),
  in_progress: new Set(['completed', 'dismissed']),
  completed: new Set(['pending']),
  dismissed: new Set(['pending']),
};
export const WORKFLOW_PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
export const WORKFLOW_STATUS_RANK = { pending: 0, in_progress: 0, completed: 2, dismissed: 3 };

export function sortWorkflowItems(items) {
  return [...items].sort((a, b) => {
    const sr = (WORKFLOW_STATUS_RANK[a.status] ?? 9) - (WORKFLOW_STATUS_RANK[b.status] ?? 9);
    if (sr !== 0) return sr;
    const pr = (WORKFLOW_PRIORITY_ORDER[a.priority] ?? 9) - (WORKFLOW_PRIORITY_ORDER[b.priority] ?? 9);
    if (pr !== 0) return pr;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function isValidWorkflowStatus(s) {
  return WORKFLOW_STATUSES.has(s);
}
export function isAllowedTransition(from, to) {
  return !!WORKFLOW_ALLOWED_TRANSITIONS[from]?.has(to);
}
export function getPersistableActions(intelligence) {
  return deriveCaseActions(intelligence).filter((a) => WORKFLOW_PERSISTABLE_TYPES.has(a.type));
}
export function buildWorkflowTimestampUpdates(status) {
  const now = new Date().toISOString();
  if (status === 'completed') return { completed_at: now, dismissed_at: null };
  if (status === 'dismissed') return { dismissed_at: now, completed_at: null };
  if (status === 'pending' || status === 'in_progress') return { completed_at: null, dismissed_at: null };
  return {};
}
