import { useCallback, useRef, useState } from 'react';
import { useProvisionAIWorkspace } from '@/hooks/useLawyerCases';

/** Case-only orchestration; the existing endpoint remains the ownership authority. */
export function useCaseDocumentWorkspace(caseId: string | undefined, linkedId: string | null) {
  const { provision } = useProvisionAIWorkspace();
  const cache = useRef(new Map<string, string>());
  const pending = useRef(new Map<string, Promise<string>>());
  const [resolved, setResolved] = useState<{ caseId: string; id: string } | null>(null);
  const workspaceId = linkedId || (resolved?.caseId === caseId ? resolved.id : null);
  const ensureWorkspace = useCallback(async () => {
    if (!caseId) throw new Error('Caso no encontrado.');
    const existing = linkedId || cache.current.get(caseId);
    if (existing) return existing;
    let request = pending.current.get(caseId);
    if (!request) {
      request = provision(caseId).then(result => {
        const id = result.workspace.id;
        cache.current.set(caseId, id);
        setResolved({ caseId, id });
        return id;
      }).catch(error => {
        console.error('[CaseDocuments] preparation failed', error);
        if (error?.status === 401 || /sesión/i.test(error?.message || '')) throw error;
        throw Object.assign(new Error('No pudimos preparar este caso para documentos. Intenta nuevamente.'), { cause: error });
      }).finally(() => pending.current.delete(caseId));
      pending.current.set(caseId, request);
    }
    return request;
  }, [caseId, linkedId, provision]);
  return { workspaceId, ensureWorkspace };
}
