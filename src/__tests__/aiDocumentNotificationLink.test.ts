import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getNotificationLink } from '@/lib/notifications/notificationTypes';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.56I ai_document notification navigation', () => {
  it('linked current Case resolves to the canonical documents tab', () => {
    expect(
      getNotificationLink({
        type: 'ai.document.ready',
        entityType: 'ai_document',
        entityId: 'doc-1',
        metadata: { case_id: 'ws-1', workspace_id: 'ws-1', document_id: 'doc-1', lawyer_case_id: 'case-9' },
        role: 'lawyer',
      })
    ).toBe('/lawyer/cases/case-9?tab=documents');
  });

  it('orphan workspace resolves to the legacy detail route', () => {
    expect(
      getNotificationLink({
        type: 'ai.analysis.completed',
        entityType: 'ai_document',
        entityId: 'doc-2',
        metadata: { case_id: 'ws-orphan', workspace_id: 'ws-orphan', document_id: 'doc-2', lawyer_case_id: null },
        role: 'lawyer',
      })
    ).toBe('/lawyer/ai/cases/ws-orphan');
  });

  it('ambiguous legacy case_id keeps workspace semantics (never a Case id)', () => {
    // Every known producer stored ai_workspaces.id in `case_id`; the legacy
    // route self-redirects when the workspace is linked.
    expect(
      getNotificationLink({
        type: 'ai.document.ready',
        entityType: 'ai_document',
        entityId: 'doc-3',
        metadata: { case_id: 'ws-legacy' },
        role: 'lawyer',
      })
    ).toBe('/lawyer/ai/cases/ws-legacy');
  });

  it('missing/stale identifiers fall back safely, never an invalid detail', () => {
    expect(
      getNotificationLink({ type: 'ai.document.ready', entityType: 'ai_document', entityId: 'doc-4', metadata: {}, role: 'lawyer' })
    ).toBe('/lawyer/cases');
    expect(
      getNotificationLink({ type: 'ai.document.ready', entityType: 'ai_document', entityId: 'doc-5', metadata: null, role: 'lawyer' })
    ).toBe('/lawyer/cases');
    expect(
      getNotificationLink({ type: 'ai.document.ready', entityType: 'ai_document', entityId: 'doc-6', metadata: { lawyer_case_id: '', workspace_id: '' }, role: 'lawyer' })
    ).toBe('/lawyer/cases');
  });

  it('server producers store explicit identifiers (no bare overloaded case_id)', () => {
    const server = read('server.mjs');
    for (const eventId of ['ai_process:', 'ai_process_failed:', 'ai_analysis:', 'ai_analysis_failed:']) {
      const idx = server.indexOf(eventId);
      expect(idx).toBeGreaterThan(-1);
      const block = server.slice(Math.max(0, idx - 600), idx);
      expect(block).toContain('workspace_id');
      expect(block).toContain('document_id');
      expect(block).toContain('lawyer_case_id');
      expect(block).toContain('resolveDocLinkedCaseId');
    }
    expect(server).toContain('const resolveDocLinkedCaseId');
  });

  it('AICaseDetail backlinks use Historial de casos, never LegalUp AI nav', () => {
    const detail = read('src/pages/lawyer/AICaseDetail.tsx');
    expect(detail).toContain('Volver a Historial de casos');
    expect(detail).toContain('Ir a Historial de casos');
    expect(detail).not.toContain('Volver a LegalUp AI');
    expect(detail).not.toContain('Ir a Mis casos');
  });

  it('sidebar condition and /lawyer/ai compatibility unchanged', () => {
    const layout = read('src/components/dashboard/DashboardLayout.tsx');
    expect(layout).toContain('hasUnlinkedWorkspaces');
    expect(layout).toContain("label: 'Historial de casos'");
    expect(layout).not.toContain('showLegacyAI');
    const workspace = read('src/pages/lawyer/LegalUpAIWorkspace.tsx');
    expect(workspace).toContain("Navigate to=\"/lawyer/cases\"");
    const app = read('src/App.tsx');
    expect(app).toContain('path="ai" element={<LegalUpAIWorkspace />}');
    expect(app).toContain('path="ai/cases/:caseId" element={<LegacyAICaseRoute />}');
  });
});
