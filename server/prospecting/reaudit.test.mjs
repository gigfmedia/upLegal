// @vitest-environment node
import { describe, it, expect } from 'vitest';
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
});
