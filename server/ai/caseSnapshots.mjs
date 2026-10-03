/**
 * FASE 4.59C — snapshots versionados de Case Intelligence.
 *
 * Funciones puras + helpers de persistencia mínima. La agregación vive en la
 * ruta (sin duplicar lógica); este módulo aporta fingerprint, manifiesto y
 * versionado race-safe. Determinista, 0 provider, 0 cuota.
 */
import { createHash } from 'node:crypto';
import { getProCaseHeader } from './proCaseContext.mjs';
import { selectRelevantResearch, formatResearchLegalContext } from './researchMemory.mjs';
import { honestEvidenceLocation } from './coreAuthority.mjs';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Manifiesto de fuentes materiales. Solo señales que cambian el contenido:
 * - campos legales del caso (practice_area, description, stage)
 * - documentos presentes (ids)
 * - análisis vigentes (id + updated_at)
 * - research exitosos (ids)
 * NUNCA: status operativo, contadores UI, suscripciones, storage volátil.
 */
export function buildSourceManifest({ caseRow = null, docs = [], analyses = [], researchRows = [] } = {}) {
  const docEntries = [...new Map(
    (docs || [])
      .filter((d) => d && d.id)
      .map((d) => [d.id, { document_id: d.id, status: d.status || null }])
  ).values()].sort((a, b) => String(a.document_id).localeCompare(String(b.document_id)));
  const analysisEntries = (analyses || [])
    .filter((a) => a && a.document_id)
    .map((a) => ({
      document_id: a.document_id,
      analysis_id: a.id || null,
      updated_at: a.updated_at || a.created_at || null,
    }))
    .sort((x, y) => String(x.document_id).localeCompare(String(y.document_id)));
  const researchEntries = (researchRows || [])
    .filter((r) => r && r.id)
    .map((r) => ({ research_id: String(r.id), created_at: r.created_at || null }))
    .sort((a, b) => String(a.research_id).localeCompare(String(b.research_id)));
  return {
    case_id: (caseRow && caseRow.id) || null,
    workspace_id: (caseRow && caseRow.ai_workspace_id) || null,
    practice_area: (caseRow && caseRow.practice_area) || null,
    description: (caseRow && caseRow.description) || null,
    stage: (caseRow && caseRow.stage) || null,
    documents: docEntries,
    analyses: analysisEntries,
    research: researchEntries,
  };
}

export function fingerprintManifest(manifest) {
  return createHash('sha256').update(stableStringify(manifest)).digest('hex');
}

export function buildSnapshotFingerprint(input) {
  return fingerprintManifest(buildSourceManifest(input));
}

/**
 * Lee el último snapshot del caso (owner-scoped por construcción del caller:
 * lawyer_id + lawyer_case_id siempre filtrados).
 */
export async function readLatestSnapshot(supabase, { lawyerId, caseId }) {
  const { data, error } = await supabase
    .from('ai_case_intelligence_snapshots')
    .select('id, version, source_fingerprint, source_manifest, snapshot, created_at')
    .eq('lawyer_id', lawyerId)
    .eq('lawyer_case_id', caseId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Persiste un snapshot si el fingerprint es nuevo. Race-safe:
 * - UNIQUE(lawyer_case_id, source_fingerprint) → contenido duplicado concurrente
 *   colapsa a la fila existente (se retorna en vez de fallar).
 * - UNIQUE(lawyer_case_id, version) + reintento → dos escritores con el mismo
 *   max(version)+1 no duplican versión.
 * Retorna { snapshot: row, created: bool }.
 */
export async function persistSnapshotIfNew(supabase, { lawyerId, caseId, workspaceId, fingerprint, manifest, payload }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: existing, error: readError } = await supabase
      .from('ai_case_intelligence_snapshots')
      .select('id, version, source_fingerprint, source_manifest, snapshot, created_at')
      .eq('lawyer_id', lawyerId)
      .eq('lawyer_case_id', caseId)
      .eq('source_fingerprint', fingerprint)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) return { snapshot: existing, created: false };

    const { data: maxRow, error: maxError } = await supabase
      .from('ai_case_intelligence_snapshots')
      .select('version')
      .eq('lawyer_id', lawyerId)
      .eq('lawyer_case_id', caseId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) throw maxError;
    const version = (maxRow && Number(maxRow.version)) || 0;

    const { data: inserted, error: insertError } = await supabase
      .from('ai_case_intelligence_snapshots')
      .insert({
        lawyer_id: lawyerId,
        lawyer_case_id: caseId,
        workspace_id: workspaceId,
        version: version + 1,
        source_fingerprint: fingerprint,
        source_manifest: manifest,
        snapshot: payload,
      })
      .select('id, version, source_fingerprint, source_manifest, snapshot, created_at')
      .single();
    if (!insertError) return { snapshot: inserted, created: true };
    // 23505 unique_violation → otro escritor ganó: releer y retornar.
    const code = String(insertError.code || '');
    if (code === '23505') continue;
    throw insertError;
  }
  const fallback = await readLatestSnapshot(supabase, { lawyerId, caseId });
  if (!fallback) throw new Error('SNAPSHOT_RACE_UNRESOLVED');
  return { snapshot: fallback, created: false };
}

