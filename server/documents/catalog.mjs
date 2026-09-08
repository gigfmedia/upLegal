export const DOCUMENT_PRODUCTS = {
  pagare: {
    amount: 9990,
    currency: 'CLP',
    title: 'Mandato Pagaré — LegalUp',
    description: 'Generación de documento legal',
  },
  // Review sigue con precio fijo server-side (no acepta monto del cliente)
  pagare_review: {
    amount: 59990,
    currency: 'CLP',
    title: 'Consulta legal sobre tu pagaré — LegalUp',
    description: '60 minutos de consulta con abogado, incluye revisión del pagaré generado',
  },
};

export function getDocumentProduct(type) {
  return DOCUMENT_PRODUCTS[type] || null;
}

export function getExpectedDocumentAmount(type) {
  return DOCUMENT_PRODUCTS[type]?.amount ?? null;
}
