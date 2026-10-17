// @vitest-environment node
// R1: la persistencia real de payment_events.success no debe silenciarse como
// éxito. Este harness ejecuta el CODIGO REAL del handler del webhook y de
// sendEmailIdempotent extraidos de server.mjs (patron vm-harness del repo),
// con Supabase/Resend/MP/PostHog simulados en memoria: sin credenciales ni red.
import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { createNotificationService } from './notifications/service.mjs';

const source = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('server.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

const webhookRoute = ast.statements.find(
  (node) =>
    ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) &&
    node.expression.arguments[0]?.text === '/api/mercadopago/webhook'
);
const sendEmailIdempotentDecl = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'sendEmailIdempotent'
);
if (!webhookRoute || !sendEmailIdempotentDecl) {
  throw new Error('No se encontró el handler real del webhook o sendEmailIdempotent en server.mjs');
}

const BID = 'b0000000-0000-4000-8000-000000000001';
const LID = 'l0000000-0000-4000-8000-000000000001';
const PID = '1000200300';
const SECRET = 'whs_test_r1';
const MEET_LINK = 'https://meet.google.com/lawyer-fixed-link';

function baseBooking() {
  return {
    id: BID,
    lawyer_id: LID,
    user_id: null,
    user_email: 'client@test.invalid',
    user_name: 'Test Client',
    price: 45000,
    status: 'pending',
    payment_id: null,
    payment_status: null,
    scheduled_date: '2030-02-01',
    scheduled_time: '10:00',
    duration: 60,
    requires_meeting: true,
    booking_type: 'appointment',
    service_id: null,
    pricing_snapshot: { base_amount: 41000, client_surcharge: 4000, platform_fee: 8200, lawyer_amount: 32800 },
    metadata: {},
    posthog_distinct_id: 'ph_test',
    meet_link: null,
  };
}

function mpPayment() {
  return {
    id: PID,
    status: 'approved',
    status_detail: 'accredited',
    transaction_amount: 45000,
    currency_id: 'CLP',
    external_reference: BID,
    date_created: '2026-10-17T10:00:00Z',
  };
}

