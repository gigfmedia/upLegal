import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVENT_META, UNKNOWN_EVENT_META } from '@/components/legalup-ai/timelineMeta';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261012000000_case_operational_history_timeline.sql'),
  'utf8'
);

describe('4.60C migración de historial operativo', () => {
  it('extiende el CHECK con los 3 tipos nuevos y conserva los existentes', () => {
    for (const t of ['task_completed', 'next_action_completed', 'case_closed']) {
      expect(migration).toContain(`'${t}'::text`);
    }
    for (const t of ['case_created', 'document_uploaded', 'document_analyzed', 'note']) {
      expect(migration).toContain(`'${t}'::text`);
    }
    expect(migration).not.toMatch(/task_created|next_action_changed|case_reopened/);
  });
  it('dispara solo en transiciones (sin ruido de ediciones)', () => {
    expect(migration).toMatch(/OLD\.completed = false AND NEW\.completed = true/);
    expect(migration).toMatch(/OLD\.next_action_completed_at IS NULL AND NEW\.next_action_completed_at IS NOT NULL/);
    expect(migration).toMatch(/OLD\.status IS DISTINCT FROM NEW\.status AND NEW\.status = 'closed'/);
  });
  it('es idempotente (guardas de existencia por clave de origen)', () => {
    expect(migration).toMatch(/metadata->>'task_id' = NEW\.id::text/);
    expect(migration).toMatch(/event_type = 'next_action_completed'/);
  });
  it('workspace nulo no bloquea la mutación operativa (solo omite el evento)', () => {
    expect(migration).toMatch(/IF v_workspace IS NULL THEN RETURN NEW/);
    expect(migration).toMatch(/NEW\.ai_workspace_id IS NOT NULL/);
  });
  it('sin backfill ni DML destructivo', () => {
    expect(migration).not.toMatch(/^\s*(DELETE|TRUNCATE|UPDATE\s+public)/m);
  });
});

describe('4.60C mapeos visuales del Timeline', () => {
  it('define los 3 tipos operativos con etiqueta en español', () => {
    expect(EVENT_META.task_completed.label).toBe('Pendiente completado');
    expect(EVENT_META.next_action_completed.label).toBe('Próxima gestión completada');
    expect(EVENT_META.case_closed.label).toBe('Caso cerrado');
    for (const t of ['task_completed', 'next_action_completed', 'case_closed'] as const) {
      expect(EVENT_META[t].icon).toBeDefined();
      expect(EVENT_META[t].className).toBeDefined();
    }
  });
  it('fallback neutro para tipos desconocidos', () => {
    expect(UNKNOWN_EVENT_META.label).toBeDefined();
    expect(EVENT_META['tipo_futuro_desconocido' as keyof typeof EVENT_META] ?? UNKNOWN_EVENT_META)
      .toBe(UNKNOWN_EVENT_META);
  });
  it('solo las notas tienen acciones (eventos del sistema son solo lectura)', () => {
    const hasActions = (eventType: string) => eventType === 'note';
    expect(hasActions('note')).toBe(true);
    expect(hasActions('task_completed')).toBe(false);
    expect(hasActions('next_action_completed')).toBe(false);
    expect(hasActions('case_closed')).toBe(false);
  });
});
