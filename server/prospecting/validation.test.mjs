// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  emailBelongsToPage,
  isDisposableEmail,
  isGenericEmail,
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
});