// Mock Supabase fiel a las restricciones reales (índices únicos parcial + global)
function createDb({ seedBookings = null, runningPaymentEvents = [] } = {}) {
  const state = {
    bookings: new Map(),
    payments: [],
    payment_events: [...runningPaymentEvents],
    appointments: [],
    profiles: [],
    notifications: [],
    notification_deliveries: [],
    counters: { paymentsInsert: 0, paymentEventsInsert: 0, confirmUpdates: 0, createUser: 0 },
    calls: { mp: [], posthog: [], emails: [], ga4: [] },
    config: { eventsInsertFailure: null },
  };
  if (seedBookings) state.bookings.set(seedBookings.id, { ...seedBookings });
  state.profiles.push({
    id: 'profile_lawyer',
    user_id: LID,
    display_name: 'Test Lawyer',
    meet_link: MEET_LINK,
    email: 'lawyer@test.invalid',
  });

  const conflict = (constraint) => ({
    code: '23505',
    message: `duplicate key value violates unique constraint "${constraint}"`,
  });

  function matches(table, conds) {
    const rows = table === 'profiles' ? state.profiles : [];
    return rows.filter((row) =>
      conds.every((c) => c.kind !== 'eq' || row[c.k] === c.v)
    );
  }

  function from(table) {
    let action = null;
    let payload = null;
    let cols = null;
    const conds = [];
    const b = {
      select(c) { cols = c; return b; },
      eq(k, v) { conds.push({ kind: 'eq', k, v }); return b; },
      is(k, v) { conds.push({ kind: 'is', k, v }); return b; },
      in(k, v) { conds.push({ kind: 'in', k, v }); return b; },
      order() { return b; },
      limit() { return b; },
      filter(k, op, v) { conds.push({ kind: 'filter', k, op, v }); return b; },
      update(p) { action = 'update'; payload = p; return b; },
      insert(p) { action = 'insert'; payload = p; return b; },
      dispatch() {
        if (table === 'bookings') {
          if (action === 'insert') {
            state.bookings.set(payload.id, { ...payload });
            return { data: { ...state.bookings.get(payload.id) }, error: null };
          }
          if (action === 'update') {
            const row = state.bookings.get(conds.find((c) => c.kind === 'eq' && c.k === 'id')?.v);
            const wasClaim = conds.some((c) => c.kind === 'is' && c.k === 'payment_id');
            if (action === 'update' && cols !== null && wasClaim) {
              if (!row) return { data: null, error: null };
              if (row.payment_id !== null && row.payment_id !== undefined) return { data: null, error: null };
              Object.assign(row, payload);
              return { data: { ...row }, error: null };
            }
            if (cols !== null) {
              if (!row) return { data: null, error: null };
              if (payload.status === 'confirmed') state.counters.confirmUpdates += 1;
              Object.assign(row, payload);
              return { data: { ...row }, error: null };
            }
            if (row) Object.assign(row, payload);
            return { data: null, error: null };
          }
          const id = conds.find((c) => c.kind === 'eq' && c.k === 'id')?.v;
          const row = state.bookings.get(id);
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === 'payments') {
          if (action === 'insert') {
            state.counters.paymentsInsert += 1;
            if (payload.booking_id && state.payments.some((p) => p.booking_id === payload.booking_id)) {
              return { error: conflict('uniq_payments_booking_id') };
            }
            state.payments.push({ ...payload, id: payload.id || `payrow_${state.payments.length}` });
            return { error: null };
          }
          const byBooking = conds.find((c) => c.kind === 'eq' && c.k === 'booking_id')?.v;
          const row = state.payments.find((p) => p.booking_id === byBooking) || null;
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === 'payment_events') {
          if (action === 'insert') {
            state.counters.paymentEventsInsert += 1;
            if (state.config.eventsInsertFailure) return { error: { ...state.config.eventsInsertFailure } };
            if (
              payload.event_type === 'success' &&
              payload.payment_id &&
              state.payment_events.some(
                (e) => e.event_type === 'success' && e.payment_id === payload.payment_id
              )
            ) {
              return { error: conflict('payment_events_success_payment_once') };
            }
            state.payment_events.push({ ...payload, id: `pe_${state.payment_events.length}` });
            return { error: null };
          }
          const pyid = conds.find((c) => c.kind === 'filter' && c.k === 'metadata->>payment_id')?.v;
          const etype = conds.find((c) => c.kind === 'eq' && c.k === 'event_type')?.v;
          const row =
            state.payment_events.find(
              (e) => e.event_type === etype && e.metadata && e.metadata['payment_id'] === pyid
            ) || null;
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === 'appointments') {
          if (action === 'insert') {
            const row = { ...payload, id: `appt_${state.appointments.length}` };
            state.appointments.push(row);
            return { data: { id: row.id }, error: null };
          }
          if (action === 'update') {
            const row = state.appointments.find((a) => a.id === conds.find((c) => c.kind === 'eq' && c.k === 'id')?.v);
            if (row) Object.assign(row, payload);
            return { error: null };
          }
          const byId = conds.find((c) => c.kind === 'eq' && c.k === 'id');
          const row = byId
            ? state.appointments.find((a) => a.id === byId.v)
            : state.appointments.find((a) =>
                conds.every((c) => c.kind !== 'eq' || a[c.k] === c.v)
              );
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === 'profiles') {
          if (action === 'insert') {
            state.profiles.push({ id: payload.id, user_id: payload.user_id || payload.id, ...payload });
            return { error: null };
          }
          if (action === 'update') {
            matches(table, conds).forEach((row) => Object.assign(row, payload));
            return { error: null };
          }
          const row = matches(table, conds)[0] || null;
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === 'notifications') {
          if (action === 'insert') {
            if (payload.event_id && state.notifications.some((n) => n.event_id === payload.event_id)) {
              return { error: conflict('notifications_event_id_unique') };
            }
            state.notifications.push({ ...payload });
            return { error: null };
          }
          return { data: null, error: null };
        }
        if (table === 'notification_deliveries') {
          if (action === 'insert') {
            const exists = state.notification_deliveries.some(
              (d) =>
                d.business_event_id === payload.business_event_id &&
                d.notification_type === payload.notification_type &&
                d.recipient === payload.recipient
            );
            if (exists) return { error: conflict('notification_deliveries_business_event_id_notification_type_key') };
            state.notification_deliveries.push({ ...payload });
            return { error: null };
          }
          if (action === 'update') {
            state.notification_deliveries
              .filter((d) =>
                conds.every((c) => c.kind !== 'eq' || d[c.k] === c.v)
              )
              .forEach((d) => Object.assign(d, payload));
            return { data: null, error: null };
          }
          const row = state.notification_deliveries.find((d) =>
            conds.every((c) => c.kind !== 'eq' || d[c.k] === c.v)
          );
          return { data: row ? { ...row } : null, error: null };
        }
        if (table === 'platform_settings') return { data: null, error: null };
        return { data: null, error: null };
      },
      single() { return Promise.resolve(b.dispatch()); },
      maybeSingle() { return Promise.resolve(b.dispatch()); },
      then(onFul, onRej) { return Promise.resolve(b.dispatch()).then(onFul, onRej); },
    };
    return b;
  }

  const supabase = {
    from,
    rpc: async () => ({ error: null }),
    functions: { invoke: async () => ({ data: { meetLink: 'https://meet.google.com/edge-fn', source: 'jitsi' }, error: null }) },
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: LID, email: 'lawyer@test.invalid', user_metadata: { full_name: 'Test Lawyer' } } },
          error: null,
        }),
        createUser: async () => {
          state.counters.createUser += 1;
          return { data: { user: { id: 'U1' } }, error: null };
        },
        generateLink: async () => ({
          data: { properties: { action_link: 'https://magic.test/link' }, user: { id: 'U1' } },
          error: null,
        }),
      },
    },
  };
  return { state, supabase };
}

