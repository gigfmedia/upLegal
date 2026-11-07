// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { QUALITY_RULES_VERSION } from './quality.mjs';
import { buildReauditPlan } from './reaudit.mjs';

describe('prospecting reaudit', () => {
  it('propone actualizar columnas nuevas sin borrar ni degradar historial terminal', () => {
    const { summary, updates } = buildReauditPlan([
      {
        id: '1',
        email: 'juan@estudio.cl',
        contact_name: 'Juan Pérez',
        firm_name: 'Estudio Pérez',
        website: 'https://estudio.cl',
        source_url: 'https://estudio.cl/equipo',
        description: 'Derecho laboral',
        status: 'new',
        validation_status: 'valid',
      },
      {
        id: '2',
        email: 'contacto@municipalidad-ejemplo.example',
        contact_name: 'Áreas de práctica',
        firm_name: 'Municipalidad de Ejemplo',
        website: 'https://municipalidad-ejemplo.example',
        source_url: 'https://municipalidad-ejemplo.example',
        description: 'Municipalidad de Ejemplo',
        status: 'new',
        validation_status: 'valid',
      },
      {
        id: '3',
        email: 'maria@otro.cl',
        contact_name: 'María Soto',
        firm_name: 'Soto Abogados',
        website: 'https://otro.cl',
        source_url: 'https://otro.cl',
        description: 'Derecho civil',
        status: 'contacted',
        validation_status: 'valid',
      },
    ], { now: () => new Date('2026-11-05T12:00:00.000Z') });

    expect(summary).toMatchObject({
      total: 3,
      would_exclude: 1,
      would_keep: 2,
      kept_terminal_history: 1,
    });
    expect(updates[1]).toMatchObject({
      id: '2',
      patch: {
        org_type: 'public_entity',
        status: 'excluded',
        validation_status: 'invalid',
        person_key: null,
        quality_evaluated_at: '2026-11-05T12:00:00.000Z',
      },
    });
    expect(updates[2].patch).not.toHaveProperty('status');
    expect(updates[2].patch).toMatchObject({ org_type: 'law_firm', person_key: 'maria-soto' });
  });

  it('acepta evidencia transitoria de fuente sin persistirla', () => {
    const { summary, updates } = buildReauditPlan([
      {
        id: '5',
        email: null,
        contact_name: null,
        firm_name: 'Estudio Zeta & Asociados',
        website: 'https://estudio-zeta.example',
        source_url: 'https://estudio-zeta.example/',
        description: null,
        status: 'new',
        validation_status: 'no_email',
      },
      {
        id: '6',
        email: null,
        contact_name: null,
        firm_name: 'Colegio Ejemplo',
        website: 'https://colegio-ejemplo.example',
        source_url: 'https://colegio-ejemplo.example/estudio-juridico/',
        description: 'Derecho Público',
        status: 'new',
        validation_status: 'no_email',
      },
    ], {
      sourceEvidenceById: {
        5: { sourceTitle: 'Estudio Zeta & Asociados - Abogados' },
        6: { siteSignals: 'Matrícula Apoderados Alumnos' },
      },
    });

    expect(updates[0].patch).toMatchObject({ org_type: 'law_firm' });
    expect(updates[1].patch).toMatchObject({ org_type: 'school' });
    expect(summary.by_org_type).toEqual({ law_firm: 1, school: 1 });
  });

  it('no persiste contacto ni firma aunque use la evidencia para evaluar', () => {
    const { updates } = buildReauditPlan([
      {
        id: '8',
        email: 'persona@cruzmunoz.example',
        contact_name: 'Áreas de práctica',
        firm_name: 'Fundada en 2011, Cruz&Muñoz Abogados se especializa en Leyes empresariales.',
        website: 'https://cruzmunoz.example',
        source_url: 'https://cruzmunoz.example/',
        sourceTitle: 'Cruz & Muñoz Abogados – Bufete de abogados en Concepción.',
        status: 'validated',
        validation_status: 'valid',
      },
      {
        id: '9',
        email: 'persona@claro.example',
        contact_name: 'PROFESIONALES DEL DERECHO',
        firm_name: 'Abogados',
        website: 'https://claro.example',
        source_url: 'https://claro.example/abogados/',
        sourceTitle: 'Abogados – Claro y Cia.',
        status: 'validated',
        validation_status: 'valid',
      },
    ], { now: () => new Date('2026-11-06T12:00:00.000Z') });

    for (const update of updates) {
      expect(update.patch).not.toHaveProperty('contact_name');
      expect(update.patch).not.toHaveProperty('firm_name');
    }
    expect(updates[0].patch).toMatchObject({ org_type: 'law_firm', person_key: null });
    expect(updates[1].patch).toMatchObject({ org_type: 'law_firm', person_key: null });
  });

  it('marca revisión manual no terminal y permite reevaluarla después', () => {
    const row = {
      id: 'manual-1',
      email: 'larrondesocioejemplo@estudio-kappa.example',
      contact_name: null,
      firm_name: 'Estudio Kappa Abogados',
      website: 'https://estudio-kappa.example',
      source_url: 'https://estudio-kappa.example/',
      description: 'Abogados penalistas',
      status: 'validated',
      validation_status: 'valid',
    };
    const first = buildReauditPlan([row], { now: () => new Date('2026-11-07T12:00:00.000Z') });
    expect(first.summary).toMatchObject({
      would_exclude: 0,
      would_keep: 0,
      manual_review: 1,
      excluded_or_review: 1,
    });
    expect(first.updates[0]).toMatchObject({
      review: { required: true, reason: 'email_corrupted_local_part' },
      patch: {
        status: 'validated',
        validation_status: 'pending',
        rejection_reason: 'manual_review:email_corrupted_local_part',
      },
    });

    const current = { ...row, ...first.updates[0].patch };
    const second = buildReauditPlan([current], { now: () => new Date('2026-11-07T12:00:00.000Z') });
    expect(second.summary).toMatchObject({ manual_review: 1, skipped_current: 1 });
    expect(second.updates).toHaveLength(0);

    const corrected = { ...current, email: 'persona@estudio-kappa.example' };
    const resolved = buildReauditPlan([corrected], {
      sourceEvidenceById: { 'manual-1': { sourceTitle: 'Estudio Kappa Abogados' } },
      now: () => new Date('2026-11-07T12:00:00.000Z'),
    });
    expect(resolved.summary).toMatchObject({
      would_exclude: 0,
      would_keep: 1,
      manual_review: 0,
      excluded_or_review: 0,
    });
    expect(resolved.updates[0].patch).toMatchObject({
      status: 'validated',
      validation_status: 'valid',
      rejection_reason: null,
    });
  });

  it('revive una revisión manual antigua guardada como exclusión terminal', () => {
    const { summary, updates } = buildReauditPlan([{
      id: 'manual-legacy',
      email: 'persona@estudio-kappa.example',
      contact_name: null,
      firm_name: 'Estudio Kappa Abogados',
      website: 'https://estudio-kappa.example',
      source_url: 'https://estudio-kappa.example/',
      description: 'Abogados gratis',
      status: 'excluded',
      validation_status: 'invalid',
      rejection_reason: 'manual_review:organization_lead_gen_risk',
    }], { now: () => new Date('2026-11-07T12:00:00.000Z') });

    expect(summary).toMatchObject({
      would_exclude: 0,
      would_keep: 0,
      kept_terminal_history: 0,
      manual_review: 1,
      excluded_or_review: 1,
    });
    expect(updates[0].patch).toMatchObject({
      status: 'validated',
      validation_status: 'pending',
      rejection_reason: 'manual_review:organization_lead_gen_risk',
    });
  });

  it('conserva el estado de un prospecto terminal aunque su calidad actual lo excluya', () => {
    const { summary, updates } = buildReauditPlan([
      {
        id: '4',
        email: 'contacto@municipalidad-ejemplo.example',
        contact_name: 'Contacto',
        firm_name: 'Municipalidad de Ejemplo',
        website: 'https://municipalidad-ejemplo.example',
        source_url: 'https://municipalidad-ejemplo.example',
        description: 'Municipalidad de Ejemplo',
        status: 'excluded',
        validation_status: 'invalid',
      },
    ]);

    expect(summary).toMatchObject({
      total: 1,
      would_exclude: 0,
      would_keep: 1,
      kept_terminal_history: 1,
    });
    expect(updates[0].patch).not.toHaveProperty('status');
    expect(updates[0].patch).not.toHaveProperty('validation_status');
    expect(updates[0].patch).toMatchObject({ org_type: 'public_entity' });
  });

  it('es idempotente y solo reescribe con force', () => {
    const source = {
      id: '7',
      email: 'persona@estudio-alfa.example',
      contact_name: 'Persona Alfa',
      firm_name: 'Estudio Alfa & Asociados',
      website: 'https://estudio-alfa.example',
      source_url: 'https://estudio-alfa.example/equipo',
      description: 'Abogados laboralistas',
      status: 'validated',
      validation_status: 'valid',
    };
    const now = () => new Date('2026-11-06T12:00:00.000Z');
    const first = buildReauditPlan([source], { now });
    expect(first.updates).toHaveLength(1);
    expect(first.summary).toMatchObject({ evaluated: 1, changed: 1, skipped_current: 0 });
    expect(first.updates[0].patch).toMatchObject({
      quality_rules_version: QUALITY_RULES_VERSION,
      quality_evaluated_at: '2026-11-06T12:00:00.000Z',
    });

    const current = { ...source, ...first.updates[0].patch };
    const second = buildReauditPlan([current], { now });
    expect(second.updates).toHaveLength(0);
    expect(second.summary).toMatchObject({ evaluated: 1, changed: 0, skipped_current: 1 });

    const forced = buildReauditPlan([current], { now, force: true });
    expect(forced.updates).toHaveLength(1);
    expect(forced.summary).toMatchObject({ evaluated: 1, changed: 1, skipped_current: 0 });
  });

  it('nunca sobrescribe un estado terminal, incluida validación invalid', () => {
    const terminalStatuses = ['contacted', 'bounced', 'complained', 'unsubscribed', 'failed', 'excluded'];
    const rows = terminalStatuses.map((status, index) => ({
      id: `terminal-${index}`,
      email: 'contacto@municipalidad-ejemplo.example',
      contact_name: 'Contacto',
      firm_name: 'Municipalidad de Ejemplo',
      website: 'https://municipalidad-ejemplo.example',
      source_url: 'https://municipalidad-ejemplo.example',
      description: 'Municipalidad de Ejemplo',
      status,
      validation_status: 'invalid',
    }));
    rows.push({
      id: 'terminal-invalid',
      email: 'persona@estudio-alfa.example',
      contact_name: 'Persona Alfa',
      firm_name: 'Estudio Alfa & Asociados',
      website: 'https://estudio-alfa.example',
      source_url: 'https://estudio-alfa.example',
      description: 'Abogados',
      status: 'new',
      validation_status: 'invalid',
    });

    const { summary, updates } = buildReauditPlan(rows);
    expect(summary.kept_terminal_history).toBe(rows.length);
    expect(summary.would_exclude).toBe(0);
    for (const update of updates) {
      expect(update.patch).not.toHaveProperty('status');
      expect(update.patch).not.toHaveProperty('validation_status');
    }
  });
});
