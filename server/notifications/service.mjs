/**
 * LegalUp — Notification Service (central).
 *
 * Único punto de creación de notificaciones in-app para todos los módulos:
 * bookings, pagos, citas, LegalUp AI, jobs y LegalUp Empresas.
 *
 * Los módulos emiten EVENTOS y este servicio los convierte en NOTIFICACIONES
 * (filas de la tabla `notifications`), con deduplicación por `event_id` para
 * tolerar retries / webhooks duplicados.
 */

export function createNotificationService(supabase) {
  /**
   * Crea una notificación para un usuario.
   * @param {object} input
   * @param {string} input.userId   Destinatario (auth.users.id).
   * @param {string} input.type     Tipo del catálogo (ej. 'ai.document.ready').
   * @param {string} input.title    Título corto.
   * @param {string} input.message  Cuerpo visible.
   * @param {string} [input.entityType]  Tipo de entidad (booking, ai_document, ...).
   * @param {string} [input.entityId]    Id de la entidad.
   * @param {object} [input.metadata]    Metadata de navegación (case_id, booking_id...).
   * @param {string} [input.eventId]     Identificador del evento lógico (dedup).
   */
  async function notifyUser({
    userId,
    type,
    title,
    message,
    entityType = null,
    entityId = null,
    metadata = null,
    eventId = null,
  }) {
    if (!userId || !type || !title || !message) return;

    const row = {
      user_id: userId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata || null,
      event_id: eventId || null,
    };

    const { error } = await supabase.from('notifications').insert(row);
    if (!error) return;

    // Deduplicación: si el event_id ya existe (retry/webhook duplicado),
    // el insert choca contra el índice único y lo ignoramos silenciosamente.
    if (error.code === '23505') return;

    console.error('[notifications] error creando notificación:', error.message);
  }

  /** Crea notificaciones para varios destinatarios en paralelo. */
  async function notifyUsers(list = []) {
    await Promise.all(list.map(notifyUser));
  }

  return { notifyUser, notifyUsers };
}
