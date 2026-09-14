import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  FileText,
  Trash2,
  Pencil,
  FolderOpen,
  CalendarDays,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  useAIWorkspaces,
  useDeleteAIWorkspace,
  type AIWorkspace,
} from '@/hooks/useAIWorkspaces';
import { EditCaseModal } from '@/components/legalup-ai/EditCaseModal';
import { AICaseTimelinePreview } from '@/components/legalup-ai/AICaseTimelinePreview';
import { useLawyerCases } from '@/hooks/useLawyerCases';

function formatDate(value: string): string {
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

function WorkspaceCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}

export default function LegalUpAIWorkspace() {
  const navigate = useNavigate();
  const { data: workspaces, isLoading, isError, error, refetch } = useAIWorkspaces();
  const deleteCase = useDeleteAIWorkspace();

  const [caseToDelete, setCaseToDelete] = useState<AIWorkspace | null>(null);
  const [caseToEdit, setCaseToEdit] = useState<AIWorkspace | null>(null);
  const { cases: proCases, loading: proCasesLoading } = useLawyerCases();
  const caseIdByWorkspaceId = new Map(
    (proCases ?? []).map((c) => [c.ai_workspace_id, c.id] as const).filter(([ws]) => !!ws) as [string, string][]
  );
  const openWorkspace = (workspaceId: string, tab?: string) => {
    const linkedCaseId = caseIdByWorkspaceId.get(workspaceId);
    if (linkedCaseId) {
      navigate(`/lawyer/cases/${linkedCaseId}?tab=ai`);
      return;
    }
    navigate(`/lawyer/ai/cases/${workspaceId}${tab ? `?tab=${tab}` : ''}`);
  };

  useEffect(() => {
    posthog.capture('ai_workspace_viewed');
  }, []);

  const hasCases = Array.isArray(workspaces) && workspaces.length > 0;

  const confirmDelete = async () => {
    if (!caseToDelete) return;
    try {
      await deleteCase.mutateAsync(caseToDelete.id);
      toast.success('Caso eliminado', {
        description: `"${caseToDelete.name}" se eliminó correctamente.`,
      });
      setCaseToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el caso.');
    }
  };

  // 4.34H: compatibility listing only (after all hooks). No workspaces →
  // canonical Cases. All workspaces linked → canonical Cases. Only orphan
  // history stays on this surface. Waits for both queries to avoid
  // redirecting on incomplete link data.
  if (!isLoading && !proCasesLoading && !isError && Array.isArray(workspaces)) {
    const hasOrphans = workspaces.some((w) => !caseIdByWorkspaceId.has(w.id));
    if (!hasOrphans) return <Navigate to="/lawyer/cases" replace />;
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Historial de casos
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Aquí puedes consultar casos anteriores que aún no están vinculados a LegalUp Pro.
          </p>
        </div>
      </header>

      {/* Mis casos */}
      <section id="ai-cases" aria-labelledby="ai-cases-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="ai-cases-title"
              className="text-xl font-semibold tracking-tight text-gray-900"
            >
              Casos anteriores
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Abre tus casos existentes. Para empezar uno nuevo, ve a Casos de LegalUp Pro.
            </p>
          </div>
          <Button type="button" onClick={() => navigate('/lawyer/cases')} className="bg-gray-900 text-white hover:bg-green-900">
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Crear caso en LegalUp Pro
          </Button>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WorkspaceCardSkeleton />
              <WorkspaceCardSkeleton />
              <WorkspaceCardSkeleton />
              <WorkspaceCardSkeleton />
            </div>
          ) : isError ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden="true" />
                <p className="font-medium text-gray-900">No pudimos cargar tus casos</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : !hasCases ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
                  <FolderOpen className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="text-lg font-medium text-gray-900">
                  Tus nuevos casos están en LegalUp Pro
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  LegalUp AI ahora trabaja dentro de tus casos de LegalUp Pro.
                </p>
                <Button type="button" onClick={() => navigate('/lawyer/cases')} className="mt-2 bg-green-900 text-white hover:bg-green-800">
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                  Ver mis casos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaces!.map((workspace) => (
                <Card
                  key={workspace.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-900">
                          {workspace.name}
                        </h3>
                        {workspace.practice_area ? (
                          <Badge
                            variant="secondary"
                            className="mt-1 bg-green-50 text-green-800"
                          >
                            {workspace.practice_area}
                          </Badge>
                        ) : (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Sin área jurídica
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCaseToEdit(workspace)}
                          className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                          aria-label={`Editar caso ${workspace.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCaseToDelete(workspace)}
                          className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`Eliminar caso ${workspace.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {workspace.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {workspace.description}
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        Creado: {formatDate(workspace.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Actualizado: {formatDate(workspace.updated_at)}
                      </span>
                    </div>

                      <AICaseTimelinePreview
                        workspaceId={workspace.id}
                        onOpen={() => openWorkspace(workspace.id, 'timeline')}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openWorkspace(workspace.id)}
                        className="mt-1 w-full border-gray-900 text-green-900 bg-green-300 hover:bg-green-400 hover:text-green-900"
                      >
                      <FolderOpen className="h-4 w-4" aria-hidden="true" />
                      Abrir caso
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <EditCaseModal
        caseToEdit={caseToEdit}
        onOpenChange={(open) => {
          if (!open) setCaseToEdit(null);
        }}
      />

      <ConfirmDialog
        open={caseToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCaseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar caso"
        description={`¿Seguro que quieres eliminar "${caseToDelete?.name ?? ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDeleting={deleteCase.isPending}
      />
    </div>
  );
}
