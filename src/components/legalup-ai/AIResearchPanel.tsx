import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AIThinkingIndicator } from './AIThinkingIndicator';
import { constrainResumenOverstatement } from './resumenConstraint';
import {
  useAICaseResearch,
  useRunAIResearch,
  buildSourceEvidencePlan,
  type AIResearchError,
  type AIResearchRequest,
  type AIResearchSource,
} from '@/hooks/useAIResearch';

type AIResearchPanelProps = {
  workspaceId: string;
};

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{escapeHtml(part.slice(2, -2))}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-900">
          {escapeHtml(part.slice(1, -1))}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{escapeHtml(part.slice(1, -1))}</em>;
    }
    return <span key={index}>{escapeHtml(part)}</span>;
  });
}

function MarkdownText({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const output: Array<{ type: 'p' | 'ul' | 'ol'; items?: string[]; text?: string }> = [];
    let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
    const flush = () => {
      if (list) {
        output.push({ type: list.type, items: list.items });
        list = null;
      }
    };
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trimEnd();
      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (bullet || numbered) {
        if (!list || list.type !== (numbered ? 'ol' : 'ul')) {
          flush();
          list = { type: numbered ? 'ol' : 'ul', items: [] };
        }
        list.items.push((bullet || numbered)![1]);
      } else if (line.trim() === '') {
        flush();
      } else {
        flush();
        output.push({ type: 'p', text: line });
      }
    }
    flush();
    return output;
  }, [content]);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === 'ul' || block.type === 'ol') {
          const ListTag = block.type === 'ul' ? 'ul' : 'ol';
          return (
            <ListTag key={index} className="ml-4 list-disc space-y-1">
              {(block.items ?? []).map((item, itemIndex) => (
                <li key={itemIndex} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={index} className="leading-relaxed">
            {renderInline(block.text ?? '')}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fase 4.1.3 · Respuesta breve: se usa constrainResumenOverstatement (módulo
// resumenConstraint.ts) para no mostrar extensiones de enumeraciones cerradas
// sin respaldo ("…, y bloqueo, entre otros").
// ---------------------------------------------------------------------------

function formatDate(value: string): string {
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy, HH:mm", { locale: es });
  } catch {
    return value;
  }
}

function sourceBadgeKind(source: AIResearchSource) {
  switch (source.kind) {
    case 'jurisprudencia':
      return 'bg-purple-100 text-purple-800';
    case 'normativa':
      return 'bg-blue-100 text-blue-800';
    case 'doctrina':
      return 'bg-amber-100 text-amber-800';
    case 'document':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

const AUTHORITY_LABELS: Record<string, string> = {
  vinculante: 'Norma vinculante',
  persuasiva: 'No vinculante',
  doctrinal: 'Doctrina · no vinculante',
  informativa: 'Informativa',
};

const VIGENCY_LABELS: Record<string, string> = {
  vigente: 'Vigente',
  diferida: 'Con vigencia diferida por fecha',
  derogada: 'Derogada',
  modificada: 'Modificada',
  desconocida: 'Vigencia no determinada',
  no_aplica: 'No aplica',
};

const KIND_GROUP_ORDER: Array<AIResearchSource['kind']> = [
  'document',
  'normativa',
  'jurisprudencia',
  'doctrina',
];

const KIND_GROUP_META: Record<
  AIResearchSource['kind'],
  { label: string; headingClass: string }
> = {
  // Fase 4.2.6: los hechos del caso (evidencia documental) van primero, antes
  // de las fuentes jurídicas que los analizan.
  document: {
    label: 'Documentos del caso',
    headingClass: 'text-teal-800',
  },
  normativa: {
    label: 'Normativa',
    headingClass: 'text-blue-800',
  },
  jurisprudencia: {
    label: 'Jurisprudencia',
    headingClass: 'text-purple-800',
  },
  doctrina: {
    label: 'Doctrina (no vinculante)',
    headingClass: 'text-amber-800',
  },
};

const NORM_TYPE_LABELS: Record<string, string> = {
  ley: 'Ley',
  decreto: 'Decreto',
  decreto_ley: 'Decreto Ley',
  dfl: 'DFL',
  codigo: 'Código',
  reglamento: 'Reglamento',
  resolucion: 'Resolución',
  constitucion: 'Constitución',
  otra: 'Norma',
};

/** Norma "21719" → "21.719" (formato chileno). Conserva el dado si ya lleva separadores. */
function formatNormNumber(value?: string | null): string {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/[.,]/.test(s)) return s.replace(/,/g, '.');
  if (/^\d{1,6}$/.test(s)) return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s;
}

const CHILEAN_MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** "2024-12-13" → "13-DIC-2024" (usado en las líneas de publicación/vigencia). */
function chileanDate(value?: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const [, year, month, day] = m;
  return `${day}-${CHILEAN_MONTHS[Number(month) - 1] ?? month}-${year}`;
}

function hasVerifiedClaims(source: AIResearchSource): boolean {
  return (source.claims ?? []).some((c) => c.verified);
}

export function SourceClaims({ source }: { source: AIResearchSource }) {
  const plan = useMemo(() => buildSourceEvidencePlan(source), [source]);
  const isDocument = source.kind === 'document';

  if (plan.primary.length === 0) return null;

  return (
    <div className="mt-2 space-y-2 border-t border-gray-200 pt-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-gray-500">
        {isDocument ? 'Evidencia del documento' : 'Evidencia'}
      </p>
      {plan.primary.map((claim, index) => (
        <div key={index} className="rounded bg-white/70 p-2">
          <p className="text-xs font-medium text-gray-900">
            {claim.article && (
              <span className="mr-1 rounded bg-blue-100 px-1 py-0.5 font-semibold text-blue-800">
                {claim.article}
              </span>
            )}
            {claim.afirmacion}
          </p>
          {claim.evidencia && (
            <p className="mt-1 text-xs italic text-gray-600">"{claim.evidencia}"</p>
          )}
          {claim.fragment_id && (
            <p className="mt-1 flex items-center gap-1.5 text-[0.6rem] text-gray-400">
              <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-500">
                {claim.fragment_id}
              </span>
              <span>{isDocument ? 'fragmento del documento' : 'fragmento de la fuente'}</span>
            </p>
          )}
          {claim.vigencia_nota && (
            <p className="mt-1 text-[0.65rem] font-medium text-indigo-700">{claim.vigencia_nota}</p>
          )}
        </div>
      ))}

      {plan.context.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[0.65rem] font-medium text-gray-500 hover:text-gray-700">
            Ver contexto de la fuente ({plan.context.length})
          </summary>
          <div className="mt-1 space-y-1">
            {plan.context.map((frag) => (
              <p key={frag.id ?? frag.article} className="text-[0.68rem] text-gray-500">
                <span className="font-semibold">{frag.article}</span>: {frag.text}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SourceItem({ source }: { source: AIResearchSource }) {
  const kindLabel =
    source.kind === 'jurisprudencia'
      ? 'Jurisprudencia'
      : source.kind === 'normativa'
        ? 'Normativa'
        : source.kind === 'document'
          ? 'Documento'
          : 'Doctrina';
  const authority =
    AUTHORITY_LABELS[source.legal_authority ?? ''] ??
    source.legal_authority ??
    '';
  const vigency = VIGENCY_LABELS[source.vigency ?? ''] ?? '';

  // Fase 4.0.4: presentación profesional de una norma (Publicada / Entrada en
  // vigencia / Autoridad · Vigencia) en lugar de un paréntesis con la fecha,
  // que podría confundirse con la fecha de vigencia.
  const metadata = source.metadata as
    | { fechaPublicacion?: string; fechaEntradaVigencia?: string | null; idNorma?: string }
    | null
    | undefined;

  const isNormalizedNormativa =
    source.kind === 'normativa' && metadata && (metadata.fechaPublicacion || metadata.fechaEntradaVigencia);

  if (isNormalizedNormativa) {
    const typeLabel = NORM_TYPE_LABELS[source.norm_type ?? ''] ?? 'Norma';
    const num = formatNormNumber(source.norm_number);
    const title = `${typeLabel}${num ? ` N° ${num}` : ''}`;
    const fechaPublicacion = chileanDate(metadata.fechaPublicacion);
    const fechaEntrada = chileanDate(metadata.fechaEntradaVigencia);
    const autoridadVigencia = [authority, vigency].filter(Boolean);

    return (
      <li className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-200">
            <FileText className="h-3 w-3 text-blue-700" aria-hidden="true" />
          </span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {kindLabel}
          </Badge>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-900 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Ver fuente
            </a>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold text-gray-900">{title || source.citation}</p>
        {fechaPublicacion && <p className="mt-1 text-xs text-gray-600">Publicada: {fechaPublicacion}</p>}
        {fechaEntrada && <p className="text-xs text-gray-600">Entrada en vigencia: {fechaEntrada}</p>}
        {autoridadVigencia.length > 0 && (
          <p className="mt-0.5 text-[0.68rem] font-medium text-gray-500">
            {autoridadVigencia.join(' · ')}
          </p>
        )}
        {source.excerpt && !hasVerifiedClaims(source) && (
          <p className="mt-1 line-clamp-3 text-xs text-gray-600">{source.excerpt}</p>
        )}
        <SourceClaims source={source} />
      </li>
    );
  }

  const vigencyClass =
    source.vigency === 'derogada'
      ? 'bg-red-100 text-red-800'
      : source.vigency === 'diferida'
        ? 'bg-indigo-100 text-indigo-800'
        : source.vigency === 'desconocida'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-gray-100 text-gray-600';
  return (
    <li className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-200">
          {source.kind === 'jurisprudencia' ? (
            <Landmark className="h-3 w-3 text-emerald-700" aria-hidden="true" />
          ) : source.kind === 'normativa' ? (
            <FileText className="h-3 w-3 text-blue-700" aria-hidden="true" />
          ) : source.kind === 'document' ? (
            <FileText className="h-3 w-3 text-teal-700" aria-hidden="true" />
          ) : (
            <Scale className="h-3 w-3 text-amber-700" aria-hidden="true" />
          )}
        </span>
        <Badge variant="secondary" className={sourceBadgeKind(source)}>
          {kindLabel}
        </Badge>
        {source.kind === 'document' && (
          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-teal-800">
            Documento privado del caso
          </span>
        )}
        {authority && (
          <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[0.65rem] font-medium text-white">
            {authority}
          </span>
        )}
        {source.vigency && (
          <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-medium ${vigencyClass}`}>
            {vigency}
          </span>
        )}
        {source.date && <span className="text-xs text-gray-500">{source.date}</span>}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-900 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Ver fuente
          </a>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-900">{source.citation}</p>
      {source.vigencia_detail && (
        <p className="mt-0.5 text-[0.68rem] text-gray-500">{source.vigencia_detail}</p>
      )}
      {source.excerpt && !hasVerifiedClaims(source) && (
        <p className="mt-1 line-clamp-3 text-xs text-gray-600">{source.excerpt}</p>
      )}
      <SourceClaims source={source} />
    </li>
  );
}

function GroupedSources({ sources }: { sources: AIResearchSource[] }) {
  const groups = useMemo(() => {
    const result: Array<{ kind: AIResearchSource['kind']; items: AIResearchSource[] }> = [];
    for (const kind of KIND_GROUP_ORDER) {
      const items = sources.filter((s) => s.kind === kind);
      if (items.length > 0) result.push({ kind, items });
    }
    return result;
  }, [sources]);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.kind}>
          <h4
            className={`mb-1.5 text-xs font-semibold uppercase tracking-wide ${KIND_GROUP_META[group.kind].headingClass}`}
          >
            {KIND_GROUP_META[group.kind].label}
          </h4>
          <ul className="space-y-2">
            {group.items.map((source) => (
              <SourceItem key={source.id} source={source} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function errorToMessage(error: AIResearchError | null): string {
  switch (error?.code) {
    case 'NO_SOURCES_FOUND':
      return 'No encontramos jurisprudencia ni normativa en las fuentes públicas consultadas. Prueba con otros términos.';
    case 'AI_RESEARCH_QUERY_TOO_VAGUE':
      return 'Formula una pregunta jurídica o indica una materia específica para iniciar la investigación.';
    case 'CONTEXT_TOO_LARGE':
      return 'Hay demasiadas fuentes para procesarlas en una sola consulta. Acota la pregunta.';
    case 'AI_NOT_CONFIGURED':
      return 'El servicio de IA no está configurado. Contacta al equipo de LegalUp.';
    case 'OUTPUT_TOKEN_LIMIT':
      return 'La respuesta superó el presupuesto de tokens. Intenta con una consulta más acotada.';
    case 'AI_PROVIDER_RATE_LIMITED':
      return 'El proveedor de IA está temporalmente limitado. Intenta nuevamente en unos minutos.';
    case 'AI_PROVIDER_TIMEOUT':
      return 'El servicio de IA está tardando más de lo esperado. Intenta nuevamente.';
    case 'AI_PROVIDER_EMPTY_RESPONSE':
      return 'El proveedor de IA no devolvió contenido. Intenta nuevamente en unos minutos.';
    case 'AI_PROVIDER_CALL_LIMIT':
      return 'Se alcanzó el límite de llamadas para esta consulta. Intenta nuevamente en unos minutos.';
    case 'AI_PROVIDER_INVALID_RESPONSE':
      return 'El modelo de IA no devolvió una respuesta válida. Intenta nuevamente en unos minutos.';
    case 'AI_PROVIDER_NETWORK':
      return 'No se pudo conectar con el proveedor de IA. Intenta nuevamente en unos minutos.';
    case 'AI_PROVIDER_SERVER_ERROR':
      return 'El proveedor de IA presentó un error temporal. Intenta nuevamente en unos minutos.';
    case 'AI_PROVIDER_AUTH':
      return 'No se pudo autenticar con el proveedor de IA. Contacta al equipo de LegalUp.';
    default:
      return error?.message || 'No pudimos completar la investigación. Intenta nuevamente.';
  }
}

// Errores del proveedor ante los que tiene sentido ofrecer "Reintentar".
// NO incluye errores de búsqueda/validación (NO_SOURCES_FOUND,
// CONTEXT_TOO_LARGE), de configuración (AI_NOT_CONFIGURED) ni de
// autenticación (AI_PROVIDER_AUTH).
const RETRIABLE_CODES = new Set([
  'AI_PROVIDER_RATE_LIMITED',
  'AI_PROVIDER_TIMEOUT',
  'AI_PROVIDER_EMPTY_RESPONSE',
  'AI_PROVIDER_CALL_LIMIT',
  'AI_PROVIDER_INVALID_RESPONSE',
  'AI_PROVIDER_NETWORK',
  'AI_PROVIDER_SERVER_ERROR',
  'AI_PROVIDER_ERROR',
  'OUTPUT_TOKEN_LIMIT',
]);

export function AIResearchPanel({ workspaceId }: AIResearchPanelProps) {
  const researchQuery = useAICaseResearch(workspaceId, true);
  const runMutation = useRunAIResearch(workspaceId);

  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastQuery, setLastQuery] = useState('');
  const [freshId, setFreshId] = useState<string | null>(null);

  const history = useMemo(() => researchQuery.data ?? [], [researchQuery.data]);

  // Fase 4.2.18: fallo técnico de carga del historial de investigaciones. Solo
  // se registra el contador de intentos fallidos; nunca el contenido.
  const lastResearchFailureRef = useRef(0);
  useEffect(() => {
    if (researchQuery.isError && researchQuery.failureCount > lastResearchFailureRef.current) {
      lastResearchFailureRef.current = researchQuery.failureCount;
      posthog.capture('ai_research_history_load_failed', {
        failure_count: researchQuery.failureCount,
      });
    }
  }, [researchQuery.isError, researchQuery.failureCount]);

  const runResearch = (query: string) => {
    setWarnings([]);
    posthog.capture('ai_jurisprudence_research_started', {
      query_length: query.length,
    });
    runMutation.mutate(
      { query },
      {
        onSuccess: (data) => {
          setInput('');
          setWarnings(data.warnings ?? []);
          if (data.research) {
            setExpanded(data.research.id);
            setFreshId(data.research.id);
            // La animación de "respuesta lista" hace 2 pulsos (~5s): al
            // terminar se limpia freshId para quitar también el borde verde.
            window.setTimeout(() => {
              setFreshId((cur) => (cur === data.research.id ? null : cur));
            }, 5100);
          }
          posthog.capture('ai_jurisprudence_research_completed', {
            source_count: data.sources?.length ?? 0,
          });
        },
        onError: (err) => {
          posthog.capture('ai_jurisprudence_research_failed', {
            error_code: err.code || 'provider_error',
          });
        },
      }
    );
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || runMutation.isPending) return;
    setLastQuery(trimmed);
    runResearch(trimmed);
  };

  const handleRetry = () => {
    if (!lastQuery || runMutation.isPending) return;
    runResearch(lastQuery);
  };

  const canRetry =
    !!runMutation.error && !!lastQuery && RETRIABLE_CODES.has(runMutation.error.code ?? '');

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-green-700" aria-hidden="true" />
          Investigar jurisprudencia
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Busca jurisprudencia, normativa y doctrina chilena real en fuentes
          públicas verificables, vinculadas a este caso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej.: ¿Qué dice la jurisprudencia sobre la indemnización por despido injustificado?"
            disabled={runMutation.isPending}
            aria-label="Consulta de jurisprudencia"
            rows={5}
            className="resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Fuentes: Tribunal Constitucional · BCN/LeyChile · Doctrina académica.
            </p>
            
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={runMutation.isPending || input.trim().length === 0}
              className="shrink-0 bg-green-900 text-white hover:bg-green-800"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Investigando…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  Investigar
                </>
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {runMutation.isPending && (
            <motion.div
              key="research-thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AIThinkingIndicator
                stages={['Pensando', 'Investigando jurisprudencia', 'Preparando la respuesta']}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {runMutation.error && (
            <motion.div
              key="research-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-xs text-amber-900">
                {errorToMessage(runMutation.error)}
              </p>
              {canRetry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={runMutation.isPending}
                  className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Reintentar
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {warnings.length > 0 && (
            <motion.div
              key="research-warnings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-amber-900"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{warning}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {researchQuery.isLoading ? (
          <div className="space-y-2 py-2">
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
          </div>
        ) : researchQuery.isError && history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden="true" />
            <p className="text-sm font-medium text-amber-900">
              No pudimos cargar tus investigaciones.
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Hubo un problema de conexión. Reintenta para volver a verlas.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => researchQuery.refetch()}
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : history.length === 0 && !runMutation.isPending ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
            <Landmark className="h-8 w-8 text-gray-300" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-600">Sin investigaciones aún</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Usa el buscador para obtener jurisprudencia y normativa con fuentes
              verificables. Cada investigación queda guardada en este caso.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <ResearchItem
                key={item.id}
                item={item}
                fresh={!!item.answer && item.id === freshId}
                expanded={expanded === item.id}
                onToggle={() =>
                  setExpanded((prev) => (prev === item.id ? null : item.id))
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ResearchItem({
  item,
  fresh,
  expanded,
  onToggle,
}: {
  item: AIResearchRequest;
  fresh: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`rounded-lg border ${fresh ? 'research-ready-pulse border-emerald-200' : 'border-gray-200'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{item.query}</p>
          <p className="text-xs text-gray-500">
            {formatDate(item.created_at)} · {item.sources.length}{' '}
            {item.sources.length === 1 ? 'fuente' : 'fuentes'}
          </p>
        </div>
        <span className="text-xs text-gray-400">{expanded ? '−' : '+'}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-gray-200 px-4 py-4">
              <div className="text-sm text-gray-700">
                <MarkdownText content={constrainResumenOverstatement(item.answer, item.sources)} />
              </div>
              {item.sources.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    Fuentes verificables
                  </p>
                  <GroupedSources sources={item.sources} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}