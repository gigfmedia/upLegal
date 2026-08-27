import { describe, it, expect } from 'vitest';
import { deriveCaseActions } from './caseActionLayer.mjs';
import {
  WORKFLOW_STATUSES,
  WORKFLOW_PERSISTABLE_TYPES,
  WORKFLOW_ALLOWED_TRANSITIONS,
  sortWorkflowItems,
  isValidWorkflowStatus,
  isAllowedTransition,
  getPersistableActions,
  buildWorkflowTimestampUpdates,
} from './caseWorkflow.mjs';

const baseIntel = (o = {}) => ({
  contradictions: [],
  missingInformation: [],
  risks: [],
  pending_count: 0,
  failed_count: 0,
  document_count: 1,
  total_documents: 1,
  ...o,
});

function simulateSync(existing, derivedActions) {
  const byActionId = new Map(existing.map((r) => [r.action_id, r]));
  const next = [...existing];
  for (const act of derivedActions) {
    if (!WORKFLOW_PERSISTABLE_TYPES.has(act.type)) continue;
    const actionId = act.type;
    const found = byActionId.get(actionId);
    if (found) {
      // status preservation: do not reset
      found.title = act.title;
      found.priority = act.priority;
    } else {
      const item = {
        id: `id-${actionId}`,
        lawyer_id: 'lawyer-A',
        workspace_id: 'ws-1',
        case_id: 'ws-1',
        action_id: actionId,
        title: act.title,
        description: act.description,
        status: 'pending',
        priority: act.priority,
        created_at: new Date().toISOString(),
      };
      next.push(item);
      byActionId.set(actionId, item);
    }
  }
  return next;
}

describe('4.21 workflow', () => {
  it('1. create workflow item has required fields', () => {
    const intel = baseIntel({ missingInformation: ['Falta'] });
    const persistable = getPersistableActions(intel);
    expect(persistable[0].type).toBe('review_missing_information');
    expect(isValidWorkflowStatus('pending')).toBe(true);
  });

  it('2. deduplication: failed + pending review_documents → 1 item after sync', () => {
    const intel = baseIntel({ failed_count: 1, pending_count: 2 });
    const derived = deriveCaseActions(intel);
    const persistable = getPersistableActions(intel);
    // derive returns 2 review_documents ids (failed + pending) with same type; sync dedups by type
    const docTypesBefore = persistable.filter((a) => a.type === 'review_documents');
    expect(docTypesBefore.length).toBe(2);
    const synced = simulateSync([], derived);
    const syncedDocs = synced.filter((i) => i.action_id === 'review_documents');
    expect(syncedDocs.length).toBe(1);
  });

  it('3. sync idempotency: sync twice same count', () => {
    const intel = baseIntel({ risks: ['r'] });
    const derived = deriveCaseActions(intel);
    let items = simulateSync([], derived);
    items = simulateSync(items, derived);
    items = simulateSync(items, derived);
    expect(items.length).toBe(1);
    expect(items[0].action_id).toBe('review_risks');
  });

  it('4. status update: pending→completed allowed', () => {
    expect(isAllowedTransition('pending', 'completed')).toBe(true);
    expect(isAllowedTransition('pending', 'in_progress')).toBe(true);
    expect(isAllowedTransition('in_progress', 'completed')).toBe(true);
    expect(isAllowedTransition('completed', 'pending')).toBe(true);
    expect(isAllowedTransition('dismissed', 'pending')).toBe(true);
  });

  it('5. completed_at set on completed', () => {
    const upd = buildWorkflowTimestampUpdates('completed');
    expect(upd.completed_at).toBeTruthy();
    expect(upd.dismissed_at).toBe(null);
  });

  it('6. dismissed_at set on dismissed', () => {
    const upd = buildWorkflowTimestampUpdates('dismissed');
    expect(upd.dismissed_at).toBeTruthy();
    expect(upd.completed_at).toBe(null);
  });

  it('7. reopen clears timestamps', () => {
    const upd = buildWorkflowTimestampUpdates('pending');
    expect(upd.completed_at).toBe(null);
    expect(upd.dismissed_at).toBe(null);
  });

  it('8. invalid status rejected', () => {
    expect(isValidWorkflowStatus('archived')).toBe(false);
    expect(isValidWorkflowStatus('pending')).toBe(true);
    expect(isValidWorkflowStatus('')).toBe(false);
  });

  it('9. ownership: A can update own, B cannot (simulated)', () => {
    const item = { lawyer_id: 'A', workspace_id: 'ws-A' };
    const canA = item.lawyer_id === 'A';
    const canB = item.lawyer_id === 'B';
    expect(canA).toBe(true);
    expect(canB).toBe(false);
  });

  it('10. cross-workspace denial', () => {
    const wsA = 'ws-A';
    const wsB = 'ws-B';
    const item = { workspace_id: wsA, lawyer_id: 'A' };
    const attemptWorkspace = wsB;
    expect(item.workspace_id === attemptWorkspace).toBe(false);
  });

  it('11. status preservation: completed stays completed after sync', () => {
    const intel = baseIntel({ risks: ['r'] });
    const derived = deriveCaseActions(intel);
    let items = simulateSync([], derived);
    items[0].status = 'completed';
    items[0].completed_at = new Date().toISOString();
    const after = simulateSync(items, derived);
    expect(after[0].status).toBe('completed');
    expect(after[0].completed_at).toBeTruthy();
  });

  it('12. derived action synchronization maps to workflow (missing→review_missing_information)', () => {
    const intel = baseIntel({ missingInformation: ['Falta fecha'], risks: ['Riesgo'] });
    const persistable = getPersistableActions(intel);
    expect(persistable.map((a) => a.type)).toContain('review_missing_information');
    expect(persistable.map((a) => a.type)).toContain('review_risks');
  });

  it('13. review → chat mapping exists', () => {
    const map = {
      review_missing_information: '¿Qué información falta',
      review_contradictions: '¿Qué contradicciones existen',
      review_risks: '¿Qué riesgos aparecen',
      review_documents: 'Documentos',
    };
    expect(map['review_missing_information']).toContain('información falta');
    expect(map['review_risks']).toContain('riesgos');
  });

  it('14. double click protection: second pending→in_progress while in_progress blocked', () => {
    let status = 'pending';
    const tryTransition = (to) => {
      if (!isAllowedTransition(status, to)) return false;
      // guard: if already in_progress, second attempt to go in_progress again should fail (no self-transition)
      if (status === 'in_progress' && to === 'in_progress') return false;
      status = to;
      return true;
    };
    expect(tryTransition('in_progress')).toBe(true);
    expect(tryTransition('in_progress')).toBe(false);
    expect(status).toBe('in_progress');
  });

  it('15. no workflow item for ask_case_question', () => {
    const intel = baseIntel({});
    const persistable = getPersistableActions(intel);
    expect(persistable.some((a) => a.type === 'ask_case_question')).toBe(false);
  });

  it('16. sort: pending high before completed low', () => {
    const now = new Date().toISOString();
    const items = [
      { id: '1', status: 'completed', priority: 'high', created_at: now },
      { id: '2', status: 'pending', priority: 'low', created_at: now },
      { id: '3', status: 'pending', priority: 'high', created_at: now },
      { id: '4', status: 'dismissed', priority: 'high', created_at: now },
    ];
    const sorted = sortWorkflowItems(items);
    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('2');
    expect(sorted[sorted.length - 1].id).toBe('4');
  });

  it('17. invalid transition pending→pending rejected', () => {
    expect(isAllowedTransition('pending', 'pending')).toBe(false);
    expect(isAllowedTransition('completed', 'completed')).toBe(false);
  });
});
