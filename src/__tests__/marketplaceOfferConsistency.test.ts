import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { consultationBase, bookingClientTotal } from '../../shared/bookingPricing.mjs';

// ---------------------------------------------------------------------------
// FASE 5.16 — consistencia de la oferta pública del marketplace.
//
// Fuente de verdad (server.mjs + shared/bookingPricing.mjs):
// - duración elegida por el cliente de {30, 60, 90, 120}
// - UI de booking ofrece 60/90/120 (sin opción de 30 en el flujo)
// - base = tarifa_hora × duración/60 (prorrateo)
// - total cliente = base × (1 + 10%) redondeado a 1000, autoritativo en server
// - cards, perfiles y booking muestran el TOTAL final (con recargo)
// ---------------------------------------------------------------------------

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8');

describe('FASE 5.16 contrato canónico de precios', () => {
  it('base prorrateada: 30 min = mitad de la tarifa hora', () => {
    expect(consultationBase(60000, 30)).toBe(30000);
    expect(consultationBase(60000, 60)).toBe(60000);
    expect(consultationBase(60000, 90)).toBe(90000);
  });

  it('total cliente = base + 10% redondeado a 1000', () => {
    expect(bookingClientTotal(60000, 0.1)).toBe(66000);
    expect(bookingClientTotal(35000, 0.1)).toBe(39000);
  });

  it('server acepta duraciones 30/60/90/120', () => {
    expect(src('server.mjs')).toContain('[30, 60, 90, 120]');
  });
});

describe('FASE 5.16 booking ofrece 60/90/120 con precio final', () => {
  it('selector con 60, 90 y 120 minutos y sin opción de 30', () => {
    const c = src('src/pages/BookingPage.tsx');
    expect(c).toContain('60 minutos');
    expect(c).toContain('90 minutos');
    expect(c).toContain('120 minutos');
    expect(c).not.toMatch(/setDuration\(30\)/);
  });

  it('resumen pre-pago muestra "Total a pagar" con precio final', () => {
    const c = src('src/pages/BookingPage.tsx');
    expect(c).toContain('Total a pagar:');
  });
});

describe('FASE 5.16 ArriendoLanding sin contradicciones', () => {
  it('sin oferta de 30 minutos / media tarifa', () => {
    const c = src('src/pages/ArriendoLanding.tsx');
    expect(c).not.toContain('30 minutos');
    expect(c).not.toContain('mitad de la tarifa');
  });

  it('sin promesa de desglose previo al pago (la UI muestra solo el total)', () => {
    const c = src('src/pages/ArriendoLanding.tsx');
    expect(c).not.toContain('desglosados');
  });

  it('mantiene encuadre 60 minutos + desde $35.000', () => {
    const c = src('src/pages/ArriendoLanding.tsx');
    expect(c).toContain('60 minutos');
    expect(c).toContain('desde $35.000');
  });

  it('cards y perfiles muestran precio final con recargo (lo que ves = lo que pagas)', () => {
    for (const f of [
      'src/components/LawyerCard.tsx',
      'src/components/blog/RelatedLawyerCard.tsx',
      'src/pages/PublicProfile.tsx',
    ]) {
      expect(src(f)).toContain('bookingClientTotal');
    }
  });
});
