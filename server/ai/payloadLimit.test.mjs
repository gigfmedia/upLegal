// @vitest-environment node
// FASE 4.62D.2 — Integración real de la cadena HTTP para el límite de body:
// express.json({limit}) + middleware 413, sin importar server.mjs (side effects)
// ni llamar a Supabase. Replica la configuración exacta de server.mjs.
import { describe, it, expect } from 'vitest';
import express from 'express';
import { serverPayloadTooLargeMiddleware, PAYLOAD_TOO_LARGE_RESPONSE, isPayloadTooLargeError } from './payloadLimit.mjs';

function buildApp(limit = '1kb') {
  const app = express();
  app.post('/api/ai/cases/w/drafts/d', express.json({ limit }), (req, res) => {
    res.json({ length: (req.body?.content || '').length });
  });
  app.use(serverPayloadTooLargeMiddleware);
  app.use((error, req, res, next) => {
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

describe('4.62D.2 límite de body: 413 controlado con JSON de la API', () => {
  it('body dentro del límite HTTP: llega al handler y responde 200', async () => {
    const server = await listen(buildApp('1kb'));
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/ai/cases/w/drafts/d`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'ok'.repeat(100) }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.length).toBe(200);
    } finally {
      server.close();
    }
  });

  it('body que excede el límite: 413 con respuesta JSON consistente, sin detalles internos', async () => {
    const server = await listen(buildApp('1kb'));
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/ai/cases/w/drafts/d`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'x'.repeat(3000) }),
      });
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body).toEqual(PAYLOAD_TOO_LARGE_RESPONSE);
      expect(body.code).toBe('PAYLOAD_TOO_LARGE');
      // Sin filtrar campos internos del error del parser (type, stack).
      expect(Object.keys(body).sort()).toEqual(['code', 'error']);
      expect(JSON.stringify(body)).not.toContain('entity');
      expect(JSON.stringify(body)).not.toContain('stack');
    } finally {
      server.close();
    }
  });

  it('errores ajenos al 413 pasan al siguiente handler (comportamiento existente intacto)', async () => {
    const app = express();
    app.post('/boom', express.json({ limit: '1kb' }), (req, res, next) => {
      next(Object.assign(new Error('algo interno'), { status: 500 }));
    });
    app.use(serverPayloadTooLargeMiddleware);
    app.use((error, req, res, next) => res.status(500).json({ error: 'Internal server error' }));
    const server = await listen(app);
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/boom`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'a' }),
      });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal server error' });
    } finally {
      server.close();
    }
  });

  it('isPayloadTooLargeError reconoce body-parser y status 413; descarta otros', () => {
    expect(isPayloadTooLargeError({ type: 'entity.too.large' })).toBe(true);
    expect(isPayloadTooLargeError({ statusCode: 413 })).toBe(true);
    expect(isPayloadTooLargeError({ status: 413 })).toBe(true);
    expect(isPayloadTooLargeError(new Error('x'))).toBe(false);
    expect(isPayloadTooLargeError({ statusCode: 500 })).toBe(false);
    expect(isPayloadTooLargeError(null)).toBe(false);
    expect(isPayloadTooLargeError('x')).toBe(false);
  });
});