function buildHarness({ db }) {
  const { state, supabase } = db;
  const logs = [];
  const sandboxConsole = {
    log: (...a) => logs.push(['log', ...a]),
    error: (...a) => logs.push(['error', ...a]),
    warn: (...a) => logs.push(['warn', ...a]),
  };
  const fetchMock = async (url, opts = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.mercadopago.com/v1/payments/')) {
      state.calls.mp.push(u);
      return { ok: true, status: 200, json: async () => mpPayment() };
    }
    if (u.includes('posthog.com/capture')) {
      state.calls.posthog.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({}) };
    }
    throw new Error(`fetch inesperado: ${u}`);
  };
  let handler = null;
  vm.runInNewContext(
    sendEmailIdempotentDecl.getText(ast) + '\n' + webhookRoute.getText(ast),
    {
      app: { post: (_p, h) => { handler = h; } },
      supabase,
      console: sandboxConsole,
      process: { env: { MERCADOPAGO_WEBHOOK_SECRET: SECRET, POSTHOG_PROJECT_API_KEY: 'phk_test' } },
      crypto,
      Buffer,
      fetch: fetchMock,
      notificationsService: createNotificationService(supabase),
      sendGA4PurchaseEvent: async (p) => { state.calls.ga4.push(p); },
      isOwnerEmail: (email) => ['owner@test.invalid'].includes(String(email || '').toLowerCase()),
      OWNER_EMAILS: new Set(['owner@test.invalid']),
      appUrl: 'https://legalup.test',
      mercadopagoAccessToken: 'APP-US-9999999999999-99999999999',
      resend: {
        emails: {
          send: async (msg) => {
            state.calls.emails.push(msg.to);
            return { id: `email_${state.calls.emails.length}` };
          },
        },
      },
      handlePreapprovalWebhook: async () => {},
      handleAuthorizedPayment: async () => {},
    }
  );
  if (!handler) throw new Error('el handler real del webhook no se capturó');

  const deliver = async () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const requestId = 'req_test_r1';
    const manifest = `id:${PID};request-id:${requestId};ts:${ts};`;
    const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
    const res = {
      statusCode: null,
      body: null,
      status(n) { this.statusCode = n; return this; },
      send(v) { this.body = v; return this; },
      json(v) { this.body = v; return this; },
    };
    await handler(
      {
        body: { type: 'payment', data: { id: PID } },
        query: { 'data.id': PID },
        headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
      },
      res
    );
    return res;
  };
  return { deliver, state, logs };
}

