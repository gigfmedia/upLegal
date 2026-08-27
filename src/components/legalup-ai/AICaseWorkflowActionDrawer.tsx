import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X, Clock3, FileText, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AICaseWorkflowItem } from '@/hooks/useAICaseWorkflow';
import type { AICaseIntelligence } from '@/hooks/useAIDocuments';
import { EvidenceNavigator, type EvidenceReference } from './EvidenceNavigator';
import { useState } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AICaseWorkflowItem | null;
  intelligence: AICaseIntelligence | null | undefined;
  onAsk: (question: string) => void;
  onViewDocuments: () => void;
  onComplete: () => void;
  onDismiss: () => void;
  onReopen: () => void;
  isUpdating: boolean;
};

const questionMap: Record<string, string> = {
  review_missing_information: '¿Qué información falta para completar el análisis del caso?',
  review_contradictions: '¿Qué contradicciones existen entre los documentos del caso?',
  review_risks: '¿Qué riesgos aparecen en el caso y qué evidencia de los documentos los respalda?',
};

export function AICaseWorkflowActionDrawer({
  open,
  onOpenChange,
  item,
  intelligence,
  onAsk,
  onViewDocuments,
  onComplete,
  onDismiss,
  onReopen,
  isUpdating,
}: Props) {
  const [evidenceRef, setEvidenceRef] = useState<EvidenceReference | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (!item) return null;

  const priorityLabel = item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja';
  const priorityColor = item.priority === 'high' ? 'bg-red-100 text-red-800' : item.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
  const statusLabel = item.status === 'pending' ? 'Pendiente' : item.status === 'in_progress' ? 'En revisión' : item.status === 'completed' ? 'Completado' : 'Descartado';

  const question = questionMap[item.action_id];

  return (
    <>
      <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <SheetPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex h-full w-[100vw] flex-col gap-0 border-l bg-white shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300',
              'sm:w-[90vw] sm:max-w-[90vw] md:w-[560px] md:max-w-[560px] lg:w-[640px] lg:max-w-[640px] p-0'
            )}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
              <div className="space-y-1">
                <SheetPrimitive.Title className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Clock3 className="h-4 w-4 text-green-700" aria-hidden="true" />
                  {item.title}
                </SheetPrimitive.Title>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={priorityLabel === 'Alta' ? 'bg-red-100 text-red-800' : priorityLabel === 'Media' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}>{priorityLabel}</Badge>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">{statusLabel}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                {intelligence && (
                  <p className="text-[0.7rem] text-muted-foreground">Detectado a partir de {intelligence.document_count} documento(s) · {intelligence.pending_count} pendiente(s) {intelligence.failed_count ? `· ${intelligence.failed_count} con error` : ''}</p>
                )}
              </div>
              <SheetPrimitive.Close aria-label="Cerrar" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
                <X className="h-4 w-4" aria-hidden="true" />
              </SheetPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Contexto según action_id */}
              {item.action_id === 'review_missing_information' && intelligence && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FileText className="h-4 w-4" /> Información faltante</h4>
                  {intelligence.missingInformation.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No se detectó información pendiente.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-gray-700">
                      {intelligence.missingInformation.map((m, i) => (
                        <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" /><span>{m}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {item.action_id === 'review_risks' && intelligence && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><ShieldAlert className="h-4 w-4 text-amber-600" /> Riesgos detectados</h4>
                  {intelligence.risks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No se detectaron riesgos con la información actual.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {intelligence.risks.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" /><span>{r}</span></li>
                      ))}
                    </ul>
                  )}
                  {intelligence.risks.length > 0 && question && (
                    <p className="text-xs text-muted-foreground">Pregunta sugerida: “{question}”</p>
                  )}
                </div>
              )}

              {item.action_id === 'review_contradictions' && intelligence && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><AlertTriangle className="h-4 w-4 text-red-600" /> Contradicciones</h4>
                  {intelligence.contradictions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No se detectaron contradicciones con la información actual.</p>
                  ) : (
                    intelligence.contradictions.map((c, i) => (
                      <div key={i} className="rounded border p-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700">Tema: {c.topic}</p>
                        {c.versions.map((v, j) => (
                          <div key={j} className="rounded bg-gray-50 p-2">
                            <p className="text-xs text-gray-800">{v.text}</p>
                            <p className="text-[0.65rem] text-gray-500">{v.document_filename} — {v.source_id}</p>
                            <Button variant="ghost" size="sm" className="mt-1 h-6 px-2 text-[0.65rem]" onClick={() => { setEvidenceRef({ sourceId: v.source_id, documentId: v.source_id, evidence: v.evidence, pageNumber: null, sourceType: 'document', documentFilename: v.document_filename }); setEvidenceOpen(true); }}>Ver evidencia</Button>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}

              {item.action_id === 'review_documents' && intelligence && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FileText className="h-4 w-4" /> Documentos</h4>
                  <p className="text-sm text-muted-foreground">{intelligence.pending_count} pendiente(s) · {intelligence.failed_count} con error · {intelligence.document_count} listo(s)</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {intelligence.documents.slice(0,5).map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1"><span className="truncate">{d.original_filename}</span><Badge variant="secondary" className="bg-green-50 text-green-800 text-[0.65rem]">{d.status}</Badge></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-2">
                {item.action_id !== 'review_documents' && question && item.status !== 'completed' && item.status !== 'dismissed' && (
                  <Button size="sm" disabled={isUpdating} aria-busy={isUpdating} onClick={() => { onAsk(question); onOpenChange(false); }} className="bg-green-900 text-white hover:bg-green-800">Preguntar a LegalUp AI</Button>
                )}
                {item.action_id === 'review_documents' && (
                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => { onViewDocuments(); onOpenChange(false); }}>Ver documentos</Button>
                )}
                {item.action_id !== 'review_documents' && !question && (
                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => { onViewDocuments(); onOpenChange(false); }}>Ver documentos</Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {(item.status === 'pending' || item.status === 'in_progress') && (
                  <>
                    <Button size="sm" variant="secondary" disabled={isUpdating} aria-busy={isUpdating} onClick={onComplete}>Marcar como completado</Button>
                    <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onDismiss}>Descartar</Button>
                  </>
                )}
                {(item.status === 'completed' || item.status === 'dismissed') && (
                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={onReopen}>Reabrir</Button>
                )}
              </div>
            </div>
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
      <EvidenceNavigator open={evidenceOpen} onOpenChange={setEvidenceOpen} reference={evidenceRef} surface="case_workflow_drawer" />
    </>
  );
}
