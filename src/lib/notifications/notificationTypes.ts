/**
 * LegalUp — Catálogo central de tipos de notificación.
 *
 * Todos los módulos (bookings, pagos, citas, LegalUp AI, jobs, LegalUp Empresas)
 * usan estos identificadores. No repartir strings arbitrarios por el proyecto.
 */

export type NotificationCategory =
  | 'booking'
  | 'appointment'
  | 'payment'
  | 'message'
  | 'job'
  | 'ai'
  | 'case'
  | 'empresa'
  | 'system';

export type NotificationType =
  // Bookings
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  // Appointments
  | 'appointment.created'
  | 'appointment.reminder'
  | 'appointment.starting_soon'
  | 'appointment.completed'
  | 'appointment.no_show'
  // Payments
  | 'payment.pending'
  | 'payment.approved'
  | 'payment.rejected'
  | 'payment.refunded'
  // Client / Lawyer
  | 'client.new_request'
  | 'lawyer.new_request'
  | 'lawyer.assigned'
  | 'lawyer.unassigned'
  // Messages
  | 'message.received'
  // Jobs
  | 'job.completed'
  | 'job.failed'
  | 'job.warning'
  // LegalUp AI
  | 'ai.document.uploaded'
  | 'ai.document.processing'
  | 'ai.document.ready'
  | 'ai.document.failed'
  | 'ai.analysis.completed'
  | 'ai.analysis.failed'
  // Cases
  | 'case.created'
  | 'case.updated'
  | 'case.status_changed'
  // Sistema
  | 'system.info'
  | 'system.warning'
  | 'system.error'
  // Empresas (tipos heredados que ya se producen)
  | 'case_assigned'
  | 'sla_breached'
  | 'first_response'
  | 'new_message';

export function getNotificationCategory(type: string): NotificationCategory {
  if (type.startsWith('booking.')) return 'booking';
  if (type.startsWith('appointment.')) return 'appointment';
  if (type.startsWith('payment.')) return 'payment';
  if (type === 'message.received' || type === 'new_message') return 'message';
  if (type.startsWith('job.')) return 'job';
  if (type.startsWith('ai.')) return 'ai';
  if (type.startsWith('case.')) return 'case';
  if (type === 'case_assigned' || type === 'sla_breached' || type === 'first_response') return 'empresa';
  return 'system';
}

type Role = 'lawyer' | 'client' | undefined;

export type NotificationLinkInput = {
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  role?: Role;
};

/** 4.56I: explicit ai_document metadata (forward shape). Historical rows
 * carry only `case_id` (= ai_workspaces.id, kept readable below). */
export type AIDocumentNotificationMetadata = {
  lawyer_case_id?: string | null;
  workspace_id?: string | null;
  document_id?: string | null;
  /** Legacy overloaded key: always an ai_workspaces.id in practice. */
  case_id?: string | null;
};

function asId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Resuelve el destino (deep link) de una notificación según su entidad.
 * Solo navega con ids; nunca guarda objetos completos ni datos sensibles.
 */
export function getNotificationLink(input: NotificationLinkInput): string | undefined {
  const { entityType, entityId, metadata, type } = input;

  if (entityType === 'ai_document') {
    // 4.56I: explicit identifiers win. Linked current Case → canonical
    // documents tab (never the legacy route). Orphan workspace → legacy
    // detail (preserved). Legacy `case_id` holds a workspace id in every
    // known producer → legacy route, which self-redirects when linked.
    // Missing/stale identifiers → safe fallback, never an invalid detail.
    const meta = (metadata ?? {}) as AIDocumentNotificationMetadata;
    const linkedCaseId = asId(meta.lawyer_case_id);
    if (linkedCaseId) return `/lawyer/cases/${linkedCaseId}?tab=documents`;
    const workspaceId = asId(meta.workspace_id) ?? asId(meta.case_id);
    if (workspaceId) return `/lawyer/ai/cases/${workspaceId}`;
    return '/lawyer/cases';
  }

  if (entityType === 'request' && entityId) {
    return `/empresa/solicitudes/${entityId}`;
  }

  if (entityType === 'booking') {
    if (input.role === 'lawyer') return '/lawyer/citas';
    return '/dashboard/appointments';
  }

  if (type === 'payment.approved' || type === 'payment.refunded') {
    if (input.role === 'lawyer') return '/lawyer/earnings';
    return '/dashboard/payments';
  }

  if (type === 'booking.created' || type === 'appointment.reminder') {
    if (input.role === 'lawyer') return '/lawyer/citas';
    return '/dashboard/appointments';
  }

  return undefined;
}