/**
 * Ensambla el payload de intelligence desde la agregación (misma forma que
 * sirve GET .../intelligence). Un solo lugar para payload: ruta y snapshots.
 */
export function assembleIntelligencePayload(agg, workspaceId) {
  return {
    workspace_id: workspaceId,
    proCase: agg.proCase,
    document_count: (agg.docs || []).length,
    documents: agg.docs || [],
    pending_count: (agg.pendingDocs || []).length,
    failed_count: (agg.failedDocs || []).length,
    total_documents: (agg.allDocs || []).length,
    analyses: agg.analyses || [],
    facts: agg.facts,
    parties: agg.parties,
    obligations: agg.obligations,
    deadlines: agg.deadlines,
    risks: agg.risks,
    contradictions: agg.contradictions,
    missingInformation: agg.missingInformation,
    caseSummary: agg.caseSummary || 'No hay información suficiente en los documentos para generar un resumen del caso.',
    attributionCoverage: (agg.allClaims || []).length > 0 ? 1 : 1,
    legalContext: agg.legalContext || [],
  };
}

/**
 * Bloque de snapshot para Case Chat (memoria derivada acotada).
 * Orden: resumen + hechos top + contexto legal (síntesis). Nunca evidencia
 * cruda: el snapshot no trae extracted_text. Ante conflicto, el documento
 * primario prima (regla del system prompt).
 */
export function formatSnapshotBlock(snapshot, { maxChars = 5000 } = {}) {
  const p = (snapshot && snapshot.snapshot) || snapshot || {};
  const lines = ['RESUMEN DE INTELIGENCIA DEL CASO (memoria derivada del caso; ante conflicto con un documento primario, prima el documento):'];
  if (p.caseSummary) lines.push(`Resumen: ${String(p.caseSummary).slice(0, 1500)}`);
  const counts = [];
  if (typeof p.document_count === 'number') counts.push(`${p.document_count} documentos`);
  if (Array.isArray(p.parties) && p.parties.length) counts.push(`${p.parties.length} partes`);
  if (Array.isArray(p.deadlines) && p.deadlines.length) counts.push(`${p.deadlines.length} plazos`);
  if (counts.length) lines.push(`Alcance: ${counts.join(', ')}.`);
  if (Array.isArray(p.facts) && p.facts.length) {
    const facts = p.facts.slice(0, 15).map((f) => `- ${typeof f === 'string' ? f : f.text || ''}`);
    lines.push(`Hechos consolidados:\n${facts.join('\n')}`);
  }
  if (Array.isArray(p.legalContext) && p.legalContext.length) {
    const items = p.legalContext.slice(0, 5).map((l, i) => {
      const titles = Array.isArray(l.source_titles) ? l.source_titles.slice(0, 4).join(' | ') : '';
      return `Contexto legal ${i + 1} (investigación del ${l.created_at || 'fecha no registrada'}${l.query ? ` sobre: ${l.query}` : ''}): ${String(l.synthesis || '').slice(0, 600)}${titles ? ` [Fuentes: ${titles}]` : ''}`;
    });
    lines.push(items.join('\n'));
  }
  return lines.join('\n\n').slice(0, maxChars);
}

