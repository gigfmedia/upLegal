import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Copy, Check, RefreshCw, Pencil } from 'lucide-react';
import { aiOperationIdentity } from '@/lib/aiOperationIdentity';
import { pollTerminalResult } from '@/lib/aiInProgressPoll';

// FASE 4.59D — Borradores del caso (V1). Sección dentro de Inteligencia,
// sin nuevo tab. Solo lectura/creación contra rutas con ownership server-side.

const getApiBaseUrl = (): string => {
  const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return (base || 'http://localhost:3001').replace(/\/+$/, '');
};

const getAccessToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export type CaseDraftListItem = {
  id: string;
  draft_type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  intelligence_snapshot_id: string | null;
};

export type CaseDraft = CaseDraftListItem & {
  instruction: string;
  content: string;
  sources: Array<Record<string, unknown>>;
  model: string | null;
};

const DRAFT_TYPE_OPTIONS = [
  { value: 'escrito', label: 'Escrito jurídico' },
  { value: 'informe', label: 'Informe / minuta' },
  { value: 'carta', label: 'Carta / comunicación formal' },
  { value: 'otro', label: 'Otro' },
];

export const AI_CASE_DRAFTS_QUERY_KEY = ['ai-case-drafts'] as const;

export function useCaseDrafts(workspaceId: string | undefined) {
  const { data, ...rest } = useQuery<CaseDraftListItem[]>({
    queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudieron cargar los borradores.');
      return body?.drafts ?? [];
    },
  });
  return { drafts: data ?? [], ...rest };
}

export function AICaseDrafts({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { drafts, isLoading } = useCaseDrafts(workspaceId);
  const [creating, setCreating] = useState(false);
  const [draftType, setDraftType] = useState('escrito');
  const [instruction, setInstruction] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDraft, setOpenDraft] = useState<CaseDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDraftById = async (id: string) => {
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo abrir el borrador.');
      setOpenDraft(body.draft);
      setEditContent(body.draft.content);
      setEditing(false);
      setOpenId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el borrador.');
    }
  };

  const generate = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const { data: { session } } = await supabase.auth.getSession();
      const identity = await aiOperationIdentity(`${session?.user?.id}:draft:${workspaceId}`, {
        draft_type: draftType,
        instruction: instruction.trim(),
      });
      // Doble click seguro: misma identidad reintenta hasta resultado terminal.
      const { res, body } = await pollTerminalResult(async () => {
        const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-AI-Operation-ID': identity.id,
          },
          body: JSON.stringify({ draft_type: draftType, instruction: instruction.trim() }),
        });
        const body = await res.json().catch(() => ({}));
        identity.complete(body);
        return { res, body };
      });
      if (!res.ok) {
        const err = new Error(body?.error || 'No se pudo generar el borrador.');
        (err as { code?: string }).code = body?.code;
        throw err;
      }
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId] });
      setInstruction('');
      setCreating(false);
      if (body?.draft?.id) void openDraftById(body.draft.id);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo generar el borrador.'),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!openId) throw new Error('Sin borrador abierto.');
      const token = await getAccessToken();
      if (!token) throw new Error('Sesión no válida.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/cases/${workspaceId}/drafts/${openId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'No se pudo guardar.');
      return body;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: [...AI_CASE_DRAFTS_QUERY_KEY, workspaceId] });
      if (body?.draft) {
        setOpenDraft(body.draft);
        setEditContent(body.draft.content);
      }
      setEditing(false);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar.'),
  });

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(editing ? editContent : openDraft?.content ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar al portapapeles.');
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-green-700" aria-hidden="true" />
          Borradores
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Convierte el contexto de este caso en un primer borrador para revisar y editar.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando borradores…</p>
        ) : drafts.length === 0 && !creating && !openDraft ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> Crear borrador
          </Button>
        ) : null}

        {creating ? (
          <div className="space-y-3 rounded border p-3">
            <div className="flex flex-wrap gap-2">
              {DRAFT_TYPE_OPTIONS.map((o) => (
                <Button
                  key={o.value}
                  size="sm"
                  variant={draftType === o.value ? 'default' : 'outline'}
                  onClick={() => setDraftType(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="¿Qué quieres preparar? Ej: borrador de contestación centrado en la falta de requerimiento previo…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={instruction.trim().length < 10 || generate.isPending}
                onClick={() => generate.mutate()}
              >
                {generate.isPending ? 'Generando…' : 'Generar borrador'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setCreating(false); setInstruction(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {openDraft ? (
          <div className="space-y-3 rounded border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{openDraft.title}</p>
              <Button size="sm" variant="outline" onClick={() => { setOpenDraft(null); setOpenId(null); }}>
                Cerrar
              </Button>
            </div>
            {editing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 max-h-96 overflow-y-auto">{openDraft.content}</pre>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyContent}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              {editing ? (
                <Button size="sm" disabled={saveEdit.isPending} onClick={() => saveEdit.mutate()}>
                  Guardar cambios
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setEditContent(openDraft.content); setEditing(true); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {drafts.length > 0 && !openDraft ? (
          <div className="space-y-2">
            {drafts.map((d) => (
              <button
                key={d.id}
                onClick={() => void openDraftById(d.id)}
                className="w-full text-left rounded border px-3 py-2 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">{d.title}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(d.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short' })}
                </span>
              </button>
            ))}
            {!creating ? (
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                <RefreshCw className="h-4 w-4 mr-1" /> Nueva versión
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
