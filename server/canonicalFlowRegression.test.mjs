// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('FASE 2E — flujo canónico de consulta', () => {
  const server = read('server.mjs');
  const scheduleModal = read('src/components/ScheduleModal.tsx');

  it('ScheduleModal crea la reserva por /api/bookings/create', () => {
    expect(scheduleModal).toContain('`${apiBase}/api/bookings/create`');
    expect(scheduleModal).toContain('bookingResult.payment_link');
  });

  it('la preferencia usa precio calculado en servidor y external_reference del booking', () => {
    expect(server).toContain('unit_price: computedPrice');
    expect(server).toContain('external_reference: booking.id');
    expect(server).toContain('computedPrice !== price');
  });

  it('el webhook firmado falla cerrado sin secreto o sin firma', () => {
    expect(server).toContain('MERCADOPAGO_WEBHOOK_SECRET');
    expect(server).toContain('Webhook REJECTED (fail-closed)');
    expect(server).toContain("return res.status(401).json({ error: 'Missing webhook signature' })");
    expect(server).toContain("return res.status(401).json({ error: 'Invalid webhook signature' })");
  });

  it('el webhook valida monto y CLP antes de reclamar el booking', () => {
    expect(server).toContain('paidAmount !== expectedClientTotal || paidCurrency !== \'CLP\'');
    expect(server).toContain('needs_manual_review: true');
  });
});
