import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, FileText, Users, ListChecks, Scale, CalendarClock, ShieldAlert, Layers } from 'lucide-react';
import { useAICaseIntelligence } from '@/hooks/useAIDocuments';

export function AICaseIntelligence({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError, error, refetch } = useAICaseIntelligence(workspaceId, true);

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }
  if (isError) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-amber-900">{error instanceof Error ? error.message : 'No se pudo cargar la inteligencia del caso.'}</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-xs text-amber-800 underline">Reintentar</button>
        </CardContent>
      </Card>
    );
  }
  if (!data || data.document_count === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">Sin documentos para inteligencia del caso</p>
          <p className="text-xs text-muted-foreground">Sube documentos y analízalos para ver el resumen consolidado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Resumen del caso</CardTitle></CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{data.caseSummary}</CardContent>
      </Card>

      {data.facts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ListChecks className="h-4 w-4" /> Hechos consolidados ({data.facts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.facts.map((f, i) => (
              <div key={i} className="rounded border bg-gray-50/60 p-3">
                <p className="text-sm text-gray-800">{f.text}</p>
                <p className="mt-1 text-xs text-gray-500">Fuentes: {f.source_ids.join(', ')} {f.evidences[0]?.page_number ? `· Página ${f.evidences[0].page_number}` : ''}</p>
                {f.evidences[0]?.evidence && <details className="mt-1"><summary className="cursor-pointer text-xs text-gray-600">Ver evidencia</summary><p className="mt-1 whitespace-pre-wrap text-xs italic text-gray-600">"{f.evidences[0].evidence}"</p></details>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.parties.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Partes</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm">{data.parties.map((p,i)=><li key={i}>{p}</li>)}</ul></CardContent></Card>
      )}
      {data.obligations.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Scale className="h-4 w-4" /> Obligaciones</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm">{data.obligations.map((o,i)=><li key={i}>{o}</li>)}</ul></CardContent></Card>
      )}
      {data.deadlines.length > 0 && (
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4" /> Fechas y plazos</CardTitle></CardHeader><CardContent><ul className="space-y-1">{data.deadlines.map((d,i)=><li key={i} className="text-sm">{d.date && <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-800">{d.date}</Badge>}{d.description}</li>)}</ul></CardContent></Card>
      )}
      {data.risks.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-amber-600" /> Riesgos</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm">{data.risks.map((r,i)=><li key={i}>{r}</li>)}</ul></CardContent></Card>
      )}
      {data.contradictions.length > 0 && (
        <Card className="border-red-200 bg-red-50/60"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-600" /> Contradicciones detectadas</CardTitle></CardHeader><CardContent className="space-y-3">{data.contradictions.map((c,i)=><div key={i} className="rounded border bg-white p-2"><p className="text-xs font-medium text-gray-700">Tema: {c.topic}</p>{c.versions.map((v,j)=><div key={j} className="mt-1 text-xs"><p>{v.text}</p><p className="text-[0.65rem] text-gray-500">{v.document_filename} — {v.source_id}</p></div>)}</div>)}</CardContent></Card>
      )}
      {data.missingInformation.length > 0 && (
        <Card className="border-dashed"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Información faltante</CardTitle></CardHeader><CardContent><ul className="list-disc pl-4 text-sm text-gray-600">{data.missingInformation.map((m,i)=><li key={i}>{m}</li>)}</ul></CardContent></Card>
      )}
    </div>
  );
}
