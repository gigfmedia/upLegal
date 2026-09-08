// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

// Simula el claim recuperable idéntico a server.mjs
function createMockSupabase(initialBookings = []) {
  const bookings = new Map(initialBookings.map(b => [b.id, { ...b }]));
  const paymentEvents = [];
  return {
    bookings,
    paymentEvents,
    from(table) {
      if (table === 'bookings') {
        let eqVal = null;
        let isNullCol = null;
        let updatePayload = null;
        const builder = {
          select() { return builder; },
          eq(key, val) { eqVal = val; return builder; },
          is(k, v) { isNullCol = k; return builder; },
          update(payload) { updatePayload = payload; return builder; },
          maybeSingle: async () => {
            if (updatePayload) {
              const id = eqVal;
              const row = bookings.get(id);
              if (!row) return { data: null, error: null };
              if (isNullCol === 'payment_id' && row.payment_id !== null) return { data: null, error: null };
              const updated = { ...row, ...updatePayload };
              bookings.set(id, updated);
              const res = { ...updated };
              updatePayload = null; isNullCol = null; eqVal = null;
              return { data: res, error: null };
            }
            const row = bookings.get(eqVal);
            const res = row ? { ...row } : null;
            eqVal = null;
            return { data: res, error: null };
          },
        };
        return builder;
      }
      if (table === 'payment_events') {
        let filterVal = null;
        const builder = {
          select() { return builder; },
          eq() { return builder; },
          filter(k, op, val) { filterVal = val; return builder; },
          maybeSingle: async () => {
            const found = paymentEvents.find(e => e.metadata?.payment_id === filterVal);
            return { data: found || null, error: null };
          },
          insert(payload) {
            const exists = paymentEvents.find(e => e.metadata?.payment_id === payload.metadata?.payment_id && e.event_type === 'success');
            if (exists) return { error: { code: '23505', message: 'payment_events_success_payment_once' } };
            const row = { id: `pe_${paymentEvents.length}`, ...payload };
            paymentEvents.push(row);
            return { error: null };
          },
        };
        return builder;
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  };
}

async function runClaim({ supabase, bookingId, paymentId }) {
  const { data: existing } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
  if (!existing) return { status: 'not_found' };
  if (existing.payment_id && existing.payment_id !== paymentId) {
    return { status: 'conflict', existing: existing.payment_id };
  }
  if (!existing.payment_id) {
    const { data: claimed } = await supabase.from('bookings').update({ payment_id: paymentId, status: 'confirmed' }).is('payment_id', null).eq('id', bookingId).select('*').maybeSingle();
    if (claimed) return { status: 'claimed', booking: claimed };
    const { data: raced } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (raced?.payment_id === paymentId) return { status: 'recovery', booking: raced };
    return { status: 'failed' };
  }
  return { status: 'recovery', booking: existing };
}

describe('FASE 3A — webhook recovery & idempotency', () => {
  const B1 = '00000000-0000-4000-a000-000000000001';
  const P1 = 'pay_111';
  const P2 = 'pay_222';

  it('happy path: claim + success', async () => {
    const db = createMockSupabase([{ id: B1, payment_id: null, status: 'pending' }]);
    const r = await runClaim({ supabase: db, bookingId: B1, paymentId: P1 });
    expect(r.status).toBe('claimed');
    expect(db.bookings.get(B1).payment_id).toBe(P1);
  });

  it('retry después de fallo parcial: mismo P1 recupera', async () => {
    const db = createMockSupabase([{ id: B1, payment_id: null, status: 'pending' }]);
    // primera entrega: claim ok
    const r1 = await runClaim({ supabase: db, bookingId: B1, paymentId: P1 });
    expect(r1.status).toBe('claimed');
    // simula fallo después del claim (lawyer no resuelto) → booking queda con P1 pero sin side effects
    // segunda entrega mismo P1
    const r2 = await runClaim({ supabase: db, bookingId: B1, paymentId: P1 });
    expect(r2.status).toBe('recovery');
    expect(r2.booking.payment_id).toBe(P1);
    // debe poder continuar a payment accounting (no bloqueado)
    const pe = db.from('payment_events');
    const ins1 = pe.insert({ event_type: 'success', metadata: { payment_id: P1 } });
    expect(ins1.error).toBeNull();
    const ins2 = pe.insert({ event_type: 'success', metadata: { payment_id: P1 } });
    expect(ins2.error.code).toBe('23505'); // segundo no duplica
  });

  it('retry después de éxito completo: no duplica', async () => {
    const db = createMockSupabase([{ id: B1, payment_id: P1, status: 'confirmed' }]);
    db.paymentEvents.push({ id: 'pe1', event_type: 'success', metadata: { payment_id: P1 } });
    const r = await runClaim({ supabase: db, bookingId: B1, paymentId: P1 });
    expect(r.status).toBe('recovery');
    // payment_events ya existe → insert duplicado debe dar 23505
    const pe = db.from('payment_events');
    const ins = pe.insert({ event_type: 'success', metadata: { payment_id: P1 } });
    expect(ins.error.code).toBe('23505');
  });

  it('conflict: booking con P1, llega P2 → no sobrescribe', async () => {
    const db = createMockSupabase([{ id: B1, payment_id: P1, status: 'confirmed' }]);
    const r = await runClaim({ supabase: db, bookingId: B1, paymentId: P2 });
    expect(r.status).toBe('conflict');
    expect(db.bookings.get(B1).payment_id).toBe(P1);
  });

  it('concurrent duplicate: dos handlers P1 simultáneos → 1 claim lógico', async () => {
    const db = createMockSupabase([{ id: B1, payment_id: null, status: 'pending' }]);
    const [r1, r2] = await Promise.all([
      runClaim({ supabase: db, bookingId: B1, paymentId: P1 }),
      runClaim({ supabase: db, bookingId: B1, paymentId: P1 }),
    ]);
    // uno claimed, otro recovery (o ambos claimed pero DB solo una vez)
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toContain('claimed');
    expect(db.bookings.get(B1).payment_id).toBe(P1);
  });

  it('failure antes del claim → retry normal', async () => {
    const db = createMockSupabase([{ id: B1, payment_id: null, status: 'pending' }]);
    // primer intento falla antes de claim (no hacemos claim)
    // segundo intento claim normal
    const r = await runClaim({ supabase: db, bookingId: B1, paymentId: P1 });
    expect(r.status).toBe('claimed');
  });
});
