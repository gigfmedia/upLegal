// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  assessCandidateQuality,
  buildDomainKey,
  buildPersonKey,
  classifyOrganization,
  selectEligibleContacts,
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
      status: 'excluded',
      validation_status: 'invalid',
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
});
