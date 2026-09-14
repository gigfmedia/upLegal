import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const ia = () => read('src/components/legalup-ai/AICaseWorkspaceContent.tsx');

describe('4.34J — IA navigation contract', () => {
  it('default IA opens overview; invalid view falls back safely', () => {
    const c = ia();
    expect(c).toContain("rawView === 'intelligence' || rawView === 'research' ? rawView : 'overview'");
    expect(c).toContain("if (view === 'overview') p.delete('view')");
  });

  it('secondary nav labels are directly visible without hidden CTA', () => {
    const c = ia();
    expect(c).toContain('Resumen IA');
    expect(c).toContain('Inteligencia del caso');
    expect(c).toContain('Investigar jurisprudencia');
    expect(c).toContain('aria-label="Secciones de IA"');
    expect(c).toContain("aria-current={aiView === v.key ? 'page' : undefined}");
  });

  it('single URL authority: no divergent local subview state', () => {
    const c = ia();
    expect(c).not.toContain('showIntelligence');
    expect(c).not.toContain('showResearch');
    expect(c).not.toContain('setSearchParamsHelper');
    expect(c).toContain('setAiView');
  });

  it('Command Center entries navigate to canonical views', () => {
    const c = ia();
    expect(c).toContain("onViewIntelligence={() => setAiView('intelligence')}");
    expect(c).toContain("onInvestigate={() => setAiView('research')}");
  });

  it('no tier/upsell language introduced', () => {
    const c = ia() + read('src/components/lawyer/CaseActivity.tsx') + read('src/pages/lawyer/CaseDetailPage.tsx');
    expect(c).not.toMatch(/Ultra|Unlimited|Premium|upgrade to|higher plan/i);
    expect(c).not.toMatch(/\$\s?[\d.]+/);
  });
});

describe('4.34J — documents label + notes parity', () => {
  it('top-level label sells analysis; route key unchanged', () => {
    const c = read('src/pages/lawyer/CaseDetailPage.tsx');
    expect(c).toContain('>Documentos y análisis<');
    expect(c).toContain('value="documents"');
  });

  it('note CRUD is 0-provider (direct RLS writes only)', () => {
    const c = read('src/hooks/useAICaseTimeline.ts');
    expect(c).not.toMatch(/chatCompletion|searchJurisprudence|fetch\(/);
    expect(c).toContain("supabase.from('ai_case_timeline_events')");
  });

  it('activity preserves existing events beside notes', () => {
    const c = read('src/components/lawyer/CaseActivity.tsx');
    for (const t of ['case_created', 'document_uploaded', 'document_analyzed', 'workflow_completed', 'appointment', 'note']) {
      expect(c).toContain(t);
    }
  });

  it('legacy redirect preserves tab intent trivially', () => {
    const c = read('src/pages/lawyer/LegacyAICaseRoute.tsx');
    expect(c).toContain('LEGACY_TAB_TARGET');
    expect(c).toContain('?tab=ai&view=research');
    expect(c).toContain('?tab=ai&view=intelligence');
  });
});
