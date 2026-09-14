import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TimelinePanel } from '@/components/legalup-ai/TimelinePanel';
import { timelineGroupLabel, timelineEventTime } from '@/components/legalup-ai/timelineDates';
import { FileText } from 'lucide-react';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const item = (over = {}) => ({
  id: 'e1',
  icon: FileText,
  iconClassName: 'bg-blue-100 text-blue-700',
  title: 'Análisis de documento completado',
  badge: 'Análisis',
  description: null,
  documentName: 'contrato.pdf',
  timeText: '30 ago, 13:15',
  author: null,
  actions: null,
  onSelect: null,
  ...over,
});

describe('4.34O shared timeline presentation', () => {
  it('renders legacy grammar: header, copy, add action, groups, line, cards', () => {
    render(
      <TimelinePanel
        groups={[{ key: '30 agosto 2026', items: [item()] }]}
        loading={false}
        error={null}
        showAdd
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText('Timeline del caso')).toBeInTheDocument();
    expect(screen.getByText('Actividad y actualizaciones del caso en orden cronológico.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar actualización' })).toBeInTheDocument();
    expect(screen.getByText('30 agosto 2026')).toBeInTheDocument();
    expect(screen.getByText('Análisis de documento completado')).toBeInTheDocument();
    expect(screen.getByText('Análisis')).toBeInTheDocument();
    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('30 ago, 13:15')).toBeInTheDocument();
    expect(document.querySelector('.border-l-2')).not.toBeNull();
  });

  it('loading/error/empty states preserve panel structure', () => {
    const { unmount } = render(
      <TimelinePanel groups={[]} loading showAdd onAdd={vi.fn()} />
    );
    expect(screen.getByLabelText('Cargando timeline')).toBeInTheDocument();
    unmount();
    render(
      <TimelinePanel groups={[]} loading={false} error="Falló la carga." onRetry={vi.fn()} showAdd={false} onAdd={vi.fn()} />
    );
    expect(screen.getByText('Falló la carga.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('empty keeps header action, no LegalUp AI product copy', () => {
    render(<TimelinePanel groups={[]} loading={false} error={null} showAdd onAdd={vi.fn()} />);
    expect(screen.getByText('Aún no hay actividad en este caso')).toBeInTheDocument();
    expect(screen.queryByText(/LegalUp AI/)).not.toBeInTheDocument();
  });

  it('shared date grammar matches legacy formatters', () => {
    expect(timelineGroupLabel('2026-08-30T13:15:00.000Z')).toBe('30 agosto 2026');
    // Hour is timezone-local by design (same as legacy); assert shape only.
    expect(timelineEventTime('2026-08-30T13:15:00.000Z')).toMatch(/^30 ago, \d{2}:\d{2}$/);
  });

  it('legacy timeline feeds the shared panel (single visual implementation)', () => {
    const c = read('src/components/legalup-ai/AICaseTimeline.tsx');
    expect(c).toContain('TimelinePanel');
    expect(c).toContain('timelineEventTime');
    expect(c).toContain('timelineGroupLabel');
    // Data authority, toasts, analytics and dialogs stay in legacy shell.
    expect(c).toContain('useAICaseTimeline');
    expect(c).toContain('ai_case_timeline_viewed');
    expect(c).toContain('NoteDialog');
    expect(c).toContain('ConfirmDialog');
  });

  it('canonical activity feeds the shared panel with Pro superset source', () => {
    const c = read('src/components/lawyer/CaseActivity.tsx');
    expect(c).toContain('TimelinePanel');
    expect(c).toContain('useCaseActivityItems');
  });

  it('top tab order matches legacy experience', () => {
    const c = read('src/pages/lawyer/CaseDetailPage.tsx');
    const order = ['Resumen', 'Documentos y análisis', 'Investigar jurisprudencia', 'Inteligencia del caso', 'Timeline del caso'];
    let last = -1;
    for (const label of order) {
      const at = c.indexOf(`>${label}<`);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
  });
});
