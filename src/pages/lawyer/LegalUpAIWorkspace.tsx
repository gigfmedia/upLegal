import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Scale,
  PenLine,
  ChartPie,
  Plus,
  Trash2,
  FolderOpen,
  CalendarDays,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import {
  useAIWorkspaces,
  useDeleteAIWorkspace,
  type AIWorkspace,
} from '@/hooks/useAIWorkspaces';
import { NewCaseModal } from '@/components/legalup-ai/NewCaseModal';
import { AISubscriptionBanner } from '@/components/legalup-ai/AISubscriptionBanner';
import { AIPricingModal } from '@/components/legalup-ai/AIPricingModal';
import { useAISubscription } from '@/hooks/useAISubscription';
import type { AIFeatureKey } from '@/lib/aiFeatures';

const FEATURES: {
  key: AIFeatureKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  secondary?: string;
  status: 'available' | 'coming_soon';
  cta: string;
}[] = [
  {
    key: 'document_analysis',
    icon: FileText,
    title: 'Analizar documento',
    description: 'Sube un documento y obtén un análisis jurídico estructurado con IA.',
    secondary:
      'Identifica obligaciones, riesgos, alertas e información relevante del documento.',
    status: 'available',
    cta: 'Analizar documento',
  },
  {
    key: 'case_analysis',
    icon: ChartPie,
    title: 'Analizar mi caso',
    description:
      'Crea un workspace privado para organizar documentos, análisis y conversaciones de un caso.',
    status: 'available',
    cta: 'Abrir workspace',
  },
  {
    key: 'jurisprudence',
    icon: Scale,
    title: 'Investigar jurisprudencia',
    description:
      'Encuentra jurisprudencia y normativa relevante para tus casos, con fuentes verificables.',
    status: 'coming_soon',
    cta: 'Próximamente',
  },
  {
    key: 'document_drafting',
    icon: PenLine,
    title: 'Redactar documento',
    description:
      'Crea borradores jurídicos utilizando el contexto de tus casos y documentos.',
    status: 'coming_soon',
    cta: 'Próximamente',
  },
];

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

  const [createOpen, setCreateOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<AIWorkspace | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const casesRef = useRef<HTMLElement | null>(null);
  const { hasAccess } = useAISubscription();

  useEffect(() => {
    posthog.capture('ai_workspace_viewed');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ai_subscription_success') === 'true') {
      toast.success('Suscripción confirmada', {
        description: 'Tu plan LegalUp AI está activo.',
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('ai_subscription_success');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const hasCases = Array.isArray(workspaces) && workspaces.length > 0;

  const openPaywall = () => {
    posthog.capture('ai_paywall_opened', { source: 'workspace' });
    setPricingOpen(true);
  };

  const handleAvailableClick = (feature: AIFeatureKey) => {
    posthog.capture('ai_feature_clicked', { feature });
    if (!hasAccess) {
      openPaywall();
      return;
    }
    if (feature === 'document_analysis') {
      // Atajo: crea un caso → workspace → subir documento.
      setCreateOpen(true);
    } else if (feature === 'case_analysis') {
      if (hasCases) {
        casesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        setCreateOpen(true);
      }
    }
  };

  const handleComingSoonClick = (feature: AIFeatureKey) => {
    posthog.capture('ai_feature_clicked', { feature });
    toast('Próximamente', {
      description: 'Esta función estará disponible próximamente.',
    });
  };

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

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <header className="">
        <h2 className="group flex flex-wrap items-center gap-1.5 text-2xl font-bold tracking-tight text-gray-900">
          <span className="tracking-tight">LegalUp</span>
          <span className="inline-flex h-[18.4px] items-center rounded-[5px] border border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[0.6rem] font-semibold tracking-[0.14em] text-emerald-400 transition-colors group-hover:bg-emerald-400/20">
            AI
          </span>
          <span className="text-sm font-medium text-green-900">
            Tu espacio de trabajo jurídico inteligente.
          </span>
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          Analiza, investiga y trabaja tus casos desde un solo lugar.
        </p>
      </header>

      <AISubscriptionBanner />

      {/* ¿Qué necesitas hacer? */}
      <section aria-labelledby="ai-actions-title">
        <h2
          id="ai-actions-title"
          className="text-xl font-semibold tracking-tight text-gray-900"
        >
          ¿Qué necesitas hacer?
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(
            ({ key, icon: Icon, title, description, secondary, status, cta }) => {
              const available = status === 'available';
              // Una feature "disponible" solo se habilita con acceso (trial o plan).
              const enabled = available && hasAccess;
              return (
                <Card
                  key={key}
                  className={`relative flex flex-col gap-4 p-5 shadow-sm ${
                    enabled
                      ? 'border-gray-200 transition-all hover:border-green-300 hover:shadow-md'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                        enabled
                          ? 'bg-green-50 text-green-700 group-hover:bg-green-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {enabled ? (
                      <Badge className="bg-green-100 text-green-800 font-medium">
                        Disponible
                      </Badge>
                    ) : available ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 font-medium"
                      >
                        Requiere plan
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-gray-200 text-gray-500 font-medium"
                      >
                        Próximamente
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    {secondary && (
                      <p className="mt-2 text-sm text-gray-500">{secondary}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={!enabled}
                    onClick={() =>
                      available
                        ? handleAvailableClick(key)
                        : handleComingSoonClick(key)
                    }
                    className={`w-full ${
                      enabled
                        ? 'bg-gray-900 text-white hover:bg-green-900'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100'
                    }`}
                  >
                    {enabled ? cta : available ? 'Activa tu prueba' : cta}
                    {enabled && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                </Card>
              );
            }
          )}
        </div>
      </section>

      {/* Mis casos */}
      <section ref={casesRef} id="ai-cases" aria-labelledby="ai-cases-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="ai-cases-title"
              className="text-xl font-semibold tracking-tight text-gray-900"
            >
              Mis casos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Organiza tus casos y trabaja cada uno con las herramientas de LegalUp AI.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              if (!hasAccess) {
                openPaywall();
                return;
              }
              setCreateOpen(true);
            }}
            className="bg-gray-900 text-white hover:bg-green-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo caso
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
                  Analiza tu primer documento
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Crea tu primer caso, sube un PDF y descubre cómo LegalUp AI puede
                  ayudarte con tu trabajo jurídico.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    if (!hasAccess) {
                      openPaywall();
                      return;
                    }
                    setCreateOpen(true);
                  }}
                  className="mt-2 bg-green-900 text-white hover:bg-green-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear mi primer caso
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
                      <button
                        type="button"
                        onClick={() => setCaseToDelete(workspace)}
                        className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label={`Eliminar caso ${workspace.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
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

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!hasAccess) {
                          openPaywall();
                          return;
                        }
                        navigate(`/lawyer/ai/cases/${workspace.id}`);
                      }}
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

      <NewCaseModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(workspace) => navigate(`/lawyer/ai/cases/${workspace.id}`)}
      />

      <AIPricingModal open={pricingOpen} onOpenChange={setPricingOpen} />

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
