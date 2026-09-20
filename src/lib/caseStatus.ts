/** Colores por estado de caso Pro (badge discreto). Fuente única para lista y detalle. */
export const CASE_STATUS_COLORS: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-200 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  quoted: 'Cotizado',
  paid: 'Pagado',
  in_progress: 'En progreso',
  delivered: 'Entregado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

/**
 * 4.36D — canonical frontend status semantics (display/filter only; the DB
 * trigger is independently authoritative). ACTIVE statuses consume Pro
 * capacity; HISTORICAL (closed/cancelled) preserve history at zero capacity.
 */
export const ACTIVE_CASE_STATUSES = ['new', 'quoted', 'paid', 'in_progress', 'delivered'] as const;

export const HISTORICAL_CASE_STATUSES = ['closed', 'cancelled'] as const;

export type ActiveCaseStatus = (typeof ACTIVE_CASE_STATUSES)[number];

export function isActiveCaseStatus(status: string | null | undefined): boolean {
  return (ACTIVE_CASE_STATUSES as readonly string[]).includes(status ?? '');
}
