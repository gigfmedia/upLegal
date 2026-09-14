import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getProCaseHeader, formatProCaseBlock } from '@/../server/ai/proCaseContext.mjs';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.34D — research montado en el Caso canónico', () => {
  it('entry Investigar embebida, sin tab bar anidada ni ruta standalone', () => {
    const c = read('src/components/legalup-ai/AICaseWorkspaceContent.tsx');
    expect(c).toContain('Investigar jurisprudencia');
    expect(c).toContain('AIResearchPanel');
    expect(c).toContain("setAiView('research')");
    expect(c).not.toContain('/lawyer/ai');
  });

  it('deep links ?tab=ai&view=research|intelligence con fallback overview', () => {
    const c = read('src/components/legalup-ai/AICaseWorkspaceContent.tsx');
    expect(c).toContain("rawView === 'intelligence' || rawView === 'research'");
    expect(c).toContain("p.set('view', view)");
  });

  it('locked neutral: sin Ultra, sin precios, sin checkout; historial intacto', () => {
    const c = read('src/components/legalup-ai/AIResearchPanel.tsx');
    expect(c).toContain('Investigación avanzada');
    expect(c).toContain('Esta capacidad no está incluida en tu plan actual');
    expect(c).not.toMatch(/Ultra|Unlimited|19\.990|49\.990/i);
    // El historial sigue cargándose aunque el formulario esté bloqueado.
    expect(c).toContain('useAICaseResearch(workspaceId, true)');
  });

  it('abrir el panel no dispara provider (0 llamadas)', () => {
    const c = read('src/components/legalup-ai/AIResearchPanel.tsx');
    // La mutación solo se invoca desde runResearch (submit/retry explícitos).
    expect(c.match(/runMutation\.mutate\(/g)).toHaveLength(1);
    // El historial es GET determinista, sin efectos de escritura.
    expect(c).toContain('useAICaseResearch(workspaceId, true)');
  });

  it('doble submit protegido a nivel componente', () => {
    const c = read('src/components/legalup-ai/AIResearchPanel.tsx');
    expect(c).toContain('if (locked) return;');
    expect(c).toContain('disabled={runMutation.isPending');
    expect(c).toContain('disabled={locked || runMutation.isPending}');
  });

  it('analytics metadata-only con superficie, sin PII ni texto', () => {
    const c = read('src/components/legalup-ai/AIResearchPanel.tsx');
    expect(c).toContain('query_length: query.length');
    expect(c).toContain("surface: analyticsSurface");
    expect(c).not.toMatch(/posthog\.capture\('ai_jurisprudence_research_started', \{\s*query[^_]/);
  });

  it('backend: header vivo Pro compone el contexto research, sin otro builder', () => {
    const c = read('server.mjs');
    expect(c).toContain('formatProCaseBlock(resolved.header)');
    expect(c).toContain('[proCaseBlock, buildJurisprudenceCaseContext(workspace)]');
    expect(c).not.toContain('buildResearchCaseHeader');
  });

  it('backend: crear requiere gate jurisprudence; leer historial no', () => {
    const c = read('server.mjs');
    const postAt = c.indexOf("app.post('/api/ai/cases/:caseId/jurisprudence'");
    const getAt = c.indexOf("app.get('/api/ai/cases/:caseId/jurisprudence'");
    const postBlock = c.slice(postAt, postAt + 4000);
    const getBlock = c.slice(getAt, getAt + 2000);
    expect(postBlock).toContain("serverCanUseAIFeature('jurisprudence'");
    expect(postBlock).toContain('AI_FEATURE_NOT_AVAILABLE');
    expect(getBlock).not.toContain("serverCanUseAIFeature('jurisprudence'");
  });

  it('sin duplicación: un solo engine, sin tablas ni formatos paralelos', () => {
    expect(read('server.mjs').match(/jurisprudenceSources\.mjs/g)).toHaveLength(1);
    const all = read('server.mjs') + read('src/hooks/useAIResearch.ts') + read('src/components/legalup-ai/AICaseWorkspaceContent.tsx');
    expect(all).not.toMatch(/pro_research|research-v2|pro_jurisprudence/i);
    expect(all).toContain('ai_research_requests');
    expect(read('src/components/legalup-ai/AIResearchPanel.tsx')).toContain('EvidenceNavigator');
  });

  it('modos preservados: engine decide document/mixed/jurisprudence, sin default inventado', () => {
    const c = read('server.mjs');
    expect(c).toContain('detectDocumentMode(query, caseDocuments, classification)');
    expect(c).toContain("research_type: documentMode === 'none' ? 'jurisprudence' : documentMode");
    expect(read('src/hooks/useAIResearch.ts')).toContain("body: JSON.stringify({ query })");
  });
});

describe('4.34D — header Pro vivo privacy-safe', () => {
  it('solo nombre de cliente, nunca PII/pagos/IDs internos', async () => {
    const supabase = { from: (table: string) => {
      const q: Record<string, unknown> = {};
      const chain = () => q;
      const resolve = async () => {
        if (table === 'lawyer_cases') return { data: [{ id: 'c', title: 'T', description: 'D', status: 'S', practice_area: 'P', client_id: 'cl' }], error: null };
        return { data: { name: 'Juan Pérez', email: 'j@p.cl', phone: '+569', notes: 'x' }, error: null };
      };
      q.select = chain; q.eq = chain;
      q.maybeSingle = resolve;
      q.then = (a: (v: unknown) => unknown) => resolve().then(a);
      return q;
    } };
    const { header } = await getProCaseHeader(supabase as never, { workspaceId: 'w', lawyerId: 'u' });
    expect(header?.clientName).toBe('Juan Pérez');
    const block = formatProCaseBlock(header);
    expect(block).toContain('Juan Pérez');
    expect(block).not.toMatch(/j@p\.cl|\+569|pago|mercado|ingreso/);
  });
});
