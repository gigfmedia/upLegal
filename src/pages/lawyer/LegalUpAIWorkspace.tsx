import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  FolderOpen,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  useAIWorkspaces,
  useDeleteAIWorkspace,
  type AIWorkspace,
} from '@/hooks/useAIWorkspaces';
import { EditCaseModal } from '@/components/legalup-ai/EditCaseModal';
import { SharedCaseCard } from '@/components/legalup-ai/SharedCaseCard';
import { useLawyerCases } from '@/hooks/useLawyerCases';

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
                <SharedCaseCard
                  key={workspace.id}
                  title={workspace.name}
                  practiceArea={workspace.practice_area}
                  description={workspace.description}
                  createdAt={workspace.created_at}
                  updatedAt={workspace.updated_at}
                  workspaceId={workspace.id}
                  onOpen={() => openWorkspace(workspace.id)}
                  onTimeline={() => openWorkspace(workspace.id, 'timeline')}
                  onEdit={() => setCaseToEdit(workspace)}
                  onDelete={() => setCaseToDelete(workspace)}
                />
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
