import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteAIDocument, type AIDocumentListItem } from '@/hooks/useAIDocuments';
import { resolveSelectedDocument } from '@/lib/aiDocumentSelection';
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) } } }));
const victim = { id: 'deleted', analysis_status: 'ready', created_at: '2026-10-02' } as AIDocumentListItem;
const previous = { id: 'previous', analysis_status: 'ready', created_at: '2026-10-01' } as AIDocumentListItem;
const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('Document deletion cache consistency', () => {
  it('uses authenticated DELETE and invalidates capacity, collection, analysis and intelligence only after success', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const { result } = renderHook(() => useDeleteAIDocument(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await act(async () => { await result.current.mutateAsync(victim); });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ai/documents/deleted'), { method: 'DELETE', headers: { Authorization: 'Bearer fixture' } });
    expect(invalidate.mock.calls.map(([arg]) => arg?.queryKey)).toEqual(expect.arrayContaining([['ai-documents'], ['ai-usage'], ['ai-document-analyses'], ['ai-case-intelligence'], ['ai-case-latest-analysis']]));
    // The same selection resolver used by Documents/Overview must discard a deleted id.
    expect(resolveSelectedDocument([previous], victim.id)?.id).toBe(previous.id);
    expect(resolveSelectedDocument([], victim.id)).toBeNull();
  });
  it('failed storage/DB deletion remains an error and does not announce freed capacity', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'No se pudo eliminar el documento.' }) });
    const { result } = renderHook(() => useDeleteAIDocument(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await act(async () => { await expect(result.current.mutateAsync(victim)).rejects.toThrow('No se pudo eliminar'); });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
