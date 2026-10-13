import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('sprint conversión: sin disponibilidad inventada', () => {
  it('LawyerCard no afirma disponibilidad sin config', () => {
    const c = read('src/components/LawyerCard.tsx');
    expect(c).not.toContain('Assume default availability');
    expect(c).toContain('Sin config de disponibilidad no se afirma disponibilidad');
  });

  it('BookingPage: error de disponibilidad muestra error, no slots inventados', () => {
    const c = read('src/pages/BookingPage.tsx');
    expect(c).toContain('No pudimos cargar la disponibilidad');
    expect(c).toContain('setSlotsError(true)');
    expect(c).not.toMatch(/Error fallback: use ref/);
  });

  it('409 de horario refresca disponibilidad vía onSlotTaken', () => {
    const modal = read('src/components/PreCheckoutModal.tsx');
    expect(modal).toContain('onSlotTaken');
    expect(modal).toContain('response.status === 409');
    const page = read('src/pages/BookingPage.tsx');
    expect(page).toContain('onSlotTaken');
  });
});

describe('sprint conversión: confianza en pago', () => {
  it('BookingSuccess exige confirmed y no dispara purchase en pendiente', () => {
    const c = read('src/pages/BookingSuccessPage.tsx');
    expect(c).toContain("booking.status === 'confirmed'");
    expect(c).toContain('Estamos verificando tu pago');
    expect(c).toContain('booking && !purchaseTracked.current && booking.status');
  });

  it('existe ruta /payment/pending', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('path="/payment/pending"');
  });

  it('total con nota de recargo en booking y modal', () => {
    expect(read('src/pages/BookingPage.tsx')).toContain('Incluye recargo de plataforma');
    expect(read('src/components/PreCheckoutModal.tsx').split('Incluye recargo de plataforma').length - 1).toBeGreaterThanOrEqual(2);
  });

  it('modal usa trackBeginCheckout canónico sin PII en items', () => {
    const c = read('src/components/PreCheckoutModal.tsx');
    expect(c).toContain('trackBeginCheckout');
    expect(c).not.toContain('item_name');
  });
});
