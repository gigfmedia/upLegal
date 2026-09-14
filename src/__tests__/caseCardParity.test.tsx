import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

vi.mock('@/components/legalup-ai/AICaseTimelinePreview', () => ({
  AICaseTimelinePreview: ({ workspaceId, onOpen }: { workspaceId: string; onOpen: () => void }) => (
    <div data-testid={`preview-${workspaceId}`}>
      <button onClick={onOpen}>Ver timeline completo</button>
    </div>
  ),
}));

import { SharedCaseCard } from '@/components/legalup-ai/SharedCaseCard';

const base = {
  title: 'Caso QA',
  practiceArea: 'Civil',
  description: 'Descripción QA',
  createdAt: '2026-08-02T10:00:00.000Z',
  updatedAt: '2026-08-04T10:00:00.000Z',
  workspaceId: 'ws-1',
  onOpen: vi.fn(),
  onTimeline: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('4.34R shared case card (legacy visual grammar)', () => {
  it('renders title, area badge, clamped description, dates, preview, actions', () => {
    const onOpen = vi.fn(), onEdit = vi.fn(), onDelete = vi.fn(), onTimeline = vi.fn();
    const { container } = render(
      <SharedCaseCard {...base} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} onTimeline={onTimeline} />
    );
    expect(screen.getByText('Caso QA')).toBeInTheDocument();
    expect(screen.getByText('Civil')).toBeInTheDocument();
    expect(container.querySelector('.line-clamp-2')).not.toBeNull();
    expect(container.textContent).toContain('Creado: 2 de agosto 2026');
    expect(container.textContent).toContain('Actualizado: 4 de agosto 2026');
    expect(screen.getByTestId('preview-ws-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir caso' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Editar caso Caso QA' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar caso Caso QA' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Ver timeline completo'));
    expect(onTimeline).toHaveBeenCalledTimes(1);
  });

  it('missing area uses legacy neutral empty text; missing workspace omits preview', () => {
    const { container, rerender } = render(<SharedCaseCard {...base} practiceArea={null} />);
    expect(screen.getByText('Sin área jurídica')).toBeInTheDocument();
    rerender(<SharedCaseCard {...base} workspaceId={null} />);
    expect(screen.queryByText('Actividad reciente')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('Cliente:');
  });

  it('both surfaces render the shared card with their own authority', () => {
    const legacy = read('src/pages/lawyer/LegalUpAIWorkspace.tsx');
    expect(legacy).toContain('<SharedCaseCard');
    expect(legacy).toContain('openWorkspace(workspace.id)');
    const pro = read('src/pages/lawyer/CasesPage.tsx');
    expect(pro).toContain('<SharedCaseCard');
    expect(pro).toContain('ai_workspace_id');
    expect(pro).toContain('/lawyer/cases/${c.id}');
    expect(pro).toContain('/lawyer/cases/${c.id}?tab=activity');
  });

  it('pro card drops status badges, client line and eye icon', () => {
    const pro = read('src/pages/lawyer/CasesPage.tsx');
    expect(pro).not.toContain('statusColors');
    expect(pro).not.toContain('Cliente:');
    expect(pro).not.toContain('Eye');
  });

  it('pro edit/delete reuse safe canonical actions with confirmation', () => {
    const pro = read('src/pages/lawyer/CasesPage.tsx');
    expect(pro).toContain('CaseEditDialog');
    expect(pro).toContain('ConfirmDialog');
    expect(pro).toContain('deleteCase');
  });

  it('activity preview stays single-query (no N+1 per card)', () => {
    // useRecentAICaseTimeline: one shared list query for all workspaces;
    // each card filters client-side by workspace_id.
    const hook = read('src/hooks/useAICaseTimeline.ts');
    const recentFn = hook.slice(hook.indexOf('export function useRecentAICaseTimeline'));
    expect(recentFn.match(/useQuery</g)).toHaveLength(1);
    expect(recentFn).toMatch(/export function useRecentAICaseTimeline\(limit/);
    expect(read('src/components/legalup-ai/AICaseTimelinePreview.tsx')).toContain('useRecentAICaseTimeline(50)');
    expect(read('src/components/legalup-ai/SharedCaseCard.tsx')).not.toContain('useCaseActivityItems');
  });
});
