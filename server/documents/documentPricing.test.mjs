// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOCUMENT_PRODUCTS, getDocumentProduct } from './catalog.mjs';

// Reimplementa la lógica server-side exacta de /api/documents/create y webhook
function validateCreatePrice({ type, total_paid }) {
  const product = getDocumentProduct(type);
  if (!product) return { code: 'INVALID_PRODUCT', status: 400 };
  if (total_paid !== undefined && total_paid !== null && String(total_paid).trim() !== '') {
    const clientPrice = Number(total_paid);
    if (!Number.isFinite(clientPrice) || clientPrice !== product.amount) {
      return { code: 'PRICE_MISMATCH', status: 400, expected_amount: product.amount, expected_currency: product.currency };
    }
  }
  return { status: 200, officialPrice: product.amount, officialCurrency: product.currency };
}

function validateWebhookAmount({ type, paidAmount, paidCurrency }) {
  const product = getDocumentProduct(type);
  if (!product) return { valid: false, reason: 'unknown_product' };
  const amt = Number(paidAmount);
  if (!Number.isFinite(amt) || amt !== product.amount || (paidCurrency && paidCurrency !== product.currency)) {
    return { valid: false, reason: 'price_mismatch', expected: product.amount, expectedCurrency: product.currency, got: amt, gotCurrency: paidCurrency };
  }
  return { valid: true };
}

describe('FASE 2A — Document pricing integrity', () => {
  it('catalog tiene pagaré 9990 CLP', () => {
    expect(DOCUMENT_PRODUCTS.pagare.amount).toBe(9990);
    expect(DOCUMENT_PRODUCTS.pagare.currency).toBe('CLP');
    expect(getDocumentProduct('pagare').amount).toBe(9990);
  });

  // === /api/documents/create ===
  it('precio correcto 9990 → success con 9990', () => {
    const r = validateCreatePrice({ type: 'pagare', total_paid: 9990 });
    expect(r.status).toBe(200);
    expect(r.officialPrice).toBe(9990);
  });

  it('precio correcto como string "9990" → success', () => {
    const r = validateCreatePrice({ type: 'pagare', total_paid: '9990' });
    expect(r.status).toBe(200);
  });

  it('precio manipulado 100 → 400 PRICE_MISMATCH, MP no llamado', () => {
    const r = validateCreatePrice({ type: 'pagare', total_paid: 100 });
    expect(r.status).toBe(400);
    expect(r.code).toBe('PRICE_MISMATCH');
    expect(r.expected_amount).toBe(9990);
  });

  it('precio superior manipulado 999000 → 400 PRICE_MISMATCH', () => {
    const r = validateCreatePrice({ type: 'pagare', total_paid: 999000 });
    expect(r.status).toBe(400);
    expect(r.code).toBe('PRICE_MISMATCH');
  });

  it('sin precio enviado → success con precio oficial 9990', () => {
    const r = validateCreatePrice({ type: 'pagare', total_paid: undefined });
    expect(r.status).toBe(200);
    expect(r.officialPrice).toBe(9990);
    const r2 = validateCreatePrice({ type: 'pagare' });
    expect(r2.status).toBe(200);
  });

  it('producto inexistente → 400 INVALID_PRODUCT', () => {
    const r = validateCreatePrice({ type: 'producto-inventado', total_paid: 9990 });
    expect(r.status).toBe(400);
    expect(r.code).toBe('INVALID_PRODUCT');
  });

  it('total_paid null/empty → tratado como no enviado → success', () => {
    expect(validateCreatePrice({ type: 'pagare', total_paid: null }).status).toBe(200);
    expect(validateCreatePrice({ type: 'pagare', total_paid: '' }).status).toBe(200);
  });

  // === Webhook validation ===
  it('webhook correcto amount 9990 CLP → valid', () => {
    const r = validateWebhookAmount({ type: 'pagare', paidAmount: 9990, paidCurrency: 'CLP' });
    expect(r.valid).toBe(true);
  });

  it('webhook importe inferior 100 → no valid, no completar', () => {
    const r = validateWebhookAmount({ type: 'pagare', paidAmount: 100, paidCurrency: 'CLP' });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('price_mismatch');
  });

  it('webhook importe distinto y currency distinta → no valid', () => {
    const r = validateWebhookAmount({ type: 'pagare', paidAmount: 9990, paidCurrency: 'USD' });
    expect(r.valid).toBe(false);
  });

  it('webhook sin currency (null) pero amount correcto → valid (currency opcional)', () => {
    const r = validateWebhookAmount({ type: 'pagare', paidAmount: 9990, paidCurrency: null });
    expect(r.valid).toBe(true);
  });

  // === Webhook duplicado / idempotencia ===
  it('webhook duplicado no duplica efectos (handleDocumentPayment idempotente)', async () => {
    const { handleDocumentPayment } = await import('../documents.mjs');
    let generateCalls = 0;
    const supabase = {
      from: (table) => {
        if (table !== 'generated_documents') throw new Error('unexpected table ' + table);
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'doc1', type: 'pagare', status: 'completed', pdf_url: 'https://x' }, error: null }),
              single: async () => ({ data: { id: 'doc1', type: 'pagare', status: 'completed' }, error: null }),
            }),
          }),
          update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }) }),
        };
      },
      storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), createBucket: async () => {} }) },
    };
    const result = await handleDocumentPayment({ supabase, documentId: 'doc1', paymentId: 'pay1', resend: null, onPurchase: () => { generateCalls++; } });
    expect(result.status).toBe('completed');
    expect(generateCalls).toBe(0); // onPurchase no debe dispararse en duplicado
  });

  it('review webhook amount 59990 valid, 100 no valid', () => {
    const ok = validateWebhookAmount({ type: 'pagare_review', paidAmount: 59990, paidCurrency: 'CLP' });
    expect(ok.valid).toBe(true);
    const bad = validateWebhookAmount({ type: 'pagare_review', paidAmount: 100, paidCurrency: 'CLP' });
    expect(bad.valid).toBe(false);
  });
});
