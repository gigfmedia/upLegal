import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectLatestAnalysis } from '@/lib/aiLatestAnalysis';
import { AICaseLatestAnalysis } from '@/components/legalup-ai/AICaseLatestAnalysis';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const row = (overrides: Record<string, unknown> = {}) => ({
  id: `an-${overrides.document_id ?? 'x'}`,
  document_id: 'doc-a',
  summary: 'Resumen válido del documento A.',
  created_at: '2026-09-26T14:00:00.000Z',
  updated_at: '2026-09-26T15:00:00.000Z',
  document: { id: 'doc-a', original_filename: 'contrato-a.pdf', workspace_id: 'w1' },
  ...overrides,
});

const supabaseResult: { data: unknown[] | null; error: null } = { data: null, error: null };

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: async () => ({ ...supabaseResult }) }),
        }),
      }),
    }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}));

vi.mock('@/contexts/AuthContext/clean/useAuth', () => ({
  useAuth: () => ({ user: { id: 'lawyer-1' } }),
}));

const renderWithClient = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  supabaseResult.data = null;
});

describe('4.46B selection rule (latest non-empty summary)', () => {
  it('§15 QA fixture: analyzed A wins over newer unanalyzed B (B has no row)', async () => {
    supabaseResult.data = [row({ document_id: 'doc-a', updated_at: '2026-09-26T15:00:00.000Z' })];
    renderWithClient(<AICaseLatestAnalysis workspaceId="w1" />);
    expect(await screen.findByText('Último análisis del caso')).toBeInTheDocument();
    expect(screen.getByText('Resumen válido del documento A.')).toBeInTheDocument();
    expect(screen.getByText('contrato-a.pdf')).toBeInTheDocument();
  });

  it('§16 multiple analyzed: later analysis wins', () => {
    const rows = [
      row({ document_id: 'doc-a', summary: 'Resumen A.', updated_at: '2026-09-26T14:00:00.000Z' }),
      row({ document_id: 'doc-b', summary: 'Resumen B.', updated_at: '2026-09-26T16:00:00.000Z' }),
    ];
    expect(selectLatestAnalysis(rows)?.document_id).toBe('doc-b');
  });

  it('§17 latest empty: falls back to older valid summary, never blank', () => {
    const rows = [
      row({ document_id: 'doc-b', summary: '   ', updated_at: '2026-09-26T16:00:00.000Z' }),
      row({ document_id: 'doc-a', summary: 'Resumen A.', updated_at: '2026-09-26T14:00:00.000Z' }),
    ];
    expect(selectLatestAnalysis(rows)?.document_id).toBe('doc-a');
  });

  it('§18 no analysis: null (owner hides the card)', () => {
    expect(selectLatestAnalysis([])).toBeNull();
    expect(selectLatestAnalysis([row({ summary: '' }), row({ summary: null })])).toBeNull();
  });

  it('timestamp authority is updated_at (actual schema)', () => {
    const src = read('src/lib/aiLatestAnalysis.ts');
    expect(src).toContain('updated_at');
    const hook = read('src/hooks/useLatestCaseAnalysis.ts');
    expect(hook).toContain(".order('updated_at'");
  });
});

describe('4.46B card contract', () => {
  it('§1/§22 honest copy, never "Resumen del caso"', async () => {
    supabaseResult.data = [row()];
    renderWithClient(<AICaseLatestAnalysis workspaceId="w1" />);
    await screen.findByText('Último análisis del caso');
    expect(screen.getByText('Resumen del documento analizado más reciente.')).toBeInTheDocument();
    expect(screen.queryByText('Resumen del caso')).not.toBeInTheDocument();
    const src = read('src/components/legalup-ai/AICaseLatestAnalysis.tsx');
    expect(src).not.toContain('Resumen del caso');
  });

  it('§20 CTA navigates with the analyzed document id', async () => {
    supabaseResult.data = [row({ document_id: 'doc-a' })];
    const onView = vi.fn();
    renderWithClient(<AICaseLatestAnalysis workspaceId="w1" onViewDocument={onView} />);
    fireEvent.click(await screen.findByText('Ver documento'));
    expect(onView).toHaveBeenCalledWith('doc-a');
  });

  it('§5/§13/§14 loading skeleton, no error flash, silent hide', async () => {
    supabaseResult.data = [];
    const { container } = renderWithClient(<AICaseLatestAnalysis workspaceId="w1" />);
    await screen.findByText('Último análisis del caso').catch(() => null);
    expect(container.textContent ?? '').not.toContain('Último análisis del caso');
  });

  it('§6/§7/§11/§21 plan-agnostic read path: no plan branches, no provider, no quota', () => {
    const code = (p: string) =>
      read(p)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1');
    for (const p of [
      'src/components/legalup-ai/AICaseLatestAnalysis.tsx',
      'src/hooks/useLatestCaseAnalysis.ts',
      'src/lib/aiLatestAnalysis.ts',
    ]) {
      const src = code(p);
      expect(src).not.toMatch(/canUse|hasAccess|pro_limited|free_case|isPro|isTrial/);
      expect(src).not.toMatch(/chatCompletion|fetch\s*\(|quota_units|ai_begin_operation|useSendChat|useAnalyze/);
    }
    expect(read('src/hooks/useLatestCaseAnalysis.ts')).toContain("from('ai_document_analyses')");
  });

  it('§19 free exhausted still renders (visibility independent of allowance)', async () => {
    supabaseResult.data = [row()];
    renderWithClient(<AICaseLatestAnalysis workspaceId="w1" />);
    expect(await screen.findByText('Resumen válido del documento A.')).toBeInTheDocument();
    expect(screen.queryByText(/Ver LegalUp Pro|Ver planes/i)).not.toBeInTheDocument();
  });
});
