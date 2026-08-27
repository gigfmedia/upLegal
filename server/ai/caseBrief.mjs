// Fase 4.23: Case Brief helper puro — deriva métricas y highlights desde intelligence + workflow
export function deriveCaseBrief(intelligence, workflowItems, documents) {
  if (!intelligence) return null;
  const workflow = workflowItems ?? [];
  const documentCount = intelligence.document_count ?? documents?.length ?? 0;
  const factCount = intelligence.facts?.length ?? 0;
  const riskCount = intelligence.risks?.length ?? 0;
  const contradictionCount = intelligence.contradictions?.length ?? 0;
  const missingInformationCount = intelligence.missingInformation?.length ?? 0;

  let status;
  const hasContradictions = intelligence.contradictions.length > 0;
  const hasRisks = intelligence.risks.length > 0;
  const hasMissing = intelligence.missingInformation.length > 0;
  const pending = workflow.filter((w) => w.status === 'pending' || w.status === 'in_progress').length;
  if (hasContradictions) status = { label: 'Hay contradicciones detectadas', color: 'bg-red-100 text-red-800', description: 'Revisa las contradicciones entre documentos.' };
  else if (hasRisks) status = { label: 'Hay riesgos que requieren revisión', color: 'bg-amber-100 text-amber-800', description: 'Existen riesgos que deberían revisarse.' };
  else if (hasMissing) status = { label: 'Hay información pendiente de revisar', color: 'bg-blue-100 text-blue-800', description: 'Falta información relevante para completar el análisis.' };
  else if (pending > 0) status = { label: 'Información suficiente para continuar', color: 'bg-green-100 text-green-800', description: `${pending} acción(es) pendiente(s).` };
  else if (intelligence.document_count > 0) status = { label: 'Información suficiente para continuar', color: 'bg-green-100 text-green-800', description: 'No hay pendientes críticos.' };
  else status = { label: 'En revisión', color: 'bg-gray-100 text-gray-600', description: 'Aún no hay documentos suficientes.' };

  const highlights = [];
  for (const c of (intelligence.contradictions || []).slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({ id: `contradiction-${c.topic}`, category: 'contradiction', title: `Contradicción: ${c.topic}`, priority: 'high', evidence: c.versions?.[0] ? { sourceId: c.versions[0].source_id, fragmentId: null, pageNumber: null, evidence: c.versions[0].evidence } : null, actionId: 'review_contradictions' });
  }
  for (const m of (intelligence.missingInformation || []).slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({ id: `missing-${m.slice(0,20)}`, category: 'missing', title: m, priority: 'high', evidence: null, actionId: 'review_missing_information' });
  }
  for (const r of (intelligence.risks || []).slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({ id: `risk-${r.slice(0,20)}`, category: 'risk', title: r, priority: 'medium', evidence: null, actionId: 'review_risks' });
  }
  for (const f of (intelligence.facts || []).slice(0, 3)) {
    if (highlights.length >= 3) break;
    highlights.push({ id: `fact-${f.text.slice(0,20)}`, category: 'fact', title: f.text, priority: 'low', evidence: f.evidences?.[0] ? { sourceId: f.source_ids[0], fragmentId: f.evidences[0].fragment_id, pageNumber: f.evidences[0].page_number, evidence: f.evidences[0].evidence } : null });
  }
  const order = { high: 0, medium: 1, low: 2 };
  highlights.sort((a, b) => order[a.priority] - order[b.priority]);

  const pendingActions = workflow.filter((w) => w.status === 'pending' || w.status === 'in_progress').sort((a, b) => {
    const po = { high: 0, medium: 1, low: 2 };
    const so = { in_progress: 0, pending: 1 };
    const s = (so[a.status] ?? 9) - (so[b.status] ?? 9);
    if (s !== 0) return s;
    const p = (po[a.priority] ?? 9) - (po[b.priority] ?? 9);
    if (p !== 0) return p;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }).slice(0, 3);

  return { documentCount, factCount, riskCount, contradictionCount, missingInformationCount, status, highlights: highlights.slice(0, 3), nextActions: pendingActions };
}
