/**
 * FASE 1.7.1 — Auditoría del endpoint GET /api/admin/pro-kpis.
 * Assertions sobre la fuente (precedente: plusV1.test.mjs): autorización,
 * allowlist de columnas (sin PII en selects ni respuesta), validación de
 * fechas, reglas de negocio y ausencia de etiqueta MRR sin sustento.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const server = readFileSync(resolve(process.cwd(), 'server.mjs'), 'utf8');

function handlerBlock() {
  const start = server.indexOf("app.get('/api/admin/pro-kpis'");
  if (start === -1) throw new Error('ruta /api/admin/pro-kpis no encontrada');
  const end = server.indexOf('// GET /api/admin/chat-leads', start);
  return server.slice(start, end === -1 ? start + 12000 : end);
}

describe('1.7.1 pro-kpis — autorización', () => {
  it('la ruta exige requireAdmin antes del handler', () => {
    expect(server).toContain("app.get('/api/admin/pro-kpis', requireAdmin,");
  });

  it('no acepta rol del cliente: usa requireAdmin (app_metadata), no body/query', () => {
    const block = handlerBlock();
    expect(block).not.toContain('req.body.role');
    expect(block).not.toContain('req.query.role');
  });
});

describe('1.7.1 pro-kpis — validación de fechas', () => {
  it('rechaza 400 con from/to inválidos o rango invertido', () => {
    const block = handlerBlock();
    expect(block).toContain('from >= to');
    expect(block).toContain("status(400).json({ error: 'Parámetros from/to (ISO) inválidos.' })");
  });
});

describe('1.7.1 pro-kpis — sin PII', () => {
  const FORBIDDEN_SELECTS = [
    'original_filename',
    'extracted_text',
    'file_path',
    'content',
    'summary',
    'metadata',
    'display_name',
    'first_name',
    'last_name',
  ];

  it('ningún select pide contenido, nombres, títulos o archivos', () => {
    const block = handlerBlock();
    for (const col of FORBIDDEN_SELECTS) {
      expect(block).not.toContain(col);
    }
  });

  it('la respuesta expone solo agregados (sin ids, emails ni enums por fila)', () => {
    const block = handlerBlock();
    expect(block).toContain('kpi_new_lawyers_by_week');
    expect(block).toContain('kpi_activation_7d');
    expect(block).toContain('kpi_management');
    expect(block).toContain('kpi_docs_ai');
    expect(block).toContain('kpi_retention');
    expect(block).toContain('kpi_pro_conversion');
    // El email solo se usa server-side para excluir pruebas; jamás viaja.
    const jsonStart = block.indexOf('res.json({');
    const jsonBlock = block.slice(jsonStart, jsonStart + 1500);
    expect(jsonBlock).not.toContain('email');
    expect(jsonBlock).not.toContain('lawyer_id');
  });

  it('errores de Supabase responden 500 genérico sin detalles', () => {
    const block = handlerBlock();
    expect(block).toContain("status(500).json({ error: 'No pudimos cargar los KPIs de Pro.' })");
  });
});

describe('1.7.1 pro-kpis — reglas de negocio', () => {
  it('excluye dueño y @test.invalid', () => {
    const block = handlerBlock();
    expect(block).toContain('isOwnerEmail');
    expect(block).toContain('@test.invalid');
  });

  it('cancelled vigente cuenta como activa; vencida no', () => {
    const block = handlerBlock();
    expect(block).toContain("s.status === 'cancelled' && end !== null && end > nowMs");
  });

  it('pago confirmado = ledger approved, por abogado', () => {
    const block = handlerBlock();
    expect(block).toContain("p.status === 'approved'");
  });

  it('ventana de retención cerrada a los 7d (sin día extra)', () => {
    const block = handlerBlock();
    expect(block).toContain('nowMs - m.at < 7 * DAY');
    expect(block).not.toContain('8 * DAY');
  });

  it('monto vigente etiquetado sin prometer MRR normalizado', () => {
    const block = handlerBlock();
    expect(block).toContain('active_amount_clp');
    expect(block).not.toContain('active_mrr_clp');
    expect(block).toContain('no es MRR normalizado');
  });
});
