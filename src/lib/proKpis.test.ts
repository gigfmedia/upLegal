/**
 * FASE 1.7 — Tests de reglas KPI con fixtures (sin DB, sin PII).
 */
import { describe, it, expect } from 'vitest';
import {
  ACTIVATION_WINDOW_DAYS,
  DAY_MS,
  activationByCohort,
  bucketNewLawyersByWeek,
  docsAndAiUsers,
  managementAdoption,
  proConversion,
  retentionAfterActivation,
  toWeekLabel,
} from './proKpis';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

describe('semanas UTC', () => {
  it('etiqueta por lunes UTC aunque sea domingo en otra zona', () => {
    // Domingo 2026-10-11 01:00 UTC pertenece a la semana del lunes 10-05.
    expect(toWeekLabel(new Date('2026-10-11T01:00:00Z'))).toBe('2026-10-05');
    expect(toWeekLabel(new Date('2026-10-05T00:00:00Z'))).toBe('2026-10-05');
  });

  it('abogados nuevos por semana con fechas inválidas ignoradas', () => {
    const out = bucketNewLawyersByWeek([
      { id: 'a', created_at: iso(NOW - 1 * DAY_MS) },
      { id: 'b', created_at: iso(NOW - 2 * DAY_MS) },
      { id: 'c', created_at: 'no-fecha' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ week_start: '2026-10-05', new_lawyers: 2 });
  });
});

describe('KPI 2 — activación a 7 días', () => {
  const reg = NOW - 30 * DAY_MS;
  const lawyers = [
    { id: 'act-case', created_at: iso(reg) },
    { id: 'act-grant', created_at: iso(reg) },
    { id: 'late', created_at: iso(reg) },
    { id: 'never', created_at: iso(reg) },
    { id: 'recent', created_at: iso(NOW - 2 * DAY_MS) },
  ];

  it('caso o grant dentro de 7d activa; fuera o nunca no; recientes van a pending', () => {
    const firstCaseAt = new Map([
      ['act-case', reg + 3 * DAY_MS],
      ['late', reg + 10 * DAY_MS],
    ]);
    // act-grant borró su caso (hard delete): solo sobrevive el grant.
    const firstGrantAt = new Map([['act-grant', reg + 1 * DAY_MS]]);
    const out = activationByCohort(lawyers, firstCaseAt, firstGrantAt, NOW);
    expect(out).toHaveLength(2); // cohorte vieja + cohorte reciente
    const old = out.find((c) => c.week_start !== toWeekLabel(new Date(NOW)));
    expect(old).toMatchObject({ registered: 4, activated_7d: 2, activation_rate_7d: 0.5, pending: 0 });
    const recent = out.find((c) => c.week_start === toWeekLabel(new Date(NOW)));
    expect(recent).toMatchObject({ registered: 1, pending: 1, activation_rate_7d: null });
  });

  it('límite exacto de 7 días activa; 7d+1ms no', () => {
    const edge = NOW - 30 * DAY_MS;
    const out = activationByCohort(
      [
        { id: 'edge-in', created_at: iso(edge) },
        { id: 'edge-out', created_at: iso(edge) },
      ],
      new Map([
        ['edge-in', edge + ACTIVATION_WINDOW_DAYS * DAY_MS],
        ['edge-out', edge + ACTIVATION_WINDOW_DAYS * DAY_MS + 1],
      ]),
      new Map(),
      NOW,
    );
    expect(out[0]).toMatchObject({ activated_7d: 1, activation_rate_7d: 0.5 });
  });
});

describe('KPI 3 — adopción de gestión', () => {
  it('tareas exactas + gestión como proxy de estado', () => {
    const out = managementAdoption(
      ['a', 'b', 'c'],
      [{ lawyer_id: 'a', created_at: iso(NOW), completed: false, completed_at: null }],
      [
        { lawyer_id: 'b', has_next_action: true },
        { lawyer_id: 'c', has_next_action: false },
      ],
    );
    expect(out).toMatchObject({
      activated_lawyers: 3,
      with_task_ever: 1,
      with_next_action_now: 1,
      with_either: 2,
      task_rate: 1 / 3,
    });
  });

  it('sin activados la tasa es null, no cero', () => {
    expect(managementAdoption([], [], []).task_rate).toBeNull();
  });
});

describe('KPI 4 — documentos e IA reales', () => {
  it('solo cuenta éxito: ready/análisis/respuesta/uso, no aperturas ni fallidos', () => {
    const out = docsAndAiUsers(
      [
        { lawyer_id: 'doc-ok', created_at: iso(NOW), ready: true },
        { lawyer_id: 'doc-fail', created_at: iso(NOW), ready: false },
      ],
      [{ lawyer_id: 'analysis', created_at: iso(NOW) }],
      [{ lawyer_id: 'chat', created_at: iso(NOW) }],
      [{ lawyer_id: 'usage', created_at: iso(NOW) }],
    );
    expect(out.lawyer_ids).toEqual(['analysis', 'chat', 'doc-ok', 'usage']);
    expect(out.lawyers).toBe(4);
  });
});

describe('KPI 5 — retención semana siguiente', () => {
  const firstAt = NOW - 20 * DAY_MS;

  it('acción en (d+1, d+7] retiene; el día 0 y d+8 no', () => {
    const firstActivationAt = new Map([
      ['kept', firstAt],
      ['day0-only', firstAt],
      ['late-only', firstAt],
    ]);
    const out = retentionAfterActivation(
      firstActivationAt,
      [
        { lawyer_id: 'kept', created_at: iso(firstAt + 3 * DAY_MS) },
        { lawyer_id: 'day0-only', created_at: iso(firstAt) },
        { lawyer_id: 'late-only', created_at: iso(firstAt + 8 * DAY_MS) },
      ],
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ activated: 3, returned_week_after: 1, pending: 0 });
    expect(out[0].retention_rate).toBeCloseTo(1 / 3);
  });

  it('activaciones recientes van a pending; ventana cerrada a los 7d cuenta', () => {
    const out = retentionAfterActivation(
      new Map([
        ['fresh', NOW - 2 * DAY_MS],
        ['just-closed', NOW - 7 * DAY_MS - 3_600_000],
      ]),
      [{ lawyer_id: 'just-closed', created_at: iso(NOW - 3 * DAY_MS) }],
      NOW,
    );
    const freshWeek = out.find((c) => c.pending === 1 && c.activated === 0);
    expect(freshWeek).toBeDefined();
    const closed = out.find((c) => c.activated === 1);
    expect(closed).toMatchObject({ returned_week_after: 1, retention_rate: 1 });
  });
});

