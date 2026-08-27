import type { AICaseIntelligence } from '@/hooks/useAIDocuments';
import type { AICaseWorkflowItem } from '@/hooks/useAICaseWorkflow';

export type CaseBriefHighlight = {
  id: string;
  category: 'risk' | 'contradiction' | 'missing' | 'fact';
  title: string;
  priority: 'high' | 'medium' | 'low';
  evidence?: { sourceId: string; fragmentId: string | null; pageNumber: number | null; evidence: string; documentFilename?: string } | null;
  actionId?: string;
};

export type CaseBrief = {
  documentCount: number;
  factCount: number;
  riskCount: number;
  contradictionCount: number;
  missingInformationCount: number;
  status: { label: string; color: string; description: string };
  highlights: CaseBriefHighlight[];
  nextActions: AICaseWorkflowItem[];
};

function getCaseStatusBrief(intelligence: AICaseIntelligence, workflow: AICaseWorkflowItem[]): CaseBrief['status'] {
  const hasContradictions = intelligence.contradictions.length > 0;
  const hasRisks = intelligence.risks.length > 0;
  const hasMissing = intelligence.missingInformation.length > 0;
  const pending = workflow.filter((w) => w.status === 'pending' || w.status === 'in_progress').length;
  if (hasContradictions) return { label: 'Hay contradicciones detectadas', color: 'bg-red-100 text-red-800', description: 'Revisa las contradicciones entre documentos.' };
  if (hasRisks) return { label: 'Hay riesgos que requieren revisión', color: 'bg-amber-100 text-amber-800', description: 'Existen riesgos que deberían revisarse.' };
  if (hasMissing) return { label: 'Hay información pendiente de revisar', color: 'bg-blue-100 text-blue-800', description: 'Falta información relevante para completar el análisis.' };
  if (pending > 0) return { label: 'Información suficiente para continuar', color: 'bg-green-100 text-green-800', description: `${pending} acción(es) pendiente(s).` };
  if (intelligence.document_count > 0) return { label: 'Información suficiente para continuar', color: 'bg-green-100 text-green-800', description: 'No hay pendientes críticos.' };
  return { label: 'En revisión', color: 'bg-gray-100 text-gray-600', description: 'Aún no hay documentos suficientes.' };
}

export function deriveCaseBrief(
  intelligence: AICaseIntelligence | null | undefined,
  workflowItems: AICaseWorkflowItem[] | undefined,
  documents?: { length: number } | null
): CaseBrief | null {
  if (!intelligence) return null;
  const workflow = workflowItems ?? [];
  const documentCount = intelligence.document_count ?? documents?.length ?? 0;
  const factCount = intelligence.facts?.length ?? 0;
  const riskCount = intelligence.risks?.length ?? 0;
  const contradictionCount = intelligence.contradictions?.length ?? 0;
  const missingInformationCount = intelligence.missingInformation?.length ?? 0;

  const status = getCaseStatusBrief(intelligence, workflow);

  const highlights: CaseBriefHighlight[] = [];
  // Contradictions high
  for (const c of intelligence.contradictions.slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({
      id: `contradiction-${c.topic}`,
      category: 'contradiction',
      title: `Contradicción: ${c.topic}`,
      priority: 'high',
      evidence: c.versions[0] ? { sourceId: c.versions[0].source_id, fragmentId: null, pageNumber: null, evidence: c.versions[0].evidence, documentFilename: c.versions[0].document_filename } : null,
      actionId: 'review_contradictions',
    });
  }
  // Missing high
  for (const m of intelligence.missingInformation.slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({ id: `missing-${m.slice(0,20)}`, category: 'missing', title: m, priority: 'high', evidence: null, actionId: 'review_missing_information' });
  }
  // Risks medium
  for (const r of intelligence.risks.slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({ id: `risk-${r.slice(0,20)}`, category: 'risk', title: r, priority: 'medium', evidence: null, actionId: 'review_risks' });
  }
  // Facts low
  for (const f of intelligence.facts.slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({
      id: `fact-${f.text.slice(0,20)}`,
      category: 'fact',
      title: f.text,
      priority: 'low',
      evidence: f.evidences?.[0] ? { sourceId: f.source_ids[0], fragmentId: f.evidences[0].fragment_id, pageNumber: f.evidences[0].page_number, evidence: f.evidences[0].evidence, documentFilename: f.evidences[0].document_filename } : null,
    });
  }

  // Sort by priority high->medium->low (already inserted in that order, but ensure)
  const order = { high: 0, medium: 1, low: 2 } as const;
  highlights.sort((a, b) => order[a.priority] - order[b.priority]);

  const pendingActions = workflow
    .filter((w) => w.status === 'pending' || w.status === 'in_progress')
    .sort((a, b) => {
      const po = { high: 0, medium: 1, low: 2 } as const;
      const so = { in_progress: 0, pending: 1 } as const;
      const s = (so[a.status as keyof typeof so] ?? 9) - (so[b.status as keyof typeof so] ?? 9);
      if (s !== 0) return s;
      const p = (po[a.priority as keyof typeof po] ?? 9) - (po[b.priority as keyof typeof po] ?? 9);
      if (p !== 0) return p;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, 3);

  return {
    documentCount,
    factCount,
    riskCount,
    contradictionCount,
    missingInformationCount,
    status,
    highlights: highlights.slice(0, 3),
    nextActions: pendingActions,
  };
}
