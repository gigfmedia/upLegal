// FASE 4.33B — Live Pro case header for LegalUp AI (runtime composition).
//
// lawyer_cases remains the business-case authority; ai_workspaces remains the
// AI workspace authority. This helper reads CURRENT Pro case data at request
// time so AI reasons over live values, never a provisioning-time copy.
// NOTHING is written back: no sync into ai_workspaces, no migration.

/** Max chars of the Pro case description sent to the model (bounded header). */
export const PRO_CASE_DESCRIPTION_MAX_CHARS = 2000;

const clean = (v, max) => {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Resolve the live Pro case linked to an AI workspace.
 *
 * @param {object} supabase - server supabase client (service role in routes)
 * @param {{ workspaceId: string, lawyerId: string }} input
 * @returns {Promise<{ status: 'linked'|'legacy'|'ambiguous', header: object|null }>}
 * - 0 owned links → { status: 'legacy', header: null } (orphan workspaces keep working)
 * - 1 owned link → { status: 'linked', header: {...} } (live values)
 * - >1 owned links → { status: 'ambiguous', header: null } (fail closed: never
 *   attach the wrong case; no UNIQUE constraint is added in this phase)
 */
export async function getProCaseHeader(supabase, { workspaceId, lawyerId }) {
  if (!workspaceId || !lawyerId) return { status: 'legacy', header: null };

  const { data: cases, error } = await supabase
    .from('lawyer_cases')
    .select('id, title, description, status, practice_area, client_id')
    .eq('ai_workspace_id', workspaceId)
    .eq('lawyer_id', lawyerId);
  if (error) throw error;

  const rows = Array.isArray(cases) ? cases : [];
  if (rows.length === 0) return { status: 'legacy', header: null };
  if (rows.length > 1) {
    console.warn('[LegalUpAI] ambiguous workspace link', JSON.stringify({
      workspace_id: workspaceId,
      linked_cases: rows.length,
    }));
    return { status: 'ambiguous', header: null };
  }

  const c = rows[0];
  let clientName = null;
  if (c.client_id) {
    const { data: client, error: clientError } = await supabase
      .from('lawyer_clients')
      .select('name')
      .eq('id', c.client_id)
      .eq('lawyer_id', lawyerId)
      .maybeSingle();
    if (clientError) throw clientError;
    // Name only: email/phone/notes never leave the DB for AI context.
    clientName = clean(client?.name, 200);
  }

  return {
    status: 'linked',
    header: {
      caseId: c.id,
      title: clean(c.title, 300),
      description: clean(c.description, PRO_CASE_DESCRIPTION_MAX_CHARS),
      status: clean(c.status, 60),
      practiceArea: clean(c.practice_area, 120),
      clientName,
    },
  };
}

/**
 * Render the case block. Only present fields are emitted; labels match the
 * existing Spanish prompt style. Returns '' when there is no linked header
 * (legacy path unchanged).
 */
export function formatProCaseBlock(header) {
  if (!header) return '';
  const lines = ['CASO (datos en vivo del caso Pro)'];
  if (header.title) lines.push(`Nombre: ${header.title}`);
  if (header.clientName) lines.push(`Cliente: ${header.clientName}`);
  if (header.practiceArea) lines.push(`Área: ${header.practiceArea}`);
  if (header.status) lines.push(`Estado: ${header.status}`);
  if (header.description) lines.push(`Descripción: ${header.description}`);
  if (lines.length === 1) return '';
  return lines.join('\n');
}
