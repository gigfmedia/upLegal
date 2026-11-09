import { z } from 'zod';

export const SERVICE_INQUIRY_ORIGIN = 'services_landing';

export const SERVICE_CATEGORY_SLUGS = [
  'contratos',
  'cobranza',
  'documentacion-laboral',
];

export const SERVICE_CATEGORY_LABELS = {
  contratos: 'Contratos',
  cobranza: 'Cobranza',
  'documentacion-laboral': 'Documentación laboral',
};

export const SERVICE_INQUIRY_LIMITS = {
  contactName: 120,
  companyName: 160,
  email: 254,
  phone: 40,
  description: 5000,
};

const requiredString = (field, min, max) =>
  z
    .string({ required_error: `Completa ${field}.`, invalid_type_error: `Completa ${field}.` })
    .trim()
    .min(min, `Completa ${field}.`)
    .max(max, `${field} es demasiado largo.`);

export const serviceInquirySchema = z.object({
  contactName: requiredString('tu nombre', 2, SERVICE_INQUIRY_LIMITS.contactName).refine(
    (value) => !/[\r\n]/.test(value),
    'El nombre contiene caracteres no permitidos.',
  ),
  companyName: requiredString('el nombre de tu empresa', 2, SERVICE_INQUIRY_LIMITS.companyName).refine(
    (value) => !/[\r\n]/.test(value),
    'El nombre de la empresa contiene caracteres no permitidos.',
  ),
  email: z
    .string({ required_error: 'Ingresa tu email.', invalid_type_error: 'Ingresa tu email.' })
    .trim()
    .email('Ingresa un email válido.')
    .max(SERVICE_INQUIRY_LIMITS.email, 'El email es demasiado largo.'),
  phone: z
    .string()
    .trim()
    .max(SERVICE_INQUIRY_LIMITS.phone, 'El teléfono es demasiado largo.')
    .optional()
    .nullable(),
  serviceCategory: z.enum(SERVICE_CATEGORY_SLUGS, {
    errorMap: () => ({ message: 'Selecciona un servicio.' }),
  }),
  description: z
    .string({ required_error: 'Cuéntanos qué necesitas.', invalid_type_error: 'Cuéntanos qué necesitas.' })
    .trim()
    .min(20, 'Cuéntanos un poco más (mínimo 20 caracteres).')
    .max(SERVICE_INQUIRY_LIMITS.description, 'La descripción es demasiado larga.'),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad.' }),
  }),
  idempotencyKey: z.string().uuid('El identificador de envío no es válido.').optional().nullable(),
  // Campo invisible anti-bots. Un humano nunca lo completa.
  website: z.string().optional().nullable(),
});

function fieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function referenceFor(id) {
  return String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildInquiryNotification({ record, id, createdAt = new Date() }) {
  const company = record.company_name;
  const category = SERVICE_CATEGORY_LABELS[record.service_category] || record.service_category;
  const reference = referenceFor(id);
  const receivedAt = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(createdAt);

  const subject = `[LegalUp Services] Nueva solicitud · ${company} · ${category}`;

  const text = [
    'Nueva solicitud desde legalup.cl/services',
    '',
    `Referencia: ${reference}`,
    `Empresa: ${company}`,
    `Contacto: ${record.contact_name}`,
    `Email: ${record.email}`,
    `Teléfono: ${record.phone || 'No informado'}`,
    `Servicio: ${category}`,
    `Recibida: ${receivedAt}`,
    '',
    'Descripción:',
    record.description,
    '',
    'Privacidad aceptada en el formulario.',
  ].join('\n');

  const html = `
    <div style="margin:0;padding:24px;background:#f4f6f5;font-family:Inter,Arial,sans-serif;color:#101820;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#14532d;color:#ffffff;padding:20px 24px;">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;">LegalUp Services</div>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">Nueva solicitud de servicio</h1>
          <div style="margin-top:6px;font-size:13px;opacity:.8;">Referencia ${escapeHtml(reference)}</div>
        </div>
        <div style="padding:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;">Empresa</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(company)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Contacto</td><td style="padding:6px 0;">${escapeHtml(record.contact_name)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(record.email)}" style="color:#15803d;">${escapeHtml(record.email)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Teléfono</td><td style="padding:6px 0;">${escapeHtml(record.phone || 'No informado')}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Servicio</td><td style="padding:6px 0;">${escapeHtml(category)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Recibida</td><td style="padding:6px 0;">${escapeHtml(receivedAt)}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#f9fafb;border:1px solid #eef0ef;border-radius:12px;">
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:8px;">Descripción</div>
            <div style="font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(record.description)}</div>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#6b7280;">Privacidad aceptada en el formulario. Responde a este correo para contactar a la empresa.</p>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export function createServicesInquiryHandler({
  supabase,
  resend,
  notifyEmail = 'contacto@legalup.cl',
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!supabase) throw new Error('createServicesInquiryHandler requiere un cliente Supabase');

  return async function handleServicesInquiry(req, res) {
    const parsed = serviceInquirySchema.safeParse(req.body || {});

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Revisa los datos del formulario.',
        code: 'VALIDATION_ERROR',
        fields: fieldErrors(parsed.error),
      });
    }

    const payload = parsed.data;

    if (payload.website) {
      return res.status(400).json({
        error: 'No pudimos procesar la solicitud.',
        code: 'INVALID_REQUEST',
      });
    }

    const receivedAt = now();
    const record = {
      contact_name: payload.contactName,
      company_name: payload.companyName,
      email: payload.email.toLowerCase(),
      phone: payload.phone?.trim() || null,
      service_category: payload.serviceCategory,
      description: payload.description,
      status: 'nueva',
      origin: SERVICE_INQUIRY_ORIGIN,
      privacy_accepted_at: receivedAt.toISOString(),
      idempotency_key: payload.idempotencyKey || null,
    };

    const { data, error } = await supabase
      .from('service_inquiries')
      .insert(record)
      .select('id, created_at')
      .single();

    if (error) {
      if (error.code === '23505' && record.idempotency_key) {
        const { data: existing } = await supabase
          .from('service_inquiries')
          .select('id, created_at')
          .eq('idempotency_key', record.idempotency_key)
          .maybeSingle();

        if (existing) {
          return res.status(200).json({
            success: true,
            id: existing.id,
            reference: referenceFor(existing.id),
            duplicate: true,
          });
        }
      }

      logger.error('[LegalUp Services] No se pudo guardar la solicitud', {
        code: error.code,
        message: error.message,
      });

      return res.status(500).json({
        error: 'No pudimos registrar tu solicitud. Intenta nuevamente.',
        code: 'PERSISTENCE_ERROR',
      });
    }

    if (resend && notifyEmail) {
      try {
        const notification = buildInquiryNotification({
          record,
          id: data.id,
          createdAt: data.created_at ? new Date(data.created_at) : receivedAt,
        });

        await resend.emails.send({
          from: 'LegalUp Services <hola@mg.legalup.cl>',
          to: notifyEmail,
          replyTo: record.email,
          subject: notification.subject,
          text: notification.text,
          html: notification.html,
        });
      } catch (mailError) {
        logger.warn('[LegalUp Services] La solicitud se guardó, pero el aviso interno falló', {
          message: mailError?.message || String(mailError),
        });
      }
    }

    return res.status(201).json({
      success: true,
      id: data.id,
      reference: referenceFor(data.id),
    });
  };
}

/**
 * Rate limit en memoria por IP. Es deliberadamente simple: protege la landing
 * de ráfagas accidentales o bots triviales sin añadir infraestructura.
 */
export function createInquiryRateLimiter({
  limit = 5,
  windowMs = 10 * 60 * 1000,
  now = Date.now,
  maxBuckets = 5000,
} = {}) {
  const buckets = new Map();

  return function servicesInquiryRateLimit(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const current = now();

    if (buckets.size > maxBuckets) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= current) buckets.delete(bucketKey);
      }
    }

    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= current) {
      buckets.set(key, { count: 1, resetAt: current + windowMs });
      return next();
    }

    if (bucket.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - current) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Recibimos varias solicitudes desde esta conexión. Intenta nuevamente en unos minutos.',
        code: 'RATE_LIMITED',
      });
    }

    bucket.count += 1;
    return next();
  };
}
