import { FileText, ReceiptText, UsersRound, type LucideIcon } from 'lucide-react';

export const SERVICE_CATEGORY_SLUGS = [
  'contratos',
  'cobranza',
  'documentacion-laboral',
] as const;

export type ServiceCategorySlug = (typeof SERVICE_CATEGORY_SLUGS)[number];

export interface ServicesCatalogItem {
  slug: ServiceCategorySlug;
  name: string;
  tagline: string;
  description: string;
  bullets: string[];
  idealFor: string;
  icon: LucideIcon;
}

export const SERVICES_CATALOG: ServicesCatalogItem[] = [
  {
    slug: 'contratos',
    name: 'Contratos',
    tagline: 'Acuerdos claros, riesgos visibles.',
    description:
      'Revisamos, ordenamos y preparamos contratos comerciales para que tu empresa sepa qué está firmando y qué debe negociar.',
    bullets: [
      'Revisión de contratos comerciales y de servicios',
      'Identificación de cláusulas críticas y riesgos',
      'Apoyo en redacción y negociación',
    ],
    idealFor: 'Acuerdos con clientes, proveedores, NDA y prestación de servicios.',
    icon: FileText,
  },
  {
    slug: 'cobranza',
    name: 'Cobranza',
    tagline: 'Recupera lo que ya es tuyo.',
    description:
      'Ordenamos los antecedentes y preparamos la gestión de cobranza para que puedas avanzar con claridad, desde el recordatorio hasta la acción judicial.',
    bullets: [
      'Revisión de facturas y antecedentes',
      'Cartas de cobro y apercibimientos',
      'Preparación para cobro judicial',
    ],
    idealFor: 'Facturas impagas, cuentas por cobrar y convenios de pago.',
    icon: ReceiptText,
  },
  {
    slug: 'documentacion-laboral',
    name: 'Documentación laboral',
    tagline: 'Contratos y finiquitos al día.',
    description:
      'Preparamos y revisamos la documentación laboral de tu empresa para reducir errores, ordenar el expediente y responder a tiempo.',
    bullets: [
      'Contratos de trabajo, anexos y actualizaciones',
      'Reglamento interno y políticas internas',
      'Finiquitos y documentación de término',
    ],
    idealFor: 'Contrataciones, cambios de condiciones y término de relación laboral.',
    icon: UsersRound,
  },
];

export function getServiceCategoryName(slug: ServiceCategorySlug | '' | null | undefined) {
  return SERVICES_CATALOG.find((item) => item.slug === slug)?.name || 'Servicio por definir';
}
