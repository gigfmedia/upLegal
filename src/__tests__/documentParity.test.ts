import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fragmentLabelFromId } from '@/lib/evidenceLocation';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.34C — honest evidence locations', () => {
  it('fragment labels are 1-based chunk references, never pages', () => {
    expect(fragmentLabelFromId('document::abc::0')).toBe('Fragmento 1');
    expect(fragmentLabelFromId('document::abc::6')).toBe('Fragmento 7');
    expect(fragmentLabelFromId(null)).toBe(null);
    expect(fragmentLabelFromId(undefined)).toBe(null);
    expect(fragmentLabelFromId('garbage')).toBe(null);
    expect(fragmentLabelFromId('document::abc::')).toBe(null);
  });

  it('no UI presents chunk indexes as physical pages', () => {
    for (const f of [
      'src/components/legalup-ai/EvidenceNavigator.tsx',
      'src/components/legalup-ai/AIAnalysisView.tsx',
      'src/components/legalup-ai/AICaseIntelligence.tsx',
      'src/components/legalup-ai/AIChat.tsx',
    ]) {
      expect(read(f)).not.toContain('Página');
    }
  });

  it('backend never fabricates page_number from chunk order', () => {
    const c = read('server.mjs');
    expect(c).not.toContain('fragment.index + 1');
    expect(c).not.toContain('Number.isFinite(idx) ? idx + 1');
    expect(c.match(/honestEvidenceLocation\(/g)?.length).toBeGreaterThanOrEqual(6);
  });
});

describe('4.34C — Case → Documents chat parity', () => {
  it('selected document opens the same case chat drawer, no standalone route', () => {
    const c = read('src/components/lawyer/CaseDocuments.tsx');
    expect(c).toContain('AICaseChatDrawer');
    expect(c).toContain('documentId={chatDocumentId}');
    expect(c).not.toContain('/lawyer/ai');
    const s = read('src/components/legalup-ai/AICaseDocumentsWorkspace.tsx');
    expect(s).toContain('Preguntar sobre este documento');
    expect(s).toContain("posthog.capture('ai_document_chat_clicked'");
  });

  it('pending documents auto-process with zero-LLM extraction, same events as standalone', () => {
    const c = read('src/components/legalup-ai/AICaseDocumentsWorkspace.tsx');
    expect(c).toContain('useProcessAIDocument');
    expect(c).toContain("status === 'pending'");
    expect(c).toContain('ai_document_processing_started');
    expect(c).toContain('ai_document_processing_completed');
  });
});

describe('4.34C — evidence open + delete consistency', () => {
  it('evidence opens via server-validated signed URL with controlled states', () => {
    const c = read('src/components/legalup-ai/EvidenceNavigator.tsx');
    expect(c).toContain('/api/ai/documents/${reference.documentId}/open');
    expect(c).toContain('<iframe');
    expect(c).toContain('urlError');
    expect(c).not.toContain('Página');
  });

  it('server open/delete endpoints enforce canonical ownership', () => {
    const c = read('server.mjs');
    expect(c).toContain("/api/ai/documents/:id/open");
    expect(c).toContain('app.delete');
    expect(c).toContain('/api/ai/documents/:id');
    expect(c).toContain('AI_DOCUMENT_STORAGE_DELETE_FAILED');
    expect(c).not.toContain("permission denied");
  });

  it('delete hook uses server orchestration, never reports silent success', () => {
    const c = read('src/hooks/useAIDocuments.ts');
    const fn = c.slice(c.indexOf('export function useDeleteAIDocument'));
    expect(fn).toContain("method: 'DELETE'");
    expect(fn).toContain('/api/ai/documents/${doc.id}');
    expect(fn).not.toContain(".from('ai_documents').delete()");
    expect(fn).not.toContain('.remove(');
  });

  it('reanalysis persists replacement before removing the good analysis', () => {
    const c = read('server.mjs');
    const insertAt = c.indexOf("const { data: saved, error: insertError }");
    const deleteOldAt = c.indexOf(".delete().eq('document_id', doc.id).neq('id', saved.id)");
    expect(insertAt).toBeGreaterThan(-1);
    expect(deleteOldAt).toBeGreaterThan(insertAt);
  });
});
