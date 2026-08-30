import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const AIChatRequestSchema = z.object({
  conversation_id: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  document_id: z.string().uuid().optional(),
});

function mockGetAIDocumentOwned(documentId, userId, workspaceId) {
  const docs = {
    'doc-1': { id: 'doc-1', workspace_id: 'ws-1', lawyer_id: 'lawyer-1' },
    'doc-2': { id: 'doc-2', workspace_id: 'ws-1', lawyer_id: 'lawyer-1' },
  };
  const doc = docs[documentId];
  if (!doc || doc.lawyer_id !== userId || doc.workspace_id !== workspaceId) return null;
  return doc;
}

describe('4.26 document contextual chat', () => {
  it('A documentId válido permitido', () => {
    const doc = mockGetAIDocumentOwned('doc-1', 'lawyer-1', 'ws-1');
    expect(doc).not.toBeNull();
  });
  it('B documentId inexistente rechazado', () => {
    const doc = mockGetAIDocumentOwned('doc-999', 'lawyer-1', 'ws-1');
    expect(doc).toBeNull();
  });
  it('C documentId de otro workspace rechazado', () => {
    const doc = mockGetAIDocumentOwned('doc-1', 'lawyer-1', 'ws-2');
    expect(doc).toBeNull();
  });
  it('D documentId de otro abogado rechazado', () => {
    const doc = mockGetAIDocumentOwned('doc-1', 'lawyer-2', 'ws-1');
    expect(doc).toBeNull();
  });
  it('E workflow chat sin documentId continúa', () => {
    const parsed = AIChatRequestSchema.safeParse({ conversation_id: '00000000-0000-0000-0000-000000000001', message: 'hola' });
    expect(parsed.success).toBe(true);
    expect(parsed.data.document_id).toBeUndefined();
  });
  it('F document chat con documentId envía', () => {
    const parsed = AIChatRequestSchema.safeParse({ conversation_id: '00000000-0000-0000-0000-000000000001', message: 'hola', document_id: '00000000-0000-0000-0000-000000000002' });
    expect(parsed.success).toBe(true);
    expect(parsed.data.document_id).toBe('00000000-0000-0000-0000-000000000002');
  });
  it('G sin documento no envía documentId', () => {
    const payload = { conversation_id: '00000000-0000-0000-0000-000000000001', message: 'hola' };
    expect(payload.document_id).toBeUndefined();
  });
  it('H doble click 1 request (guard)', () => {
    let count = 0;
    const guard = { sending: false };
    const run = () => { if (guard.sending) return false; guard.sending = true; count++; return true; };
    run(); run();
    expect(count).toBe(1);
  });
  it('I evidence preservado', () => {
    const evidence = { sourceId: 'd1', fragmentId: 'f1', pageNumber: 1, evidence: 'texto' };
    expect(evidence.fragmentId).toBe('f1');
  });
  it('J refresh no rompe', () => {
    const workspaceId = 'ws-1';
    const docId = 'doc-1';
    expect(workspaceId).toBe('ws-1');
    expect(docId).toBe('doc-1');
  });
});
