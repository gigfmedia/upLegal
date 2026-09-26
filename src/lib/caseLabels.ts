import type { CaseStatus } from '@/hooks/useLawyerCases';

/** Human-readable case status labels (single taxonomy, reused by Case views). */
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

/** Human-readable booking status labels (single taxonomy). */
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  paid: 'Pagado',
};

/** Human-readable case origin labels (never expose the raw enum). */
export const CASE_SOURCE_LABELS: Record<string, string> = {
  LAWYER_DIRECT: 'Directo',
  LEGALUP_MARKETPLACE: 'Marketplace',
  UNKNOWN: 'Desconocido',
};
