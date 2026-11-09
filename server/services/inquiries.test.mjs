// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  SERVICE_INQUIRY_ORIGIN,
  buildInquiryNotification,
  createInquiryRateLimiter,
  createServicesInquiryHandler,
  serviceInquirySchema,
} from './inquiries.mjs';

const INQUIRY_ID = '4f6f0a8e-7d1a-4a32-9d0e-6a1b2c3d4e5f';
const EXISTING_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const validPayload = {
  contactName: 'Camila Rojas',
  companyName: 'Comercial Andes SpA',
  email: 'camila@andes.cl',
  phone: '+56 9 1234 5678',
  serviceCategory: 'contratos',
  description: 'Necesitamos revisar un contrato de servicios antes de firmarlo con un cliente.',
  privacyAccepted: true,
};

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
  };
}

function supabaseMock({ data = { id: INQUIRY_ID, created_at: '2026-11-08T12:00:00.000Z' }, error = null, existing = null } = {}) {
  const client = {
    lastInsert: null,
    from(table) {
      expect(table).toBe('service_inquiries');
      return {
        insert(record) {
          client.lastInsert = record;
          return {
            select() {
              return {
                single: async () => ({ data: error ? null : data, error }),
              };
            },
          };
        },
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: existing, error: null }),
              };
            },
          };
        },
      };
    },
  };
  return client;
}

function makeHandler({ supabase = supabaseMock(), resend = null, notifyEmail = 'contacto@legalup.cl', logger = { error: vi.fn(), warn: vi.fn() } } = {}) {
  const handler = createServicesInquiryHandler({
    supabase,
    resend,
    notifyEmail,
    logger,
    now: () => new Date('2026-11-08T12:00:00.000Z'),
  });
  return { handler, supabase, logger };
}

describe('schema de solicitudes de servicios', () => {
  it('acepta una solicitud válida y normaliza espacios', () => {
    const parsed = serviceInquirySchema.parse({
      ...validPayload,
      contactName: '  Camila Rojas  ',
      phone: '',
    });
    expect(parsed.contactName).toBe('Camila Rojas');
    expect(parsed.phone).toBe('');
  });

  it.each([
    ['sin privacidad', { privacyAccepted: false }],
    ['descripción corta', { description: 'Muy corta' }],
    ['categoría inválida', { serviceCategory: 'penal' }],
    ['email inválido', { email: 'no-es-email' }],
    ['nombre con salto de línea', { companyName: 'Andes\r\nBcc: atacante@example.test' }],
  ])('rechaza %s', (_label, patch) => {
    expect(serviceInquirySchema.safeParse({ ...validPayload, ...patch }).success).toBe(false);
  });
});

describe('POST /api/services/inquiries', () => {
  it('persiste la solicitud normalizada y devuelve una referencia', async () => {
    const { handler, supabase } = makeHandler();
    const res = response();

    await handler(
      {
        body: {
          ...validPayload,
          email: 'CAMILA@ANDES.CL',
          phone: '',
          website: '',
          idempotencyKey: 'b8e3a6c4-2f1d-4a9b-8c7e-5d6f4a3b2c1d',
        },
      },
      res,
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      success: true,
      id: INQUIRY_ID,
      reference: '4F6F0A8E',
    });
    expect(supabase.lastInsert).toMatchObject({
      contact_name: 'Camila Rojas',
      company_name: 'Comercial Andes SpA',
      email: 'camila@andes.cl',
      phone: null,
      service_category: 'contratos',
      status: 'nueva',
      origin: SERVICE_INQUIRY_ORIGIN,
      privacy_accepted_at: '2026-11-08T12:00:00.000Z',
      idempotency_key: 'b8e3a6c4-2f1d-4a9b-8c7e-5d6f4a3b2c1d',
    });
  });

  it('rechaza datos inválidos sin tocar la base', async () => {
    const insert = vi.fn();
    const handler = createServicesInquiryHandler({
      supabase: { from: () => ({ insert }) },
      logger: { error: vi.fn(), warn: vi.fn() },
    });
    const res = response();

    await handler({ body: { ...validPayload, privacyAccepted: false } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.fields.privacyAccepted).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });

  it('descarta envíos que completan el honeypot', async () => {
    const { handler, supabase } = makeHandler();
    const res = response();

    await handler({ body: { ...validPayload, website: 'https://spam.example' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_REQUEST');
    expect(supabase.lastInsert).toBeNull();
  });

  it('es idempotente ante un reintento con la misma clave', async () => {
    const { handler } = makeHandler({
      supabase: supabaseMock({
        error: { code: '23505', message: 'duplicate key value' },
        existing: { id: EXISTING_ID, created_at: '2026-11-08T11:00:00.000Z' },
      }),
    });
    const res = response();

    await handler(
      {
        body: {
          ...validPayload,
          idempotencyKey: 'b8e3a6c4-2f1d-4a9b-8c7e-5d6f4a3b2c1d',
        },
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, id: EXISTING_ID, duplicate: true });
  });

  it('devuelve error controlado si falla la persistencia', async () => {
    const { handler, logger } = makeHandler({
      supabase: supabaseMock({ error: { code: '08006', message: 'connection failure' } }),
    });
    const res = response();

    await handler({ body: validPayload }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe('PERSISTENCE_ERROR');
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('no falla la solicitud si el aviso interno por email falla', async () => {
    const resend = { emails: { send: vi.fn().mockRejectedValue(new Error('smtp down')) } };
    const { handler, logger } = makeHandler({ resend });
    const res = response();

    await handler({ body: validPayload }, res);

    expect(res.statusCode).toBe(201);
    expect(resend.emails.send).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('envía el aviso al correo operativo con reply-to del solicitante', async () => {
    const resend = { emails: { send: vi.fn().mockResolvedValue({ data: { id: 'mail' } }) } };
    const { handler } = makeHandler({ resend, notifyEmail: 'servicios@legalup.cl' });
    const res = response();

    await handler({ body: validPayload }, res);

    expect(res.statusCode).toBe(201);
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'servicios@legalup.cl',
        replyTo: 'camila@andes.cl',
        subject: expect.stringContaining('Comercial Andes SpA'),
      }),
    );
  });
});

describe('plantilla de aviso interno', () => {
  it('escapa HTML del contenido enviado por el usuario', () => {
    const notification = buildInquiryNotification({
      record: {
        ...validPayload,
        company_name: '<script>alert(1)</script>',
        description: 'Descripción con <b>etiquetas</b> y & símbolos.',
      },
      id: INQUIRY_ID,
      createdAt: new Date('2026-11-08T12:00:00.000Z'),
    });

    expect(notification.html).not.toContain('<script>');
    expect(notification.html).toContain('&lt;script&gt;');
    expect(notification.text).toContain('<script>alert(1)</script>');
  });
});

describe('rate limit en memoria', () => {
  it('bloquea la sexta solicitud de una misma IP', () => {
    const limiter = createInquiryRateLimiter({ limit: 2, windowMs: 60_000, now: () => 1_000 });
    const req = { ip: '203.0.113.10', socket: {} };
    const next = vi.fn();

    limiter(req, response(), next);
    limiter(req, response(), next);
    const blocked = response();
    limiter(req, blocked, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['Retry-After']).toBe('60');
  });

  it('no bloquea a otra IP', () => {
    const limiter = createInquiryRateLimiter({ limit: 1, windowMs: 60_000, now: () => 1_000 });
    const next = vi.fn();
    limiter({ ip: '203.0.113.10', socket: {} }, response(), next);
    limiter({ ip: '203.0.113.11', socket: {} }, response(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
