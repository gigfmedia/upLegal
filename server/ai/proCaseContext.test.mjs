import { describe, it, expect } from 'vitest';
import {
  getProCaseHeader,
  formatProCaseBlock,
  PRO_CASE_DESCRIPTION_MAX_CHARS,
} from './proCaseContext.mjs';
import { buildChatContext } from './legalChatPrompt.mjs';

// Fake supabase with recorded queries (ownership enforced like RLS).
function createFakeDb({ cases = [], clients = [] } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select() {
          const filters = [];
          const builder = {
            eq(col, val) {
              filters.push([col, val]);
              return builder;
            },
            maybeSingle() {
              calls.push({ table, filters });
              if (table === 'lawyer_clients') {
                const id = filters.find(([c]) => c === 'id')?.[1];
                const lawyer = filters.find(([c]) => c === 'lawyer_id')?.[1];
                const row = clients.find((c) => c.id === id && c.lawyer_id === lawyer);
                return Promise.resolve({ data: row ? { ...row } : null, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            then(resolve, reject) {
              calls.push({ table, filters });
              if (table === 'lawyer_cases') {
                const ws = filters.find(([c]) => c === 'ai_workspace_id')?.[1];
                const lawyer = filters.find(([c]) => c === 'lawyer_id')?.[1];
                const rows = cases
                  .filter((c) => c.ai_workspace_id === ws && c.lawyer_id === lawyer)
                  .map((c) => ({ ...c }));
                return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
              }
              return Promise.resolve({ data: [], error: null }).then(resolve, reject);
            },
          };
          return builder;
        },
      };
    },
  };
}

const CASE = {
  id: 'case-1',
  lawyer_id: 'lawyer-A',
  ai_workspace_id: 'ws-1',
  title: 'Despido injustificado',
  description: 'Despido por necesidades de la empresa',
  status: 'in_progress',
  practice_area: 'Laboral',
  client_id: 'client-1',
};
const CLIENT = { id: 'client-1', lawyer_id: 'lawyer-A', name: 'María González', email: 'maria@x.cl', phone: '+569' };

describe('getProCaseHeader — matrix', () => {
  it('0 linked cases → legacy null', async () => {
    const db = createFakeDb();
    expect(await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-A' }))
      .toEqual({ status: 'legacy', header: null });
  });

  it('1 linked owned case → live header with client name only', async () => {
    const db = createFakeDb({ cases: [CASE], clients: [CLIENT] });
    const res = await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-A' });
    expect(res.status).toBe('linked');
    expect(res.header).toMatchObject({
      caseId: 'case-1',
      title: 'Despido injustificado',
      description: 'Despido por necesidades de la empresa',
      status: 'in_progress',
      practiceArea: 'Laboral',
      clientName: 'María González',
    });
    expect(JSON.stringify(res.header)).not.toContain('maria@x.cl');
    expect(JSON.stringify(res.header)).not.toContain('+569');
  });

  it('linked case without client → valid header without client', async () => {
    const db = createFakeDb({ cases: [{ ...CASE, client_id: null }] });
    const res = await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-A' });
    expect(res.status).toBe('linked');
    expect(res.header.clientName).toBeNull();
    expect(res.header.title).toBe('Despido injustificado');
  });

  it("another lawyer's case is invisible (ownership-scoped query)", async () => {
    const db = createFakeDb({ cases: [CASE], clients: [CLIENT] });
    const res = await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-B' });
    expect(res).toEqual({ status: 'legacy', header: null });
    // Both predicates travel with the query (no forged workspace bypass).
    const q = db.calls.find((c) => c.table === 'lawyer_cases');
    expect(q.filters).toContainEqual(['ai_workspace_id', 'ws-1']);
    expect(q.filters).toContainEqual(['lawyer_id', 'lawyer-B']);
  });

  it('2 linked owned cases → ambiguity detected, no silent pick', async () => {
    const db = createFakeDb({ cases: [CASE, { ...CASE, id: 'case-2', title: 'Otro caso' }] });
    const res = await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-A' });
    expect(res.status).toBe('ambiguous');
    expect(res.header).toBeNull();
  });

  it('missing args → legacy', async () => {
    const db = createFakeDb({ cases: [CASE] });
    expect(await getProCaseHeader(db, { workspaceId: null, lawyerId: 'lawyer-A' }))
      .toEqual({ status: 'legacy', header: null });
  });

  it('description is bounded', () => {
    expect(PRO_CASE_DESCRIPTION_MAX_CHARS).toBeLessThanOrEqual(2000);
  });
});

describe('getProCaseHeader — live values (no stale copy)', () => {
  it('case edit is reflected on next request; workspace table never read', async () => {
    const cases = [{ ...CASE, title: 'Caso antiguo', description: 'Descripción antigua' }];
    const db = createFakeDb({ cases, clients: [CLIENT] });
    const before = await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-A' });
    expect(before.header.title).toBe('Caso antiguo');
    // Lawyer edits the Pro case (no reprovisioning, no workspace mutation).
    cases[0].title = 'Despido injustificado';
    cases[0].description = 'Despido por necesidades de la empresa';
    const after = await getProCaseHeader(db, { workspaceId: 'ws-1', lawyerId: 'lawyer-A' });
    expect(after.header.title).toBe('Despido injustificado');
    expect(after.header.description).toBe('Despido por necesidades de la empresa');
    expect(db.calls.some((c) => c.table === 'ai_workspaces')).toBe(false);
  });
});

describe('formatProCaseBlock', () => {
  it('emits only present fields; empty header → empty string', () => {
    expect(formatProCaseBlock(null)).toBe('');
    expect(formatProCaseBlock({})).toBe('');
    const block = formatProCaseBlock({ title: 'T', clientName: 'C' });
    expect(block).toContain('T');
    expect(block).toContain('C');
    expect(block).not.toContain('Estado:');
  });
});

describe('buildChatContext with live proCase', () => {
  const workspace = { name: 'Caso antiguo', practice_area: 'Civil', description: 'Descripción antigua' };
  const docs = [{ id: 'd1', original_filename: 'contrato.pdf', extracted_text: 'contenido del contrato '.repeat(50) }];

  it('live values win over the stale workspace copy', () => {
    const proCase = {
      title: 'Despido injustificado',
      description: 'Despido por necesidades de la empresa',
      status: 'in_progress',
      practiceArea: 'Laboral',
      clientName: 'María',
    };
    const { context } = buildChatContext({ workspace, documents: docs, analyses: {}, question: 'riesgos', proCase });
    expect(context).toContain('Despido injustificado');
    expect(context).toContain('Despido por necesidades de la empresa');
    expect(context).toContain('María');
    expect(context).toContain('Laboral');
    expect(context).not.toContain('Caso antiguo');
    expect(context).not.toContain('Descripción antigua');
  });

  it('absent proCase keeps legacy behavior byte-identical', () => {
    const { context } = buildChatContext({ workspace, documents: docs, analyses: {}, question: 'riesgos' });
    expect(context).toContain('Caso antiguo');
  });

  it('document grounding preserved alongside the header', () => {
    const proCase = { title: 'T', description: 'D', status: null, practiceArea: null, clientName: null };
    const { context } = buildChatContext({ workspace, documents: docs, analyses: {}, question: 'riesgos', proCase });
    expect(context).toContain('DOCUMENTO: contrato.pdf');
    expect(context).toContain('T');
  });
});
