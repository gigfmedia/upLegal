import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, FileText, Users, ListChecks, Scale, CalendarClock, ShieldAlert, Layers, ArrowRight, MessageSquare, Brain } from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';
import { useAICaseIntelligence } from '@/hooks/useAIDocuments';
import { EvidenceNavigator, type EvidenceReference } from './EvidenceNavigator';

function getCaseStatus(data: { contradictions: unknown[]; risks: unknown[]; missingInformation: unknown[]; document_count: number }) {
  if (data.contradictions.length > 0) return { label: 'Con contradicciones', color: 'bg-red-100 text-red-800' };
  if (data.risks.length > 0) return { label: 'Con riesgos', color: 'bg-amber-100 text-amber-800' };
  if (data.missingInformation.length > 0) return { label: 'Información incompleta', color: 'bg-blue-100 text-blue-800' };
  if (data.document_count > 0) return { label: 'Listo para análisis', color: 'bg-green-100 text-green-800' };
  return { label: 'En revisión', color: 'bg-gray-100 text-gray-600' };
}

export function AICaseIntelligence({ workspaceId, onQuestionClick }: { workspaceId: string; onQuestionClick?: (q: string) => void }) {
  const { data, isLoading, isError, error, refetch } = useAICaseIntelligence(workspaceId, true);
  const [evidenceRef, setEvidenceRef] = useState<EvidenceReference | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  useEffect(() => {
    if (data) posthog.capture('ai_case_intelligence_viewed', { case_id: workspaceId, documents_ready: data.document_count });
  }, [data, workspaceId]);

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }
  if (isError) {
    return (
      <Card className="rounded-lg border p-4 border-amber-200 bg-amber-50/60">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-amber-900">{error instanceof Error ? error.message : 'No se pudo cargar la inteligencia del caso.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-xs text-amber-800 underline">Reintentar</button>
        </CardContent>
      </Card>
    );
  }
  if (!data || (data.document_count === 0 && data.pending_count === 0 && data.failed_count === 0)) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">Sin documentos para inteligencia del caso</p>
          <p className="text-xs text-muted-foreground">Sube un documento para comenzar a construir la inteligencia del caso.</p>
        </CardContent>
      </Card>
    );
  }

  const status = getCaseStatus(data);
  const nextActions: Array<{ label: string; action: string }> = [];
  if (data.contradictions.length > 0) nextActions.push({ label: 'Revisar documentos con información contradictoria', action: 'review_contradictions' });
  else if (data.missingInformation.length > 0) nextActions.push({ label: 'Completar información pendiente del caso', action: 'review_missing_information' });
  else if (data.risks.length > 0) nextActions.push({ label: 'Revisar los riesgos identificados', action: 'review_risks' });
  else if (data.pending_count > 0) nextActions.push({ label: `Analizar ${data.pending_count} documento(s) pendiente(s)`, action: 'review_documents' });
  else nextActions.push({ label: 'Revisar el análisis completo del caso', action: 'review_obligations' });

  const quickQuestions = [
    '¿Cuál es el hecho principal del caso?',
    '¿Qué obligaciones aparecen en los documentos?',
    '¿Qué riesgos aparecen en el caso?',
    '¿Qué información contradictoria existe?',
    '¿Qué información falta para completar el análisis?',
  ];

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-green-700" aria-hidden="true" />
          Inteligencia del caso
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Análisis estructurado de tus documentos con IA para identificar hechos,
          obligaciones, riesgos y contradicciones del caso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={status.color}>{status.label}</Badge>
          <span className="text-xs text-muted-foreground">{data.document_count} documento(s) listo(s){data.pending_count > 0 ? ` · ${data.pending_count} pendiente(s)` : ''}</span>
        </div>

        {data.pending_count > 0 && (
          <Card className="border-blue-200 bg-blue-50/60">
            <CardContent className="py-3 text-sm text-blue-900">{data.pending_count} documento(s) todavía no están disponibles para el análisis del caso.</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Resumen del caso</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{data.caseSummary}</CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/60">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ArrowRight className="h-4 w-4" /> Siguiente paso</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {nextActions.map((a) => (
              <Button
                key={a.action}
                variant="outline"
                size="sm"
                onClick={() => {
                  posthog.capture('ai_case_intelligence_action_clicked', { action: a.action });
                  if (a.action === 'review_missing_information') {
                    onQuestionClick?.('¿Qué información falta para completar el análisis de este caso?');
                  } else {
                    document.getElementById(`intelligence-${a.action}`)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {a.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" /> Preguntas sugeridas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <Button key={q} variant="secondary" size="sm" className="text-xs" onClick={() => { posthog.capture('ai_case_intelligence_action_clicked', { action: 'open_chat', question: q.length }); onQuestionClick?.(q); }}>{q}</Button>
            ))}
          </CardContent>
        </Card>

        {data.facts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4" /> Hechos consolidados ({data.facts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.facts.map((f, i) => (
                <div key={i} className="rounded border bg-gray-50/60 p-3">
                  <p className="text-sm text-gray-800">{f.text}</p>
                  <p className="mt-1 text-xs text-gray-500">Fuentes: {f.source_ids.join(', ')} {f.evidences[0]?.page_number ? `· Página ${f.evidences[0].page_number}` : ''}</p>
                  {f.evidences[0]?.evidence && (
                    <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" onClick={() => { setEvidenceRef({ sourceId: f.source_ids[0], documentId: f.source_ids[0], fragmentId: f.evidences[0].fragment_id || null, pageNumber: f.evidences[0].page_number, evidence: f.evidences[0].evidence, sourceType: 'document', documentFilename: f.evidences[0].document_filename }); setEvidenceOpen(true); }}>
                      Ver evidencia
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data.parties.length > 0 && (
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Partes</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm">{data.parties.map((p,i)=><li key={i}>{p}.</li>)}</ul></CardContent></Card>
        )}
        {data.obligations.length > 0 && (
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Scale className="h-4 w-4" /> Obligaciones</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm">{data.obligations.map((o,i)=><li key={i}>{o}.</li>)}</ul></CardContent></Card>
        )}
        {data.deadlines.length > 0 && (
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4" /> Fechas y plazos</CardTitle></CardHeader><CardContent><ul className="space-y-1">{data.deadlines.map((d,i)=><li key={i} className="text-sm">{d.date && <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-800">{d.date}</Badge>}{d.description}.</li>)}</ul></CardContent></Card>
        )}
        {data.risks.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/60"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-amber-600" /> Riesgos</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm">{data.risks.map((r,i)=><li key={i}>{r}.</li>)}</ul></CardContent></Card>
        )}
        {data.contradictions.length > 0 && (
          <Card className="border-red-200 bg-red-50/60"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-600" /> Contradicciones detectadas</CardTitle></CardHeader><CardContent className="space-y-3">{data.contradictions.map((c,i)=><div key={i} className="rounded border bg-white p-2"><p className="text-xs font-medium text-gray-700">Tema: {c.topic}</p>{c.versions.map((v,j)=><div key={j} className="mt-1 text-xs"><p>{v.text}</p><p className="text-[0.65rem] text-gray-500">{v.document_filename} — {v.source_id}</p><Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-[0.65rem]" onClick={() => { setEvidenceRef({ sourceId: v.source_id, documentId: v.source_id, evidence: v.evidence, pageNumber: null, sourceType: 'document', documentFilename: v.document_filename }); setEvidenceOpen(true); }}>Ver evidencia</Button></div>)}</div>)}</CardContent></Card>
        )}
        {data.missingInformation.length > 0 && (
          <Card className="border-dashed"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Información faltante</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm text-gray-600">{data.missingInformation.map((m,i)=><li key={i}>{m}</li>)}</ul></CardContent></Card>
        )}

        <EvidenceNavigator open={evidenceOpen} onOpenChange={setEvidenceOpen} reference={evidenceRef} surface="case_intelligence" />
        </CardContent>
      </Card>
  );
}
