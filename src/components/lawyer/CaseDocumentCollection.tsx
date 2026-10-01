import { useMemo, useState } from 'react';
import { FileText, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AIDocumentUpload } from '@/components/legalup-ai/AIDocumentUpload';
import { AIDocumentPreviewDialog } from '@/components/legalup-ai/AIDocumentPreviewDialog';
import { AIDocumentStatusBadge, AIAnalysisStatusBadge } from '@/components/legalup-ai/AIDocumentStatus';
import { formatFileSize, type AIDocument, type AIDocumentListItem } from '@/hooks/useAIDocuments';
import { useAIUsage } from '@/hooks/useAIUsage';
import { normalizePlanCode } from '@/lib/aiFeatures';
import { upgradeTargetForPlan } from '@/lib/planDisplay';
import { cn } from '@/lib/utils';

type Props = {
  documents: AIDocumentListItem[];
  workspaceId?: string | null;
  ensureWorkspace?: () => Promise<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUploaded: (doc: AIDocument) => void;
  onAskDocument: (doc: AIDocumentListItem) => void;
  onRetryProcess: (id: string) => void;
  processPending: boolean;
  canChat: boolean;
  onUpgrade: () => void;
  loading: boolean;
  failed: boolean;
  onReload: () => void;
};

const fileType = (doc: AIDocumentListItem) => doc.mime_type === 'application/pdf' ? 'PDF' : (doc.original_filename.split('.').pop()?.toUpperCase() || 'Archivo');
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Case-only collection: data, processing, analysis and chat retain their shared owners. */
export function CaseDocumentCollection(props: Props) {
  const { documents, selectedId, onSelect } = props;
  const usage = useAIUsage();
  const allowance = usage.data?.allowance;
  const pool = allowance?.documents;
  const knownCapacity = !!pool && Number.isFinite(pool.used) && (pool.limit === null || Number.isFinite(pool.limit));
  const atLimit = knownCapacity && pool.limit !== null && pool.used >= pool.limit;
  const target = allowance ? upgradeTargetForPlan(allowance.plan) : null;
  const free = normalizePlanCode(allowance?.plan) === 'free_case';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState<AIDocumentListItem | null>(null);
  const filtered = useMemo(() => documents.filter(doc => {
    const matches = doc.original_filename.toLocaleLowerCase('es-CL').includes(search.trim().toLocaleLowerCase('es-CL'));
    return matches && (filter === 'all' || (filter === 'ready' ? doc.analysis_status === 'ready' : filter === 'none' ? doc.analysis_status === 'none' || doc.analysis_status === 'pending' || !doc.analysis_status : doc.analysis_status === 'failed'));
  }).sort((a, b) => b.created_at.localeCompare(a.created_at)), [documents, search, filter]);

  const status = (doc: AIDocumentListItem) => <AIDocumentStatusBadge status={doc.status} />;
  const analysis = (doc: AIDocumentListItem) => doc.status === 'ready' ? <AIAnalysisStatusBadge status={doc.analysis_status} /> : <span aria-label="Análisis no disponible">—</span>;
  const name = (doc: AIDocumentListItem) => <button type="button" onClick={() => onSelect(doc.id)} className="flex min-w-0 max-w-full items-center gap-3 text-left font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
    <FileText className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
    <span className="min-w-0"><span className="block truncate" title={doc.original_filename}>{doc.original_filename}</span><span className="block text-xs font-normal text-muted-foreground">{fileType(doc)}{doc.file_size_bytes != null ? ` · ${formatFileSize(doc.file_size_bytes)}` : ''}</span></span>
  </button>;
  const actions = (doc: AIDocumentListItem) => <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Acciones de ${doc.original_filename}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={() => setPreview(doc)}>Ver documento</DropdownMenuItem>
      <DropdownMenuItem disabled={doc.status !== 'ready' || doc.analysis_status === 'processing'} onSelect={() => onSelect(doc.id)}>
        {doc.analysis_status === 'ready' ? 'Ver análisis' : doc.analysis_status === 'processing' ? 'Analizando…' : 'Analizar con LegalUp AI'}
      </DropdownMenuItem>
      {doc.status === 'ready' && <DropdownMenuItem onSelect={() => props.canChat ? props.onAskDocument(doc) : props.onUpgrade()}>Preguntar sobre este documento</DropdownMenuItem>}
      {doc.status === 'failed' && <DropdownMenuItem disabled={props.processPending} onSelect={() => props.onRetryProcess(doc.id)}>Reintentar procesamiento</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;

  return <section id="ai-documents-section" className="min-w-0" aria-label="Documentos del caso">
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-lg font-semibold">Documentos</h2><p className="mt-1 text-sm text-muted-foreground">Centraliza los antecedentes de este caso y trabaja con LegalUp AI sobre ellos.</p></div>
      <div className="space-y-2 sm:max-w-xs sm:text-right">
        {usage.isLoading ? <Skeleton className="h-5 w-44" /> : knownCapacity ? <div aria-live="polite"><p className="text-sm font-medium">{pool.used}{pool.limit !== null ? ` de ${pool.limit}` : ''} documentos utilizados</p><p className="text-xs text-muted-foreground">{free ? 'Capacidad de tu primer caso.' : 'Incluye los documentos de todos tus casos.'}</p></div> : <div className="text-xs text-muted-foreground">No pudimos consultar la capacidad. <button type="button" className="underline" onClick={() => usage.refetch()}>Reintentar</button></div>}
        {atLimit ? target ? <Button onClick={props.onUpgrade}>Ver LegalUp {target === 'plus' ? 'Plus' : 'Pro'}</Button> : <Button disabled>Subir documento</Button> : <AIDocumentUpload compact workspaceId={props.workspaceId || undefined} ensureWorkspace={props.ensureWorkspace} onUploaded={props.onUploaded} disabled={usage.isLoading} />}
      </div>
    </header>
    {atLimit && <div role="status" className="rounded-md border bg-muted/30 p-3 text-sm"><p>{free ? 'Has alcanzado el límite de documentos de tu primer caso.' : target ? 'Has alcanzado el límite de documentos de tu plan.' : `Has alcanzado el límite de ${pool.limit} documentos actuales.`}</p><p className="text-muted-foreground">{free ? 'Este límite corresponde a tu primer caso.' : 'El límite considera los documentos de todos tus casos.'}</p></div>}
    {props.loading ? <div aria-label="Cargando documentos" className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div> : props.failed ? <div role="alert"><p>No se pudieron cargar los documentos.</p><Button variant="outline" onClick={props.onReload}>Reintentar</Button></div> : documents.length === 0 ? <div className="rounded-lg border border-dashed px-4 py-10 text-center"><h3 className="font-medium">Aún no hay documentos</h3><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Sube contratos, escritos u otros antecedentes para mantener la información del caso centralizada y trabajar con LegalUp AI.</p><p className="mt-3 text-xs text-muted-foreground">Usa Subir documento para agregar tu primer PDF · máx. 20 MB</p></div> : <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar documentos del caso" placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <select aria-label="Filtrar por análisis" className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos</option><option value="ready">Analizados</option><option value="none">Sin analizar</option><option value="failed">Con error de análisis</option></select>
      </div>
      {filtered.length === 0 ? <div className="rounded-lg border p-8 text-center"><p>No encontramos documentos con esos criterios.</p><Button variant="link" onClick={() => { setSearch(''); setFilter('all'); }}>Limpiar filtros</Button></div> : <>
        <div className="hidden rounded-lg border lg:block" data-testid="desktop-document-table"><table className="w-full table-fixed text-sm"><caption className="sr-only">Documentos de este caso</caption><thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="w-[36%] p-3">Documento</th><th className="w-[13%] p-3">Estado</th><th className="w-[15%] p-3">Análisis IA</th><th className="w-[16%] p-3">Subido</th><th className="w-[12%] p-3">Tamaño</th><th className="w-[8%] p-3 font-medium">Acciones</th></tr></thead><tbody>{filtered.map(doc => <tr key={doc.id} onClick={() => onSelect(doc.id)} className={cn('cursor-pointer border-b last:border-0 hover:bg-muted/30', selectedId === doc.id && 'bg-green-50/60')}><td className="p-3" onClick={e => e.stopPropagation()}>{name(doc)}</td><td className="p-3">{status(doc)}</td><td className="p-3">{analysis(doc)}</td><td className="p-3 text-xs text-muted-foreground">{dateLabel(doc.created_at)}</td><td className="p-3 text-xs text-muted-foreground">{doc.file_size_bytes != null ? formatFileSize(doc.file_size_bytes) : '—'}</td><td className="p-2" onClick={e => e.stopPropagation()}>{actions(doc)}</td></tr>)}</tbody></table></div>
        <ul className="space-y-2 lg:hidden" aria-label="Lista de documentos" data-testid="mobile-document-cards">{filtered.map(doc => <li key={doc.id} className={cn('min-w-0 rounded-lg border p-3', selectedId === doc.id && 'border-green-600 bg-green-50/50')}><div className="flex min-w-0 items-start justify-between gap-2">{name(doc)}<div className="shrink-0">{actions(doc)}</div></div><div className="mt-3 flex flex-wrap items-center gap-2 text-xs">{status(doc)}{analysis(doc)}<span className="text-muted-foreground">{dateLabel(doc.created_at)}</span></div></li>)}</ul>
      </>}
    </>}
      </CardContent>
    </Card>
    <AIDocumentPreviewDialog doc={preview} open={!!preview} onOpenChange={open => { if (!open) setPreview(null); }} />
  </section>;
}