describe('KPI 6 — conversión a Pro', () => {
  it('distingue suscripción activa de pago; cancelled vigente cuenta, vencida no', () => {
    const out = proConversion(
      [
        { lawyer_id: 'pro', status: 'active', current_period_end: iso(NOW + 10 * DAY_MS), amount_clp: 19990 },
        { lawyer_id: 'cancel-ok', status: 'cancelled', current_period_end: iso(NOW + 5 * DAY_MS), amount_clp: 49990 },
        { lawyer_id: 'cancel-out', status: 'cancelled', current_period_end: iso(NOW - 5 * DAY_MS), amount_clp: 49990 },
        { lawyer_id: 'pending', status: 'pending', current_period_end: null, amount_clp: 19990 },
      ],
      [
        { lawyer_id: 'pro', status: 'approved', provider_payment_id: 'p1', provider_authorized_payment_id: 'a1' },
        { lawyer_id: 'pro', status: 'approved', provider_payment_id: 'p2', provider_authorized_payment_id: 'a2' },
        { lawyer_id: 'rejected', status: 'rejected', provider_payment_id: 'p3', provider_authorized_payment_id: 'a3' },
      ],
      NOW,
    );
    // Dedupe por abogado aunque haya varios pagos; rejected no cuenta.
    expect(out).toMatchObject({
      active_subscriptions: 2,
      active_lawyers: 2,
      paid_lawyers: 1,
      active_amount_clp: 19990 + 49990,
    });
  });
});
