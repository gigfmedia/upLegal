import { describe, it, expect } from 'vitest';
import {
  computeDocumentPollInterval,
  createDocumentPollingState,
  DOCUMENTS_POLL_INTERVAL_MS,
  DOCUMENTS_STUCK_PROCESSING_MS,
  type AIDocumentListItem,
} from '@/hooks/useAIDocuments';

const MIN = 60 * 1000;

function doc(overrides: Partial<AIDocumentListItem>): AIDocumentListItem {
  return {
    id: 'doc-1',
    lawyer_id: 'lawyer-1',
    workspace_id: 'ws-1',
    original_filename: 'a.pdf',
    file_path: 'bucket/a',
    file_size_bytes: 100,
    mime_type: 'application/pdf',
    status: 'pending',
    page_count: null,
    analysis_status: null,
    analysis_error: null,
    model: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Polling de documentos LegalUp AI (guard anti loop)', () => {
  it('processing → continúa polling cada 4s', () => {
    const state = createDocumentPollingState();
    const docs = [doc({ status: 'processing' })];
    expect(computeDocumentPollInterval(state, docs, 0)).toBe(DOCUMENTS_POLL_INTERVAL_MS);
    expect(computeDocumentPollInterval(state, docs, 4000)).toBe(DOCUMENTS_POLL_INTERVAL_MS);
  });

  it('processing durante <10 min → continúa', () => {
    const state = createDocumentPollingState();
    const docs = [doc({ status: 'processing' })];
    computeDocumentPollInterval(state, docs, 0);
    expect(computeDocumentPollInterval(state, docs, 5 * MIN)).toBe(
      DOCUMENTS_POLL_INTERVAL_MS
    );
    expect(computeDocumentPollInterval(state, docs, 9 * MIN)).toBe(
      DOCUMENTS_POLL_INTERVAL_MS
    );
  });

  it('processing durante ≥10 min → deja de hacer polling', () => {
    const state = createDocumentPollingState();
    const docs = [doc({ status: 'processing' })];
    computeDocumentPollInterval(state, docs, 0);
    expect(computeDocumentPollInterval(state, docs, DOCUMENTS_STUCK_PROCESSING_MS)).toBe(
      false
    );
    // Una vez alcanzado el límite, no vuelve a armar polling aunque se siga llamando.
    expect(computeDocumentPollInterval(state, docs, DOCUMENTS_STUCK_PROCESSING_MS + 5 * MIN)).toBe(
      false
    );
  });

  it('completed/failed → deja de hacer polling', () => {
    const state = createDocumentPollingState();
    const docs = [doc({ status: 'processing' })];
    computeDocumentPollInterval(state, docs, 0);
    const doneDocs = [doc({ status: 'completed', analysis_status: 'ready' })];
    expect(computeDocumentPollInterval(state, doneDocs, 1000)).toBe(false);
  });

  it('si vuelve a aparecer un nuevo procesamiento, el límite de 10 min comienza nuevamente', () => {
    const state = createDocumentPollingState();

    // Documento A se atasca y se detiene el polling.
    const docA = [doc({ id: 'a', status: 'processing' })];
    computeDocumentPollInterval(state, docA, 0);
    expect(computeDocumentPollInterval(state, docA, DOCUMENTS_STUCK_PROCESSING_MS)).toBe(false);

    // Aparece un documento B nuevo en processing: se reanuda el polling.
    const docB = [doc({ id: 'b', status: 'processing' })];
    expect(computeDocumentPollInterval(state, docB, DOCUMENTS_STUCK_PROCESSING_MS)).toBe(
      DOCUMENTS_POLL_INTERVAL_MS
    );
    // B continúa mientras no lleve ≥10 min continuos.
    expect(
      computeDocumentPollInterval(state, docB, DOCUMENTS_STUCK_PROCESSING_MS + 5 * MIN)
    ).toBe(DOCUMENTS_POLL_INTERVAL_MS);
  });

  it('un documento atascado no se reactiva al "remontar": el marcador persiste en la sesión del módulo', () => {
    const state = createDocumentPollingState();
    const docs = [doc({ status: 'processing' })];
    computeDocumentPollInterval(state, docs, 0);
    computeDocumentPollInterval(state, docs, DOCUMENTS_STUCK_PROCESSING_MS); // llega al límite

    // Aunque se llame "de nuevo" sin documentos fresh, se mantiene detenido.
    expect(computeDocumentPollInterval(state, docs, DOCUMENTS_STUCK_PROCESSING_MS + MIN)).toBe(false);
  });
});