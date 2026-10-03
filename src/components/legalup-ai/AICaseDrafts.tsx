import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Check, Pencil } from 'lucide-react';
import { aiOperationIdentity } from '@/lib/aiOperationIdentity';
import { pollTerminalResult } from '@/lib/aiInProgressPoll';

// FASE 4.59D/4.59D.2 — Redacción asistida: workspace directo de creación.
// Sin landing intermedia: el formulario siempre visible; historial debajo.
// Solo lectura/creación contra rutas con ownership server-side.

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

type DraftingAllowance = {
  plan?: string;
  drafting?: { used?: number; limit?: number | null } | null;
};

function useDraftingUsage() {
  const { data } = useQuery<{ allowance?: DraftingAllowance | null }>({
    queryKey: ['ai-usage-drafting'],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return {};
      const res = await fetch(`${getApiBaseUrl()}/api/ai/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      return body ?? {};
    },
    staleTime: 60_000,
    retry: false,
  });
  return data?.allowance ?? null;
}

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
  const allowance = useDraftingUsage();
  const draftLimit = allowance?.drafting?.limit ?? null;
  const draftUsed = allowance?.drafting?.used ?? 0;
  const isPlus = allowance?.plan === 'plus';
  const atLimit = draftLimit != null && draftLimit > 0 && draftUsed >= draftLimit;
  const noAccess = draftLimit != null && draftLimit <= 0;
  const formLocked = noAccess || atLimit;
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
      queryClient.invalidateQueries({ queryKey: ['ai-usage-drafting'] });
      setInstruction('');
      if (body?.draft?.id) void openDraftById(body.draft.id);
    },
    onError: (e) => {
      const code = (e as { code?: string })?.code;
      if (code === 'AI_MONTHLY_LIMIT_REACHED' || code === 'AI_DRAFTING_LIMIT_REACHED') {
        queryClient.invalidateQueries({ queryKey: ['ai-usage-drafting'] });
        setError(
          isPlus
            ? 'Has utilizado los 75 borradores incluidos este mes. Tu disponibilidad se renueva el próximo mes.'
            : 'Has utilizado los 30 borradores incluidos este mes.'
        );
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo generar el borrador.');
    },
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Redacción asistida</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Genera borradores utilizando la información, documentos e investigación de este caso.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {noAccess ? (
        <Card>
          <CardContent className="py-6 space-y-3">
            <p className="text-sm">La generación de borradores está incluida en los planes de pago.</p>
            <Button size="sm" asChild>
              <a href="/pro">Ver LegalUp Pro</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo borrador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo de documento</Label>
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
            </div>
            <div>
              <Label htmlFor="draft-instruction" className="text-sm font-medium mb-2 block">
                ¿Qué necesitas preparar?
              </Label>
              <Textarea
                id="draft-instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ej: borrador de contestación centrado en la falta de requerimiento previo…"
                rows={4}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                disabled={formLocked || instruction.trim().length < 10 || generate.isPending}
                onClick={() => generate.mutate()}
              >
                {generate.isPending ? 'Generando…' : 'Generar borrador'}
              </Button>
              {draftLimit != null && draftLimit > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {draftUsed} de {draftLimit} este mes
                </span>
              ) : null}
            </div>
            {atLimit ? (
              <div className="rounded border p-3 space-y-2">
                <p className="text-sm">
                  Has utilizado los {draftLimit} borradores incluidos este mes.
                </p>
                {isPlus ? (
                  <p className="text-xs text-muted-foreground">Tu disponibilidad se renueva el próximo mes.</p>
                ) : (
                  <Button size="sm" asChild>
                    <a href="/pro">Ver LegalUp Plus</a>
                  </Button>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {openDraft ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
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
                className="font-mono text-sm w-full"
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
          </CardContent>
        </Card>
      ) : null}

      {!openDraft ? (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Borradores anteriores</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando borradores…</p>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay borradores anteriores.</p>
          ) : (
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
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
