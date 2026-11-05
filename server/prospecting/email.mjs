import crypto from 'crypto';
import { firstNameFrom, normalizeContactName } from './validation.mjs';

const CTA = 'Me gustaría que lo probaras y me dieras tu opinión directa sobre qué aporta y qué habría que mejorar.';
const DEFAULT_APP_URL = 'https://legalup.cl/pro';

export function createUnsubscribeToken(prospectId, secret) {
  if (!prospectId || !secret) return null;
  const signature = crypto
    .createHmac('sha256', String(secret))
    .update(`unsubscribe:${prospectId}`)
    .digest('base64url');
  return `${prospectId}.${signature}`;
}

export function verifyUnsubscribeToken(token, secret) {
  if (!token || !secret) return null;
  const raw = String(token);
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const prospectId = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(prospectId)) {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', String(secret))
    .update(`unsubscribe:${prospectId}`)
    .digest('base64url');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return prospectId;
}

export function buildUnsubscribeUrl({ appUrl, token }) {
  let origin;
  try {
    origin = new URL(String(appUrl || DEFAULT_APP_URL)).origin;
  } catch {
    origin = new URL(DEFAULT_APP_URL).origin;
  }
  return `${origin}/api/prospecting/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildLegalUpProUrl(settings, prospectId) {
  const base = String(settings?.app_url || DEFAULT_APP_URL).trim() || DEFAULT_APP_URL;
  let url;
  try {
    url = new URL(base);
  } catch {
    url = new URL(DEFAULT_APP_URL);
  }
  url.searchParams.set('utm_source', 'prospecting');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', 'prospecting_daily');
  if (prospectId) url.searchParams.set('utm_content', String(prospectId).slice(0, 8));
  return url.toString();
}

export function buildSubject(prospect) {
  const first = firstNameFrom(prospect?.contact_name);
  const firm = truncate(String(prospect?.firm_name || '').trim(), 70);
  if (first) return truncate(`${first}, una idea para ${firm || 'tu práctica legal'}`, 120);
  return truncate(`Una idea para ${firm || 'tu práctica legal'}`, 120);
}

export function renderProspectEmail({ prospect, settings, unsubscribeUrl, legalUpProUrl }) {
  const firm = truncate(clean(prospect?.firm_name) || 'tu estudio', 160);
  const contact = normalizeContactName(prospect?.contact_name);
  const first = firstNameFrom(contact);
  const city = truncate(clean(prospect?.city), 80);
  const specialties = Array.isArray(prospect?.specialties)
    ? prospect.specialties.map((item) => clean(item)).filter(Boolean).slice(0, 2)
    : [];
  const sourceDomain = sourceDomainOf(prospect);
  const greeting = first ? `Hola ${first},` : 'Hola,';
  const context = buildContextLine({ firm, city, specialties, first });
  const link = legalUpProUrl || buildLegalUpProUrl(settings, prospect?.id);
  const subject = buildSubject(prospect);
  const reason = sourceDomain
    ? `Recibes este correo porque tu correo profesional aparece publicado en ${sourceDomain}.`
    : 'Recibes este correo porque tu contacto profesional aparece en información pública.';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#fafaf6;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;line-height:1.6;font-size:16px;">
    <div style="padding-bottom:20px;font-size:20px;font-weight:700;color:#111827;text-align:center;">
      <img src="https://legalup.cl/apple-touch-icon.png" alt="LegalUp" style="height:40px;width:40px;vertical-align:middle;border:0;" />
      <span style="color:#1a202c;font-size:22px;font-weight:800;vertical-align:middle;">LegalUp</span>
      <span style="font-size:10px;background:#85efab;color:#101820;padding:4px 6px;border-radius:4px;margin-left:4px;vertical-align:middle;">PRO</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
      <p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px;">${escapeHtml(context)}</p>
      <p style="margin:0 0 16px;">Si hoy llevas clientes, causas, agenda, tareas y documentos en distintos lugares, LegalUp Pro los reúne en un solo espacio de trabajo.</p>
      <p style="margin:0 0 16px;">Incluye gestión de solicitudes, clientes, casos, agenda e ingresos, con IA integrada en tus casos para análisis de documentos, chat del caso, investigación jurídica y redacción asistida.</p>
      <p style="margin:0 0 24px;">${escapeHtml(CTA)}</p>
      <p style="margin:0 0 28px;">
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#85efab;color:#1a202c;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:600;">Ver LegalUp Pro</a>
      </p>
      <p style="margin:0 0 4px;">Quedo atento a tu opinión.</p>
      <p style="margin:16px 0 0;">Juan Guajardo<br><span style="color:#1a202c;font-weight:600;">LegalUp Pro</span><br><a href="mailto:juan@legalup.cl" style="color:#374151;">juan@legalup.cl</a></p>
    </div>
    <div style="padding:20px 4px 0;font-size:12px;color:#6b7280;line-height:1.5;">
      <p style="margin:0 0 6px;text-align:center;">${escapeHtml(reason)}</p>
      <p style="text-align:center;">Gestiona tu práctica legal en Chile.<br />
          Todos los derechos reservados.
        </p>
      <p style="margin:0;text-align:center;">Si no quieres recibir más comunicaciones comerciales, puedes <a href="${escapeHtml(unsubscribeUrl)}" style="color:#374151;">darte de baja aquí</a>.</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    greeting,
    '',
    context,
    '',
    'Si hoy llevas clientes, causas, agenda, tareas y documentos en distintos lugares, LegalUp Pro los reúne en un solo espacio de trabajo.',
    '',
    'Incluye gestión de solicitudes, clientes, casos, agenda e ingresos, con IA integrada en tus casos para análisis de documentos, chat del caso, investigación jurídica y redacción asistida.',
    '',
    CTA,
    '',
    `Ver LegalUp Pro: ${link}`,
    '',
    'Quedo atento a tu opinión.',
    '',
    'Juan Guajardo',
    'LegalUp',
    'juan@legalup.cl',
    '',
    reason,
    'LegalUp, Santiago, Chile.',
    `Darte de baja: ${unsubscribeUrl}`,
  ].join('\n');

  return { subject, html, text };
}

function buildContextLine({ firm, city, specialties, first }) {
  const work = specialties.length > 0
    ? `tu trabajo en ${specialties.join(' y ')}`
    : 'tu trabajo como abogado/a';
  const place = city ? ` en ${city}` : '';
  if (firm && firm !== 'tu estudio') {
    return `Vi el sitio de ${firm} y ${work}${place}.`;
  }
  if (first) return `Vi tu perfil profesional y ${work}${place}.`;
  return `Vi ${work}${place}.`;
}

function sourceDomainOf(prospect) {
  const raw = prospect?.website || prospect?.source_url || '';
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { CTA };
