// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  QUALITY_RULES_VERSION,
  assessCandidateQuality,
  buildDomainKey,
  buildPersonKey,
  classifyOrganization,
  isQualityEligible,
  resolveDisplayFirmName,
  selectEligibleContacts,
  selectQualityEligibleContacts,
} from './quality.mjs';

describe('prospecting quality', () => {
  it('clasifica estudios, municipios, colegios y portales', () => {
    expect(classifyOrganization({ website: 'https://perez.cl', firmName: 'Pérez & Asociados', text: 'Derecho laboral' })).toBe('law_firm');
    expect(classifyOrganization({ website: 'https://providencia.cl', text: 'Municipalidad de Providencia' })).toBe('public_entity');
    expect(classifyOrganization({ website: 'https://lascondes.cl' })).toBe('public_entity');
    expect(classifyOrganization({ website: 'https://ssccprovidencia.cl', text: 'Colegio SSCC' })).toBe('school');
    expect(classifyOrganization({ website: 'https://abogadopro.cl', text: 'Directorio de abogados' })).toBe('portal');
    expect(classifyOrganization({ website: 'https://otro.cl', firmName: 'Otro' })).toBe('other');
  });

  it('reconoce plurales y evidencia de fuente sin promover señales débiles', () => {
    expect(classifyOrganization({
      website: 'https://estudio-alfa.example',
      firmName: 'Abogados',
      sourceTitle: 'Abogados - Estudio Alfa',
      text: 'Estudio Alfa',
    })).toBe('law_firm');
    expect(classifyOrganization({
      website: 'https://estudio-zeta.example',
      firmName: 'Estudio Zeta & Asociados',
    })).toBe('other');
    expect(classifyOrganization({
      website: 'https://estudio-zeta.example',
      firmName: 'Estudio Zeta & Asociados',
      sourceTitle: 'Estudio Zeta & Asociados - Abogados',
    })).toBe('law_firm');
    expect(classifyOrganization({
      website: 'https://colegio-ejemplo.example',
      firmName: 'Colegio Ejemplo',
      text: 'Derecho Público',
    })).toBe('other');
    expect(classifyOrganization({
      website: 'https://colegio-ejemplo.example',
      firmName: 'Colegio Ejemplo',
      text: 'Derecho Público',
      siteSignals: 'Matrícula Apoderados Alumnos',
    })).toBe('school');
  });

  it('deriva un nombre de firma visible desde la evidencia de fuente', () => {
    expect(resolveDisplayFirmName({
      firmName: 'Abogados',
      sourceTitle: 'Abogados – Claro y Cia.',
    })).toBe('Claro y Cia.');
    expect(resolveDisplayFirmName({
      firmName: 'Fundada en 2011, Cruz&Muñoz Abogados se especializa en Leyes empresariales.',
      sourceTitle: 'Cruz & Muñoz Abogados – Bufete de abogados en Concepción.',
    })).toBe('Cruz & Muñoz Abogados');
    expect(resolveDisplayFirmName({
      firmName: 'Fundada en 2011, Estudio Epsilon Abogados se especializa en Leyes empresariales.',
      sourceTitle: 'Abogados en Chile',
    })).toBe('Fundada en 2011, Estudio Epsilon Abogados se especializa en Leyes empresariales.');
  });

  it('marca revisión manual para lead-gen, identidad débil y correos corruptos', () => {
    const leadGen = assessCandidateQuality({
      email: null,
      firm_name: 'Estudio Lead Gen',
      website: 'https://leadgen.example',
      source_url: 'https://leadgen.example/',
      description: 'Paga solo por resultados',
      sourceTitle: 'Abogados Gratis | Abogado Laboralista',
      sourceH1: 'Abogados Gratis',
      status: 'new',
      validation_status: 'no_email',
    });
    expect(leadGen).toMatchObject({
      org_type: 'law_firm',
      review_required: true,
      review_reason: 'organization_lead_gen_risk',
      rejection_reason: 'manual_review:organization_lead_gen_risk',
      status: 'new',
      validation_status: 'pending',
    });

    const weakIdentity = assessCandidateQuality({
      email: null,
      firm_name: 'confie en nosotros, somos un equipo de ejemplo',
      website: 'https://estudio-kappa.example',
      source_url: 'https://estudio-kappa.example/',
      description: 'Abogados penalistas',
      sourceTitle: 'Abogado | Abogados en Ciudad Ejemplo - Chile',
      sourceH1: 'confie en nosotros, somos un equipo de abogados de ejemplo',
      status: 'new',
      validation_status: 'no_email',
    });
    expect(weakIdentity).toMatchObject({
      org_type: 'law_firm',
      review_required: true,
      review_reason: 'organization_weak_identity',
    });

    const realFirmWithLongHeading = assessCandidateQuality({
      email: 'persona@estudio-epsilon.example',
      firm_name: 'Fundada en 2011, Estudio Epsilon Abogados se especializa en Leyes empresariales.',
      website: 'https://www.estudio-epsilon.example',
      source_url: 'https://www.estudio-epsilon.example/',
      description: 'Bufete de abogados en Concepción',
      sourceTitle: 'Estudio Epsilon Abogados – Bufete de abogados en Concepción.',
      sourceH1: 'Fundada en 2011, Estudio Epsilon Abogados se especializa en Leyes empresariales.',
      status: 'validated',
      validation_status: 'valid',
    });
    expect(realFirmWithLongHeading).toMatchObject({
      firm_name: 'Estudio Epsilon Abogados',
      org_type: 'law_firm',
      email_kind: 'personal',
      review_required: false,
      rejection_reason: null,
    });

    const corrupted = assessCandidateQuality({
      email: 'larrondesocioejemplo@estudio-zeta.example',
      firm_name: 'Estudio Zeta & Asociados',
      website: 'https://estudio-zeta.example',
      source_url: 'https://estudio-zeta.example/',
      sourceTitle: 'Estudio Zeta & Asociados - Abogados',
      status: 'new',
      validation_status: 'valid',
    });
    expect(corrupted).toMatchObject({
      org_type: 'law_firm',
      email_kind: 'invalid',
      review_required: true,
      review_reason: 'email_corrupted_local_part',
    });
  });

  it('normaliza persona y dominio para deduplicar', () => {
    expect(buildPersonKey('Alfonso Del Fierro')).toBe('alfonso-del-fierro');
    expect(buildPersonKey('Áreas de práctica')).toBe(null);
    expect(buildPersonKey('Área de Copropiedad')).toBe(null);
    expect(buildPersonKey('Calculadoras laborales')).toBe(null);
    expect(buildPersonKey('Navegación principal')).toBe(null);
    expect(buildPersonKey('Penalista en Viña del Mar')).toBe(null);
    expect(buildPersonKey('En el centro de Chile')).toBe(null);
    expect(buildDomainKey({ email: 'persona@estudio-delta.example', website: 'https://www.estudio-delta.example' })).toBe('estudio-delta.example');
    expect(buildDomainKey({ email: 'juan@estudio.com.cl', website: 'https://estudio.com.cl' })).toBe('estudio.com.cl');
  });

  it('excluye organizaciones no jurídicas y nombres que son menús', () => {
    const assessed = assessCandidateQuality({
      email: 'contacto@municipalidad-ejemplo.example',
      contact_name: 'Áreas de práctica',
      firm_name: 'Municipalidad de Ejemplo',
      website: 'https://municipalidad-ejemplo.example',
      description: 'Municipalidad de Ejemplo',
      source_url: 'https://municipalidad-ejemplo.example',
      validation_status: 'pending',
      status: 'new',
    });
    expect(assessed).toMatchObject({
      contact_name: null,
      email_kind: 'role',
      org_type: 'public_entity',
      rejection_reason: 'organization_public_entity',
      status: 'excluded',
      validation_status: 'invalid',
      mailbox_verified: false,
    });
  });

  it('selecciona una persona y un estudio por campaña por defecto', () => {
    const rows = [
      { id: 1, domain_key: 'dyc.cl', person_key: 'alfonso-del-fierro' },
      { id: 2, domain_key: 'dyc.cl', person_key: 'otra-persona' },
      { id: 3, domain_key: 'otro.cl', person_key: 'alfonso-del-fierro' },
      { id: 4, domain_key: 'tercero.cl', person_key: 'maria-soto' },
    ];
    expect(selectEligibleContacts(rows, { limit: 10 }).map((row) => row.id)).toEqual([1, 4]);
    expect(selectEligibleContacts(rows, { allowMultipleContactsPerFirm: true, limit: 10 }).map((row) => row.id)).toEqual([1, 2, 4]);
  });

  it('solo selecciona prospectos evaluados que superan calidad actual', () => {
    const base = {
      quality_evaluated_at: '2026-11-06T12:00:00.000Z',
      quality_rules_version: QUALITY_RULES_VERSION,
      org_type: 'law_firm',
      email_kind: 'personal',
      validation_status: 'valid',
      status: 'validated',
      send_status: 'not_sent',
      rejection_reason: null,
      email: 'persona@estudio-alfa.example',
      website: 'https://estudio-alfa.example',
      person_key: 'persona-alfa',
      domain_key: 'estudio-alfa.example',
    };
    const rows = [
      { ...base, id: 'historico-sin-evaluar', quality_evaluated_at: null },
      { ...base, id: 'organizacion-no-juridica', org_type: 'portal' },
      { ...base, id: 'email-no-personal', email_kind: 'role' },
      { ...base, id: 'validacion-invalida', validation_status: 'invalid' },
      { ...base, id: 'calidad-rechazada', rejection_reason: 'organization_lead_gen_risk' },
      { ...base, id: 'reglas-antiguas', quality_rules_version: '2026-01-01.1' },
      { ...base, id: 'ya-enviado', send_status: 'sent' },
      { ...base, id: 'elegible-1' },
      { ...base, id: 'elegible-2', email: 'persona@estudio-beta.example', website: 'https://estudio-beta.example', person_key: 'persona-beta', domain_key: 'estudio-beta.example', status: 'new' },
      { ...base, id: 'elegible-3', email: 'persona@estudio-gamma.example', website: 'https://estudio-gamma.example', person_key: 'persona-gamma', domain_key: 'estudio-gamma.example' },
      { ...base, id: 'duplicado-firma', email: 'otra@estudio-alfa.example', website: 'https://estudio-alfa.example', person_key: 'otra-persona-alfa', domain_key: 'estudio-alfa.example' },
    ];

    expect(isQualityEligible(rows[0])).toBe(false);
    expect(isQualityEligible(rows[1])).toBe(false);
    expect(isQualityEligible(rows[2])).toBe(false);
    expect(isQualityEligible(rows[3])).toBe(false);
    expect(isQualityEligible(rows[4])).toBe(false);
    expect(isQualityEligible(rows[5])).toBe(false);
    expect(isQualityEligible(rows[6])).toBe(false);
    expect(isQualityEligible(rows[7])).toBe(true);

    expect(selectQualityEligibleContacts(rows, { limit: 10 }).map((row) => row.id))
      .toEqual(['elegible-1', 'elegible-2', 'elegible-3']);
    expect(selectQualityEligibleContacts(rows, { limit: 2 }).map((row) => row.id))
      .toEqual(['elegible-1', 'elegible-2']);
    expect(selectQualityEligibleContacts(rows, { allowMultipleContactsPerFirm: true, limit: 10 }).map((row) => row.id))
      .toEqual(['elegible-1', 'elegible-2', 'elegible-3', 'duplicado-firma']);
  });
});
