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

/**
 * Resuelve el destino (deep link) de una notificación según su entidad.
 * Solo navega con ids; nunca guarda objetos completos ni datos sensibles.
 */
export function getNotificationLink(input: NotificationLinkInput): string | undefined {
  const { entityType, entityId, metadata, type } = input;

  if (entityType === 'ai_document') {
    const caseId = metadata?.case_id;
    return caseId ? `/lawyer/ai/cases/${caseId}` : undefined;
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
