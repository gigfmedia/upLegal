import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('FASE 4.59C.6 — drafting A: implementado + habilitado en prod', () => {
  it('kill switch preservado (revisión separada si se apaga)', () => {
    const server = read('server.mjs');
    expect(server).toContain("process.env.AI_DRAFTING_ENABLED !== '1'");
    expect(server).toContain('AI_DRAFTING_DISABLED');
    expect(server).toContain('/api/ai/cases/:caseId/drafts');
  });
  it('kill switch default OFF bloquea generación (lectura/edición separadas)', () => {
    const server = read('server.mjs');
    expect(server).toContain("process.env.AI_DRAFTING_ENABLED !== '1'");
    expect(server).toContain('AI_DRAFTING_DISABLED');
    expect(server).toContain('/api/ai/cases/:caseId/drafts');
  });
  it('storage + metering reales existen (no marketing)', () => {
    expect(read('supabase/migrations/20261011000000_ai_case_drafts.sql')).toContain('CREATE TABLE');
    const server = read('server.mjs');
    expect(server).toContain("capability: 'case_drafting'");
  });
  it('marketing refleja disponibilidad (prod AI_DRAFTING_ENABLED=1)', () => {
    expect(read('src/pages/lawyer/CaseDetailPage.tsx')).toContain('Redacción asistida');
    const landing = read('src/pages/LegalUpAI.tsx');
    const idx = landing.indexOf('"Redacción jurídica"');
    expect(landing.slice(idx, idx + 300)).not.toContain('aiSoon');
    expect(landing.slice(idx, idx + 300)).toContain('Borradores basados en el caso');
  });
  it('planes con acceso: pago AI, no free', () => {
    const server = read('server.mjs');
    const idx = server.indexOf('DRAFTING_ALLOWED_PLANS');
    expect(server.slice(idx, idx + 120)).toContain("'essential'");
    expect(server.slice(idx, idx + 120)).not.toContain("'free'");
  });
});
