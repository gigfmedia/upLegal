import type { DocumentTemplateMetadata } from '../../types'

const metadata: DocumentTemplateMetadata = {
  slug: 'pagare',
  title: 'Mandato Pagaré',
  description: 'Genera un pagaré legalmente válido en Chile. Ideal para préstamos entre particulares con o sin intereses.',
  category: 'civil',
  legalCategory: 'Derecho Civil / Obligaciones',
  searchKeywords: [
    'pagaré', 'mandato pagaré', 'préstamo entre particulares',
    'documento legal Chile', 'título ejecutivo', 'cobro de deuda',
    'pagaré online', 'contrato de préstamo', 'reconocimiento de deuda',
  ],
  estimatedTime: '5 minutos',
  estimatedReadTime: '3 minutos',
  estimatedGenerationTime: '30 segundos',
  icon: 'FileText',
  badge: 'Más vendido',
  hero: {
    title: 'Genera tu Mandato Pagaré en minutos',
    description: 'Documento legalmente válido en Chile. Sin abogado, sin filas, sin complicaciones. Completa el formulario y recibe tu PDF al instante.',
  },
  button: {
    text: 'Generar pagaré por $9.990',
  },
  seo: {
    title: 'Mandato Pagaré Online | LegalUp',
    description: 'Genera un pagaré con validez legal en Chile. Rápido, seguro y sin abogado. Recibe tu PDF al instante.',
  },
  faq: [
    {
      question: '¿Qué es un mandato pagaré?',
      answer: 'Es un documento legal que acredita una deuda y la obligación de pagarla en una fecha determinada. Es la forma más común y segura de formalizar préstamos entre personas.',
    },
    {
      question: '¿Es válido legalmente?',
      answer: 'Sí. El pagaré generado cumple con los requisitos del Código Civil y Código de Comercio chileno. Puede ser utilizado como título ejecutivo en caso de incumplimiento.',
    },
    {
      question: '¿Puedo incluir intereses?',
      answer: 'Sí. Puedes definir la tasa de interés que se aplicará. El documento incluirá el cálculo detallado del monto total a pagar con intereses.',
    },
    {
      question: '¿Qué pasa si no me pagan?',
      answer: 'El pagaré es un título ejecutivo, lo que significa que puedes demandar el cobro directamente ante los tribunales sin necesidad de un juicio previo.',
    },
  ],
  upsell: {
    title: '¿Quieres que un abogado revise este pagaré antes de utilizarlo?',
    description: 'Revisión jurídica personalizada. Observaciones y correcciones. Entrega en menos de 24 horas.',
    buttonText: 'Solicitar revisión jurídica',
  },
  templateVersion: 1,
  priceKey: 'PAGARE',
}

export default metadata