import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarClock,
  CheckCircle2,
  FileQuestion,
  Gavel,
  Info,
  ListChecks,
  Loader2,
  Scale,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AI_MODELS } from '@/lib/aiModels';
import type { AIDocumentAnalysis } from '@/hooks/useAIDocuments';

type Deadline = { date: string; description: string };
type Section = {
  summary: string;
  document_type: string;
  parties: string[];
  key_points: string[];
  obligations: string[];
  deadlines: Deadline[];
  risks: string[];
  recommendations: string[];
};

function normalizeAnalysis(analysis: AIDocumentAnalysis): Section {
  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  const deadlines = Array.isArray(analysis.deadlines)
    ? analysis.deadlines.map((item) => {
        if (typeof item === 'string') return { date: '', description: item };
        const obj = item as { date?: unknown; description?: unknown };
        return {
          date: typeof obj.date === 'string' ? obj.date : '',
          description: typeof obj.description === 'string' ? obj.description : '',
        };
      })
    : [];

  return {
    summary: analysis.summary || '',
    document_type: analysis.document_type || '',
    parties: asStringArray(analysis.parties),
    key_points: asStringArray(analysis.key_points),
    obligations: asStringArray(analysis.obligations),
    deadlines,
    risks: asStringArray(analysis.risks),
    recommendations: asStringArray(analysis.recommendations),
  };
}

function SectionList({
  title,
  icon,
  items,
  claims,
  tone = 'default',
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  claims?: Array<{ text: string; evidence: string; page_number: number | null; source_id: string }>;
  tone?: 'default' | 'warning' | 'success';
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50/60'
      : tone === 'success'
        ? 'border-green-200 bg-green-50/60'
        : 'border-gray-200 bg-gray-50/60';

  const findClaim = (text: string) => (claims ?? []).find((c) => c.text === text);

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => {
          const claim = findClaim(item);
          return (
            <li key={index} className="flex flex-col gap-1 text-sm text-gray-700">
              <div className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                <span className="whitespace-pre-wrap">{item}</span>
              </div>
              {claim?.evidence && (
                <details className="ml-4 mt-1 rounded bg-white/70 p-2 text-xs">
                  <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">Ver evidencia {claim.page_number ? `· Página ${claim.page_number}` : ''}</summary>
                  <p className="mt-1 italic text-gray-600">"{claim.evidence}"</p>
                  <p className="mt-1 text-[0.65rem] text-gray-400">Documento: {claim.source_id} {claim.page_number ? `· Página ${claim.page_number}` : ''}</p>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatAnalysisDate(value: string): string {
  try {
    return format(parseISO(value), "d 'de' MMMM yyyy, HH:mm", { locale: es });
  } catch {
    return value;
  }
}

type AIAnalysisViewProps = {
  analysis: AIDocumentAnalysis | null;
  model: string;
  analyzing: boolean;
  onModelChange: (model: string) => void;
  onAnalyze: () => void;
};

export function AIAnalysisView({
  analysis,
  model,
  analyzing,
  onModelChange,
  onAnalyze,
}: AIAnalysisViewProps) {
  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-gray-900">Analiza este documento</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              LegalUp AI revisará el PDF y generará un resumen, obligaciones,
              plazos, riesgos y recomendaciones preliminares.
            </p>
          </div>
          <div className="mt-1 flex w-full flex-col items-center gap-2">
            <div className="flex w-full max-w-md items-center justify-center gap-2">
              <Select value={model} onValueChange={onModelChange} disabled={analyzing}>
                <SelectTrigger className="min-w-0 flex-1 text-left" aria-label="Modelo de IA">
                  <SelectValue placeholder="Modelo" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={onAnalyze}
                disabled={analyzing}
                className="shrink-0 bg-green-900 text-white hover:bg-green-500"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Analizando…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    Analizar documento
                  </>
                )}
              </Button>
            </div>
            {analyzing && (
              <p className="text-xs text-muted-foreground">
                Esto puede tomar un momento. No cierres la página.
              </p>
            )}
          </div>
          <p className="mx-auto mt-2 flex max-w-md items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Análisis preliminar generado por IA. No constituye asesoría legal
            profesional.
          </p>
        </CardContent>
      </Card>
    );
  }

  const section = normalizeAnalysis(analysis);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-green-50 text-green-800">
            <Gavel className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {section.document_type || 'Documento'}
          </Badge>
          <Badge variant="outline" className="text-gray-600">
            Modelo: {model}
          </Badge>
          {analysis.model && analysis.model !== model && (
            <Badge variant="outline" className="text-gray-500">
              Último análisis: {analysis.model}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Select value={model} onValueChange={onModelChange} disabled={analyzing}>
            <SelectTrigger className="min-w-0 flex-1 text-left sm:flex-none sm:w-56" aria-label="Modelo de IA">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={onAnalyze}
            disabled={analyzing}
            className="border-green-900 text-green-900 bg-green-300 hover:bg-green-400"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Analizando…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Reanalizar
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {section.summary}
        </CardContent>
      </Card>

      {section.parties.length > 0 && (
        <SectionList
          title="Partes intervinientes"
          icon={<Users className="h-4 w-4 text-gray-500" aria-hidden="true" />}
          items={section.parties}
          claims={analysis.claims as unknown as Array<{ text: string; evidence: string; page_number: number | null; source_id: string }>}
        />
      )}

      {section.key_points.length > 0 && (
        <SectionList
          title="Puntos clave"
          icon={<ListChecks className="h-4 w-4 text-gray-500" aria-hidden="true" />}
          items={section.key_points}
          claims={analysis.claims as unknown as Array<{ text: string; evidence: string; page_number: number | null; source_id: string }>}
        />
      )}

      {section.obligations.length > 0 && (
        <SectionList
          title="Obligaciones"
          icon={<Scale className="h-4 w-4 text-gray-500" aria-hidden="true" />}
          items={section.obligations}
          claims={analysis.claims as unknown as Array<{ text: string; evidence: string; page_number: number | null; source_id: string }>}
        />
      )}

      {section.deadlines.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CalendarClock className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Plazos y fechas clave
          </h3>
          <ul className="space-y-2">
            {section.deadlines.map((deadline, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                {deadline.date ? (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {deadline.date}
                  </Badge>
                ) : null}
                <span className="whitespace-pre-wrap">{deadline.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section.risks.length > 0 && (
        <SectionList
          title="Riesgos y alertas"
          icon={<ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />}
          items={section.risks}
          claims={analysis.claims as unknown as Array<{ text: string; evidence: string; page_number: number | null; source_id: string }>}
          tone="warning"
        />
      )}

      {section.recommendations.length > 0 && (
        <SectionList
          title="Recomendaciones"
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />}
          items={section.recommendations}
          claims={analysis.claims as unknown as Array<{ text: string; evidence: string; page_number: number | null; source_id: string }>}
          tone="success"
        />
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileQuestion className="h-4 w-4 shrink-0" aria-hidden="true" />
        Generado el {formatAnalysisDate(analysis.created_at)}. Análisis preliminar
        de IA; no constituye asesoría legal profesional.
      </p>
    </div>
  );
}