describe('R1 — payment_events.success: el handler REAL del webhook', () => {
  it('flujo normal: 200, payments + payment_events.success + booking confirmed, sin duplicados', async () => {
    const h = buildHarness({ db: createDb({ seedBookings: baseBooking() }) });
    const res = await h.deliver();
    expect(res.statusCode).toBe(200);
    expect(h.state.bookings.get(BID)).toMatchObject({
      status: 'confirmed',
      payment_id: PID,
      payment_status: 'approved',
      meet_link: MEET_LINK,
    });
    expect(h.state.payments).toHaveLength(1);
    const pay = h.state.payments[0];
    expect(pay.booking_id).toBe(BID);
    expect(pay.metadata.provider_payment_id).toBe(PID);
    expect(pay.status).toBe('succeeded');
    expect(pay.platform_fee + pay.lawyer_amount).toBe(pay.amount);
    expect(h.state.payment_events.filter((e) => e.event_type === 'success')).toHaveLength(1);
    const success = h.state.payment_events.find((e) => e.event_type === 'success');
    expect(success.payment_id).toBe(PID);
    expect(success.metadata.booking_id).toBe(BID);
    expect(h.state.counters.paymentsInsert).toBe(1);
    expect(h.state.counters.paymentEventsInsert).toBe(1);
    expect(h.state.counters.confirmUpdates).toBe(1);
    expect(h.state.counters.createUser).toBe(1);
    expect(h.state.calls.posthog).toHaveLength(1);
    expect(h.state.calls.posthog[0].event).toBe('booking_paid');
    expect(h.state.calls.appointments).toBeUndefined();
    expect(h.state.appointments).toHaveLength(1);
    expect(h.state.calls.emails).toHaveLength(3);
    expect(h.state.notification_deliveries.filter((d) => d.status === 'sent')).toHaveLength(3);
    // 1 sola entrega del proveedor
    expect(h.state.calls.mp).toHaveLength(1);
  });

  it('conflicto de idempotencia reconocido (23505 payment_events_success_payment_once) es benigno: 200 y sin duplicar nada', async () => {
    const h = buildHarness({ db: createDb({ seedBookings: baseBooking() }) });
    expect((await h.deliver()).statusCode).toBe(200);
    const before = {
      payments: h.state.payments.length,
      emails: h.state.calls.emails.length,
      posthog: h.state.calls.posthog.length,
      eventsInsert: h.state.counters.paymentEventsInsert,
      notifies: h.state.notifications.length,
    };
    const res2 = await h.deliver();
    expect(res2.statusCode).toBe(200);
    expect(h.state.payments.length).toBe(before.payments);
    expect(h.state.counters.paymentsInsert).toBe(1); // el segundo intento no inserta de nuevo
    expect(h.state.counters.paymentEventsInsert).toBe(2); // se reintenta el insert y topa con el índice
    expect(h.state.calls.emails.length).toBe(before.emails);
    expect(h.state.calls.posthog.length).toBe(before.posthog); // alreadyComplete -> skip
    expect(h.state.notifications.length).toBe(before.notifies);
    expect(h.state.appointments.length).toBe(1);
    const filtered = h.logs.filter(
      (l) => l.some((s) => typeof s === 'string' && s.includes('already_exists'))
    );
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('un error real al insertar payment_events.success NO se silencia: respuesta 500', async () => {
    const db = createDb({ seedBookings: baseBooking() });
    db.state.config.eventsInsertFailure = { code: 'XX999', message: 'connection reset while writing payment_events' };
    const h = buildHarness({ db });
    const res = await h.deliver();
    expect(res.statusCode).toBe(500);
    // payments y confirmación sí ocurrieron antes del fallo (estado parcial)
    expect(h.state.payments).toHaveLength(1);
    expect(h.state.bookings.get(BID)).toMatchObject({ status: 'confirmed', payment_id: PID });
    // el success NO quedó persistido: la respuesta no es un falso 200
    expect(h.state.payment_events.filter((e) => e.event_type === 'success')).toHaveLength(0);
    // flow abortado: no había citas ni correos para ese intento
    expect(h.state.appointments).toHaveLength(0);
    expect(h.state.calls.emails).toHaveLength(0);
  });

  it('23505 por OTRA constraint tambien se propaga como error real (500)', async () => {
    const db = createDb({ seedBookings: baseBooking() });
    db.state.config.eventsInsertFailure = { code: '23505', message: 'duplicate key value violates unique constraint "payment_events_pkey"' };
    const h = buildHarness({ db });
    expect((await h.deliver()).statusCode).toBe(500);
  });

  it('reintento tras el fallo: recupera el pago ya reclamado y completa payment_events.success sin segunda fila payments ni segundo cobro', async () => {
    const db = createDb({ seedBookings: baseBooking() });
    db.state.config.eventsInsertFailure = { code: 'XX999', message: 'connection reset' };
    const h = buildHarness({ db });
    const first = await h.deliver();
    expect(first.statusCode).toBe(500);

    db.state.config.eventsInsertFailure = null;
    const second = await h.deliver();
    if (second.statusCode !== 200) {
      for (const entry of h.logs) {
        const err = entry[2];
        const detail =
          entry[0] === 'error' && err instanceof Error
            ? `${err.message} | stack=${(err.stack || '').split('\n').slice(0, 4).join(' >> ')}`
            : JSON.stringify(entry);
        process.stderr.write(`DBG_LOG ${detail}\n`);
      }
    }
    expect(second.statusCode).toBe(200);

    // persistencia completada
    const successes = h.state.payment_events.filter((e) => e.event_type === 'success');
    expect(successes).toHaveLength(1);
    expect(successes[0].payment_id).toBe(PID);
    expect(successes[0].metadata.booking_id).toBe(BID);

    // Sin segunda fila contable ni segundo cobro
    expect(h.state.payments).toHaveLength(1);
    expect(h.state.counters.paymentsInsert).toBe(1);
    expect(h.state.bookings.get(BID)).toMatchObject({ status: 'confirmed', payment_id: PID });
    // confirmacion no se repite
    expect(h.state.counters.confirmUpdates).toBe(1);
    // provider fetch: solo GET de lectura a MP, nunca una creacion de preferencia/cobro
    expect(h.state.calls.mp).toHaveLength(2);
    h.state.calls.mp.forEach((u) => expect(u).toBe(`https://api.mercadopago.com/v1/payments/${PID}`));
    expect(h.state.calls.mp.map((u) => u.includes('checkout/preferences'))).toEqual([false, false]);

    // eventos secundarios idempotentes en el reintento
    expect(h.state.counters.createUser).toBe(1);
    expect(h.state.appointments).toHaveLength(1);
    expect(h.state.notification_deliveries.filter((d) => d.status === 'sent')).toHaveLength(3);
    expect(h.state.calls.emails).toHaveLength(3);
    // deduplicación de notificaciones vía índice único (fidel al esquema real)
    expect(h.state.notifications).toHaveLength(1);
  });
});
