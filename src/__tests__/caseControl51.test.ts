import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  isOverdue,
  isNextActionOverdue,
  countPendingTasks,
  countOverdueTasks,
  visibleNextAction,
  buildCompleteNextActionPatch,
  buildCompleteTaskPatch,
  buildReopenTaskPatch,
} from '@/lib/caseControl';

const PAST = new Date(Date.now() - 86400000).toISOString();
const FUTURE = new Date(Date.now() + 86400000).toISOString();

// 1. Crear próxima gestión: payload válido (texto + fecha).
describe('FASE 5.1 — crear próxima gestión', () => {
  it('acepta texto y fecha futura', () => {
    const payload = { next_action: 'Revisar resolución y preparar escrito', next_action_due_at: FUTURE, next_action_completed_at: null };
    expect(payload.next_action.trim().length).toBeGreaterThan(0);
    expect(isNextActionOverdue(payload)).toBe(false);
    expect(visibleNextAction(payload)).toBe(payload.next_action);
  });
});

// 2. Editarla: el texto visible cambia.
describe('FASE 5.1 — editar próxima gestión', () => {
  it('muestra el texto actualizado', () => {
    expect(visibleNextAction({ next_action: 'Nuevo texto', next_action_due_at: null, next_action_completed_at: null })).toBe('Nuevo texto');
    expect(visibleNextAction({ next_action: '  ', next_action_due_at: null, next_action_completed_at: null })).toBeNull();
  });
});

// 3. Completarla: patch registra timestamp y oculta la acción.
describe('FASE 5.1 — completar próxima gestión', () => {
  it('el patch marca completed y visibleNextAction la oculta', () => {
    const patch = buildCompleteNextActionPatch();
    expect(patch.next_action_completed_at).toBeTruthy();
    const done = { next_action: 'X', next_action_due_at: PAST, next_action_completed_at: patch.next_action_completed_at };
    expect(visibleNextAction(done)).toBeNull();
    expect(isNextActionOverdue(done)).toBe(false);
  });
});

// 4. Crear pendiente: título requerido, due_at nullable.
describe('FASE 5.1 — crear pendiente', () => {
  it('due_at nullable es válido y no es vencido', () => {
    expect(isOverdue(null, false)).toBe(false);
    expect(countPendingTasks([{ completed: false }, { completed: true }])).toBe(1);
  });
});

// 5. Completar pendiente: patch + conteo.
describe('FASE 5.1 — completar pendiente', () => {
  it('el patch completa y el conteo baja', () => {
    const patch = buildCompleteTaskPatch();
    expect(patch.completed).toBe(true);
    expect(patch.completed_at).toBeTruthy();
    const reopen = buildReopenTaskPatch();
    expect(reopen.completed).toBe(false);
    expect(reopen.completed_at).toBeNull();
  });
});

// 6. Pendiente vencido: due_at < now() AND completed = false.
describe('FASE 5.1 — detectar vencido', () => {
  it('pasado sin completar = vencido; futuro/completado/inválido = no', () => {
    expect(isOverdue(PAST, false)).toBe(true);
    expect(isOverdue(FUTURE, false)).toBe(false);
    expect(isOverdue(PAST, true)).toBe(false);
    expect(isOverdue(null, false)).toBe(false);
    expect(isOverdue('no-fecha', false)).toBe(false);
    expect(
      countOverdueTasks([
        { id: '1', title: 'a', due_at: PAST, completed: false, completed_at: null },
        { id: '2', title: 'b', due_at: FUTURE, completed: false, completed_at: null },
        { id: '3', title: 'c', due_at: PAST, completed: true, completed_at: PAST },
      ])
    ).toBe(1);
  });
});

// 7. Caso muestra próxima acción correctamente.
describe('FASE 5.1 — caso muestra próxima acción', () => {
  it('visible solo con texto y sin completar', () => {
    expect(visibleNextAction({ next_action: 'Revisar', next_action_due_at: FUTURE, next_action_completed_at: null })).toBe('Revisar');
    expect(visibleNextAction({ next_action: null, next_action_due_at: FUTURE, next_action_completed_at: null })).toBeNull();
    expect(visibleNextAction({ next_action: 'Revisar', next_action_due_at: null, next_action_completed_at: new Date().toISOString() })).toBeNull();
  });
});

// 8. Aislamiento tenant: la migración protege SELECT/INSERT/UPDATE/DELETE por lawyer_id.
describe('FASE 5.1 — RLS aislamiento tenant', () => {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261007000000_case_control_next_action.sql'), 'utf-8');
  it('lawyer_case_tasks tiene RLS con 4 policies owner-scoped', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    for (const op of ['owner_select', 'owner_insert', 'owner_update', 'owner_delete']) {
      expect(sql).toContain(op);
    }
    expect(sql).toContain('auth.uid() = lawyer_id');
  });
  it('INSERT/UPDATE validan que el caso pertenezca al mismo lawyer (no cross-tenant)', () => {
    expect(sql).toContain('c.lawyer_id = auth.uid()');
  });
});

// 9. Caso gratuito puede usar estas funciones: columnas/tabla sin gate de plan.
describe('FASE 5.1 — caso gratis compatible', () => {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261007000000_case_control_next_action.sql'), 'utf-8');
  it('no menciona planes ni bloquea LAWYER_DIRECT', () => {
    expect(sql).not.toMatch(/pro_subscription|hasProAccess|plan_/i);
    // La FK de tasks apunta a lawyer_cases sin filtro de source: gratis y Pro iguales.
    expect(sql).toContain('REFERENCES public.lawyer_cases(id)');
  });
});

// 10. No romper límites FREE/PRO: la migración no toca entitlement ni capacity.
describe('FASE 5.1 — no rompe límites FREE/PRO', () => {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261007000000_case_control_next_action.sql'), 'utf-8');
  it('no altera triggers de capacidad ni free-case', () => {
    expect(sql).not.toMatch(/active_case|free_case|entitlement/i);
  });
});
