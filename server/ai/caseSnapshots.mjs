/**
 * FASE 4.59C — snapshots versionados de Case Intelligence.
 *
 * Funciones puras + helpers de persistencia mínima. La agregación vive en la
 * ruta (sin duplicar lógica); este módulo aporta fingerprint, manifiesto y
 * versionado race-safe. Determinista, 0 provider, 0 cuota.
 */
import { createHash } from 'node:crypto';

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