/**
 * Resuelve el lawyer_case canónico de un workspace.
 * 0 filas → { status: 'legacy' } (sin snapshot, comportamiento actual).
 * >1 fila → { status: 'ambiguous' } (no persistir; el caller responde el
 * error canónico AI_CASE_LINK_AMBIGUOUS).
 */
export async function resolveSnapshotCase(supabase, { lawyerId, workspaceId }) {
  const { data, error } = await supabase
    .from('lawyer_cases')
    .select('id, ai_workspace_id, practice_area, description, stage, title, status')
    .eq('lawyer_id', lawyerId)
    .eq('ai_workspace_id', workspaceId);
  if (error) throw error;
  const rows = data || [];
  if (rows.length === 0) return { status: 'legacy', caseRow: null };
  if (rows.length > 1) return { status: 'ambiguous', caseRow: null };
  return { status: 'linked', caseRow: rows[0] };
}

/**
 * FASE 4.59C — agregación canónica de Case Intelligence (extraída de la ruta
 * GET sin cambios de lógica). Determinista, 0 provider. La usan la ruta
 * intelligence, snapshots y drafting: un solo lugar para la agregación.
 * Retorna todo lo que la ruta necesita para payload + fingerprint.
 */
export async function computeCaseIntelligence({ supabase, workspace, userId }) {
// Documentos del workspace (todos, para contar pendientes)
const { data: allDocs, error: allDocsError } = await supabase
  .from('ai_documents')
  .select('id, original_filename, file_path, file_size_bytes, mime_type, status, page_count, created_at')
  .eq('workspace_id', workspace.id)
  .eq('lawyer_id', userId)
  .order('created_at', { ascending: true });
if (allDocsError) throw allDocsError;
const docs = (allDocs || []).filter((d) => d.status === 'ready');
const pendingDocs = (allDocs || []).filter((d) => d.status === 'pending' || d.status === 'processing');
const failedDocs = (allDocs || []).filter((d) => d.status === 'failed');

const { data: analyses, error: analysesError } = await supabase
  .from('ai_document_analyses')
  .select('id, document_id, summary, document_type, parties, key_points, obligations, deadlines, risks, recommendations, claims, model, created_at, updated_at')
  .eq('workspace_id', workspace.id)
  .eq('lawyer_id', userId)
  .order('created_at', { ascending: true });
if (analysesError) throw analysesError;

// Mapa document_id → documento para page_number y filename
const docById = new Map((docs || []).map((d) => [d.id, d]));
const analysesByDoc = new Map((analyses || []).map((a) => [a.document_id, a]));

// Agregación de claims verificados (de analyses[].claims, ya verificados en 4.5)
const allClaims = [];
for (const a of analyses || []) {
  const claims = Array.isArray(a.claims) ? a.claims : [];
  for (const c of claims) {
    const doc = docById.get(c.source_id);
    allClaims.push({
      text: c.text,
      source_id: c.source_id,
      fragment_id: c.fragment_id || null,
      evidence: c.evidence || '',
      ...honestEvidenceLocation(c.fragment_id),
      document_filename: doc?.original_filename || c.source_id,
    });
  }
}

// Deduplicación por texto normalizado (conserva source_ids)
const deduped = new Map();
for (const c of allClaims) {
  const key = String(c.text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  if (!key) continue;
  if (!deduped.has(key)) deduped.set(key, { ...c, source_ids: [c.source_id], evidences: [c] });
  else {
    const existing = deduped.get(key);
    if (!existing.source_ids.includes(c.source_id)) {
      existing.source_ids.push(c.source_id);
      existing.evidences.push(c);
    }
  }
}
const facts = Array.from(deduped.values());

// Partes, obligaciones, fechas, riesgos consolidados (desde analyses, ya verificados)
const parties = Array.from(new Set((analyses || []).flatMap((a) => Array.isArray(a.parties) ? a.parties : []))).slice(0, 50);
const obligations = Array.from(new Set((analyses || []).flatMap((a) => Array.isArray(a.obligations) ? a.obligations : []))).slice(0, 50);
const deadlines = (analyses || []).flatMap((a) => Array.isArray(a.deadlines) ? a.deadlines : []).slice(0, 50);
const risks = Array.from(new Set((analyses || []).flatMap((a) => Array.isArray(a.risks) ? a.risks : []))).slice(0, 50);

// Contradicciones: detecta hechos con mismo tema pero valores distintos (ej. fechas/montos)
// Minimal: busca claims con mismo prefijo (primeras 3 palabras) pero texto distinto
const contradictions = [];
const byPrefix = new Map();
for (const f of facts) {
  const prefix = String(f.text || '').split(/\s+/).slice(0, 3).join(' ').toLowerCase();
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
  byPrefix.get(prefix).push(f);
}
for (const [prefix, group] of byPrefix) {
  if (group.length > 1) {
    const texts = new Set(group.map((g) => g.text));
    if (texts.size > 1) {
      contradictions.push({ topic: prefix, versions: group.map((g) => ({ text: g.text, source_id: g.source_id, document_filename: g.document_filename, evidence: g.evidence })) });
    }
  }
}

// Información faltante: si no hay claims para una categoría esperada, se reporta como no encontrada (no se inventa)
const missingInformation = [];
if (facts.length === 0) missingInformation.push('No se encontraron hechos verificados en los documentos disponibles.');
if (parties.length === 0) missingInformation.push('No se encontraron partes intervinientes en los documentos.');
if (obligations.length === 0) missingInformation.push('No se encontraron obligaciones explícitas en los documentos.');
if (deadlines.length === 0) missingInformation.push('No se encontraron fechas o plazos explícitos en los documentos.');

// Resumen del caso: concatenación de summaries verificados (sin LLM)
const caseSummary = (analyses || []).map((a) => String(a.summary || '').trim()).filter(Boolean).join('\n\n');

// FASE 4.33B: mismo encabezado en vivo para que el Command Center refleje
// el encuadre actual del caso Pro. Determinista, sin provider calls.
let proCase = null;
try {
  const resolved = await getProCaseHeader(supabase, { workspaceId: workspace.id, lawyerId: userId });
  if (resolved.status === 'linked') proCase = resolved.header;
} catch (e) {
  console.error('[LegalUpAI] pro case header failed (intelligence continues without it)', e?.message || e);
}

// FASE 4.59B: contexto legal desde investigaciones exitosas del caso.
// Explícitamente NO hechos del caso: va en `legalContext` separado para
// no mezclarse con facts/parties/obligations/deadlines evidenciados.
// Lectura acotada, sin writes, sin provider calls, sin cuota.
// (Las filas se reutilizan abajo para el fingerprint del snapshot.)
let intelResearchRows = [];
let legalContext = [];
try {
  const { data: rows, error: intelResearchError } = await supabase
    .from('ai_research_requests')
    .select('id, query, answer, sources, created_at')
    .eq('workspace_id', workspace.id)
    .eq('lawyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (intelResearchError) throw intelResearchError;
  intelResearchRows = rows || [];
  legalContext = formatResearchLegalContext(
    selectRelevantResearch({ researchList: intelResearchRows, question: '', maxItems: 5, maxChars: 8000 })
  );
} catch (e) {
  console.error('[LegalUpAI] intelligence legalContext failed (continuing without it)', e?.message || e);
  intelResearchRows = [];
  legalContext = [];
}

  return { allDocs, docs, pendingDocs, failedDocs, analyses, allClaims, facts, parties, obligations, deadlines, risks, contradictions, missingInformation, caseSummary, proCase, intelResearchRows, legalContext };
}
