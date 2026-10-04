// @vitest-environment node
// FASE 4.60B.2 — normalización determinista de fechas de plazos + contrato
// con la promoción 4.60B. Sin cálculo de plazos: solo formatea fechas
// calendario explícitas; lo relativo/ambiguo queda verbatim.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeDeadlineDate, normalizeDeadlineItem } from './deadlineDates.mjs';
import { buildAnalysisSystemPrompt } from './legalPrompt.mjs';
import { verifyDocumentClaims } from './documentGrounding.mjs';

describe('normalizeDeadlineDate — fixture A (absoluta)', () => {
  it('normaliza "15 de octubre de 2026" a 2026-10-15', () => {
    expect(normalizeDeadlineDate('15 de octubre de 2026')).toBe('2026-10-15');
  });
  it('preserva AAAA-MM-DD válida y rechaza calendario imposible', () => {
    expect(normalizeDeadlineDate('2026-10-15')).toBe('2026-10-15');
    expect(normalizeDeadlineDate('2026-02-30')).toBe('2026-02-30');
    expect(normalizeDeadlineDate('2026-13-40')).toBe('2026-13-40');
  });
  it('normaliza numérica chilena DD-MM-AAAA', () => {
    expect(normalizeDeadlineDate('15/10/2026')).toBe('2026-10-15');
  });
});

describe('normalizeDeadlineDate — fixture B (relativa, sin cálculo)', () => {
  it('preserva texto relativo verbatim', () => {
    expect(normalizeDeadlineDate('dentro de quinto día desde la notificación'))
      .toBe('dentro de quinto día desde la notificación');
    expect(normalizeDeadlineDate('dentro de los primeros cinco días de cada mes'))
      .toBe('dentro de los primeros cinco días de cada mes');
    expect(normalizeDeadlineDate('15 días hábiles')).toBe('15 días hábiles');
  });
  it('vacío/nulo → cadena vacía', () => {
    expect(normalizeDeadlineDate('')).toBe('');
    expect(normalizeDeadlineDate(null)).toBe('');
    expect(normalizeDeadlineDate(undefined)).toBe('');
  });
});

describe('normalizeDeadlineItem — fixtures C (múltiple) y D (sin plazo)', () => {
  it('normaliza cada item mixto sin duplicar ni inventar', () => {
    const items = [
      { date: '31 de agosto de 2027', description: 'Término de vigencia del contrato.' },
      { date: '2026-10-15', description: 'Vencimiento del pago requerido.' },
      { date: 'dentro de quinto día desde la notificación', description: 'Contestar el requerimiento.' },
    ].map(normalizeDeadlineItem);
    expect(items).toHaveLength(3);
    expect(items[0].date).toBe('2027-08-31');
    expect(items[1].date).toBe('2026-10-15');
    expect(items[2].date).toBe('dentro de quinto día desde la notificación');
  });
  it('string legacy → { date: "", description }', () => {
    expect(normalizeDeadlineItem('pago mensual')).toEqual({ date: '', description: 'pago mensual' });
  });
});

describe('compatibilidad 4.60B (parseSupportedDeadlineDate)', () => {
  it('absoluta normalizada calza AAAA-MM-DD estricto; relativa no', () => {
    const strict = /^(\d{4})-(\d{2})-(\d{2})$/;
    expect(strict.test(normalizeDeadlineDate('Fecha de vencimiento: 15 de octubre de 2026'.replace('Fecha de vencimiento: ', '')))).toBe(true);
    expect(strict.test(normalizeDeadlineDate('dentro de quinto día desde la notificación'))).toBe(false);
  });
});

describe('verificación de deadlines ya no exige cita literal (dropout 4.60B.1)', () => {
  const text = 'REQUERIMIENTO DE PAGO. Fecha de vencimiento del pago requerido: 15 de octubre de 2026. Plazo para contestar este requerimiento: dentro de quinto día desde la notificación del presente documento.';
  const docs = new Map([['doc1', { id: 'doc1', workspace_id: 'ws', lawyer_id: 'law', original_filename: 'qa.pdf', extracted_text: text }]]);
  it('paráfrasis de plazo se conserva sin fragmento auto-inventado', () => {
    const claims = [
      { document_id: 'doc1', afirmacion: 'Pagar la suma requerida a más tardar el 15 de octubre de 2026.' },
      { document_id: 'doc1', afirmacion: 'Contestar el requerimiento dentro de quinto día desde la notificación.' },
    ];
    const { kept } = verifyDocumentClaims(claims, docs, 'ws', 'law');
    expect(kept).toHaveLength(2);
  });
  it('server.mjs ya no pasa description como fragmento en deadlines', () => {
    const src = readFileSync(new URL('../../server.mjs', import.meta.url), 'utf8');
    expect(src).not.toMatch(/afirmacion: desc, fragmento: desc/);
  });
});

describe('contrato de prompt (extracción estructurada obligatoria)', () => {
  it('el prompt exige deadlines explícitos incl. relativos sin calcular fechas', () => {
    const p = buildAnalysisSystemPrompt();
    expect(p).toMatch(/fecha de vencimiento de pago/i);
    expect(p).toMatch(/plazos relativos/i);
    expect(p).toMatch(/SIN calcular/i);
    expect(p).toMatch(/como arreglo vac[ií]o/);
  });
});
