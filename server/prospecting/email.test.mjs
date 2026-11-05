// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  CTA,
  buildLegalUpProUrl,
  buildSubject,
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  renderProspectEmail,
  verifyUnsubscribeToken,
} from './email.mjs';

const settings = {
  app_url: 'https://legalup.cl/pro',
  sender_name: 'Juan Guajardo | LegalUp',
  sender_email: 'juan@legalup.cl',
};

describe('prospecting email', () => {
  it('crea y verifica token de baja sin filtrar el id en claro', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const token = createUnsubscribeToken(id, 'secret');
    expect(token.startsWith(`${id}.`)).toBe(true);
    expect(verifyUnsubscribeToken(token, 'secret')).toBe(id);
  });

  it('rechaza token manipulado o con otro secreto', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    const token = createUnsubscribeToken(id, 'secret');
    expect(verifyUnsubscribeToken(token, 'other')).toBe(null);
    expect(verifyUnsubscribeToken(`${id}.firma`, 'secret')).toBe(null);
    expect(verifyUnsubscribeToken('no-es-token', 'secret')).toBe(null);
  });

  it('genera URL de baja y URL de campaña con UTM', () => {
    const token = createUnsubscribeToken('123e4567-e89b-42d3-a456-426614174000', 'secret');
    expect(buildUnsubscribeUrl({ appUrl: settings.app_url, token }))
      .toBe(`https://legalup.cl/api/prospecting/unsubscribe?token=${encodeURIComponent(token)}`);
    const url = new URL(buildLegalUpProUrl(settings, '123e4567-e89b-42d3-a456-426614174000'));
    expect(url.origin).toBe('https://legalup.cl');
    expect(url.pathname).toBe('/pro');
    expect(url.searchParams.get('utm_source')).toBe('prospecting');
    expect(url.searchParams.get('utm_campaign')).toBe('prospecting_daily');
  });

  it('arma asunto personalizado sin inventar datos', () => {
    expect(buildSubject({ contact_name: 'María José Pérez', firm_name: 'Pérez & Asociados' }))
      .toBe('María, una idea para Pérez & Asociados');
    expect(buildSubject({ firm_name: 'Pérez & Asociados' }))
      .toBe('Una idea para Pérez & Asociados');
  });

  it('renderiza HTML y texto con CTA exacto, firma y baja', () => {
    const rendered = renderProspectEmail({
      prospect: {
        id: '123e4567-e89b-42d3-a456-426614174000',
        contact_name: 'María José Pérez',
        firm_name: 'Pérez & Asociados',
        city: 'Santiago',
        specialties: ['Derecho laboral'],
        website: 'https://perez.cl',
      },
      settings,
      unsubscribeUrl: 'https://legalup.cl/api/prospecting/unsubscribe?token=t',
      legalUpProUrl: 'https://legalup.cl/pro?utm_source=prospecting',
    });
    expect(rendered.subject).toContain('María');
    expect(rendered.html).toContain(CTA);
    expect(rendered.text).toContain(CTA);
    expect(rendered.html).toContain('https://legalup.cl/pro?utm_source=prospecting');
    expect(rendered.html).toContain('juan@legalup.cl');
    expect(rendered.html).toContain('perez.cl');
    expect(rendered.html).toContain('darte de baja');
    expect(rendered.html).not.toContain('<script');
  });

  it('escapa HTML de datos externos', () => {
    const rendered = renderProspectEmail({
      prospect: { id: '123e4567-e89b-42d3-a456-426614174000', firm_name: '<script>alert(1)</script>', contact_name: 'Juan <b>Pérez</b>' },
      settings,
      unsubscribeUrl: 'https://legalup.cl/u',
      legalUpProUrl: 'https://legalup.cl/pro',
    });
    expect(rendered.html).not.toContain('<script>alert(1)</script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });
});
