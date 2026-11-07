// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  classifyProspectEmail,
  containsHumanName,
  emailBelongsToPage,
  isDisposableEmail,
  isFirmStyleEmail,
  isGenericEmail,
  isProspectEmailSyntax,
  isValidEmailSyntax,
  normalizeContactName,
  normalizeDomain,
  normalizeEmail,
  normalizeFirmName,
  registrableDomain,
  validateEmail,
} from './validation.mjs';

describe('prospecting validation', () => {
  it('normaliza email y dominio', () => {
    expect(normalizeEmail('  Juan.Perez@Estudio.CL ')).toBe('juan.perez@estudio.cl');
    expect(normalizeDomain('https://www.estudio.cl/equipo?x=1')).toBe('estudio.cl');
    expect(normalizeDomain('estudio.cl')).toBe('estudio.cl');
  });

  it('calcula dominio registrable incluyendo com.cl', () => {
    expect(registrableDomain('abogados.estudio.com.cl')).toBe('estudio.com.cl');
    expect(registrableDomain('www.estudio.cl')).toBe('estudio.cl');
    expect(registrableDomain('sub.estudio.cl')).toBe('estudio.cl');
  });

  it('rechaza direcciones genéricas', () => {
    expect(isGenericEmail('contacto@estudio.cl')).toBe(true);
    expect(isGenericEmail('info@estudio.cl')).toBe(true);
    expect(isGenericEmail('ventas.laboral@estudio.cl')).toBe(true);
    expect(isGenericEmail('juan.perez@estudio.cl')).toBe(false);
  });

  it('rechaza dominios desechables', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('juan@estudio.cl')).toBe(false);
  });

  it('solo acepta emails del dominio del sitio', () => {
    expect(emailBelongsToPage('juan@estudio.cl', 'https://www.estudio.cl/equipo')).toBe(true);
    expect(emailBelongsToPage('juan@estudio.com.cl', 'https://estudio.com.cl')).toBe(true);
    expect(emailBelongsToPage('juan@gmail.com', 'https://estudio.cl')).toBe(false);
    expect(emailBelongsToPage('juan@directorio.cl', 'https://estudio.cl')).toBe(false);
  });

  it('valida sintaxis', () => {
    expect(isValidEmailSyntax('juan.perez@estudio.cl')).toBe(true);
    expect(isValidEmailSyntax('juan@estudio')).toBe(false);
    expect(isValidEmailSyntax('juan..perez@estudio.cl')).toBe(false);
  });

  it('valida MX con resolveMx inyectado', async () => {
    await expect(validateEmail('juan@estudio.cl', { resolveMx: async () => [{ exchange: 'mx', priority: 10 }] }))
      .resolves.toMatchObject({ valid: true, status: 'valid' });
    await expect(validateEmail('juan@estudio.cl', { resolveMx: async () => [] }))
      .resolves.toMatchObject({ valid: false, status: 'invalid', reason: 'no_mx_records' });
    await expect(validateEmail('juan@estudio.cl', { resolveMx: async () => { throw Object.assign(new Error('dns'), { code: 'ENOTFOUND' }); } }))
      .resolves.toMatchObject({ valid: false, status: 'invalid', reason: 'domain_not_found' });
    await expect(validateEmail('juan@estudio.cl', { resolveMx: async () => { throw new Error('timeout'); } }))
      .resolves.toMatchObject({ valid: false, status: 'unknown', reason: 'mx_lookup_failed' });
  });

  it('no inventa un email cuando falta MX', async () => {
    await expect(validateEmail('juan@estudio.cl')).resolves.toMatchObject({
      valid: false,
      status: 'unknown',
      reason: 'mx_not_configured',
    });
  });

  it('normaliza nombres sin cargos ni sufijos de firma', () => {
    expect(normalizeContactName('Abogada Juan Pérez | Estudio Jurídico')).toBe('Juan Pérez');
    expect(normalizeFirmName('Pérez & Asociados | Inicio')).toBe('Pérez & Asociados');
  });

  it('rechaza sintaxis mal extraída y locales que empiezan con dígito', () => {
    expect(isProspectEmailSyntax("'contacto@estudio-beta.example")).toBe(false);
    expect(isProspectEmailSyntax('46abc@estudio-delta.example')).toBe(false);
    expect(isProspectEmailSyntax('juan.perez@estudio.cl')).toBe(true);
    expect(classifyProspectEmail("'contacto@estudio-beta.example")).toMatchObject({
      kind: 'invalid',
      reason: 'invalid_syntax',
    });
  });

  it('clasifica roles, firmas y terceros sin contactarlos', () => {
    expect(classifyProspectEmail('comunicaciones@estudio.cl')).toMatchObject({ kind: 'role', reason: 'role_address' });
    expect(classifyProspectEmail('copropiedad@estudio.cl')).toMatchObject({ kind: 'role', reason: 'role_address' });
    expect(isFirmStyleEmail('ejemplo@ejemplo.example')).toBe(true);
    expect(isFirmStyleEmail('ejemplo@ejemploycia.example')).toBe(true);
    expect(classifyProspectEmail('ejemplo@ejemplo.example', { pageUrl: 'https://ejemplo.example/equipo' })).toMatchObject({
      kind: 'firm',
      reason: 'firm_address',
    });
    expect(classifyProspectEmail('juan@gmail.com', { pageUrl: 'https://estudio.cl' })).toMatchObject({
      kind: 'third_party',
      reason: 'third_party_domain',
    });
    expect(classifyProspectEmail('juan.perez@estudio.cl', { pageUrl: 'https://estudio.cl' })).toMatchObject({
      kind: 'personal',
      reason: null,
    });
  });

  it('clasifica roles compuestos y firmas cuyo local incluye el dominio', () => {
    expect(classifyProspectEmail('correocontacto@estudio-beta.example', { pageUrl: 'https://estudio-beta.example/' })).toMatchObject({
      kind: 'role',
      reason: 'role_address',
    });
    expect(classifyProspectEmail('ejemplo.asociados@ejemplo.example', { pageUrl: 'https://ejemplo.example/' })).toMatchObject({
      kind: 'firm',
      reason: 'firm_address',
    });
  });

  it('marca locales concatenados por HTML como corruptos, no personales', () => {
    for (const email of [
      'larrondesocioejemplo@estudio-zeta.example',
      'nsocioejemplo@estudio-zeta.example',
      'larenassocioejemplo@estudio-zeta.example',
    ]) {
      expect(classifyProspectEmail(email, { pageUrl: 'https://estudio-zeta.example/' })).toMatchObject({
        kind: 'invalid',
        reason: 'corrupted_local_part',
      });
    }
  });

  it('no confunde encabezados de menú con nombres de personas', () => {
    expect(containsHumanName('Áreas de práctica')).toBe(false);
    expect(containsHumanName('Área de Copropiedad')).toBe(false);
    expect(containsHumanName('Calculadoras laborales')).toBe(false);
    expect(containsHumanName('Nuestra Firma')).toBe(false);
    expect(containsHumanName('PROFESIONALES DEL DERECHO')).toBe(false);
    expect(containsHumanName('OPERACIONES RECIENTES')).toBe(false);
    expect(containsHumanName('Cómo funciona')).toBe(false);
    expect(containsHumanName('Navegación principal')).toBe(false);
    expect(containsHumanName('Accidente Laboral')).toBe(false);
    expect(containsHumanName('Penalista en Viña del Mar')).toBe(false);
    expect(containsHumanName('En el centro de Chile')).toBe(false);
    expect(containsHumanName('expertos en causas penales')).toBe(false);
    expect(containsHumanName('Alfonso Del Fierro')).toBe(true);
    expect(containsHumanName('Juan Pérez')).toBe(true);
  });

  it('validateEmail rechaza un genérico sin consultar MX', async () => {
    let called = false;
    const result = await validateEmail('comunicaciones@estudio.cl', {
      resolveMx: async () => { called = true; return [{ exchange: 'mx', priority: 10 }]; },
    });
    expect(result).toMatchObject({
      valid: false,
      status: 'invalid',
      reason: 'role_address',
      email_kind: 'role',
      mailbox_verified: false,
    });
    expect(called).toBe(false);
  });
});
