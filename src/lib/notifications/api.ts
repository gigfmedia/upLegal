/**
 * LegalUp — Cliente API de notificaciones (in-app).
 * Compartido entre el NotificationContext (campana) y la página completa.
 */
import { supabase } from '@/lib/supabaseClient';
import { getNotificationLink } from '@/lib/notifications/notificationTypes';

export type NotificationRole = 'lawyer' | 'client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  link?: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type NotificationListData = { rows: Notification[]; total: number };

export async function getAuthToken(): Promise<string | null> {
  // Ensure session is valid and refreshed if needed before returning token
  // This prevents "Token inválido" 401 when the stored session is expired
  try {
    const { validateAndRefreshSession } = await import('@/lib/sessionUtils');
    await validateAndRefreshSession();
  } catch {}
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export function mapNotification(n: NotificationRow, role: NotificationRole): Notification {
  return {
    id: n.id,
    title: n.title,
    message: n.message || '',
    type: n.type,
    read: !!n.is_read,
    createdAt: new Date(n.created_at),
    entityType: n.entity_type || null,
    entityId: n.entity_id || null,
    metadata: n.metadata || null,
    link: getNotificationLink({
      type: n.type,
      entityType: n.entity_type,
      entityId: n.entity_id,
      metadata: n.metadata,
      role,
    }),
  };
}

export async function fetchNotifications(
  token: string,
  role: NotificationRole,
  opts: { limit?: number; offset?: number } = {}
): Promise<NotificationListData> {
  const { limit = 50, offset = 0 } = opts;
  const doFetch = async (t: string) => fetch(`/api/notifications?limit=${limit}&offset=${offset}`, { headers: { Authorization: `Bearer ${t}` } });
  let response = await doFetch(token);
  // Retry once on 401 after refreshing session (Render cold start or expired JWT)
  if (response.status === 401) {
    try {
      const { validateAndRefreshSession } = await import('@/lib/sessionUtils');
      await validateAndRefreshSession();
      const { supabase } = await import('@/lib/supabaseClient');
      const { data } = await supabase.auth.getSession();
      const newToken = data.session?.access_token;
      if (newToken && newToken !== token) response = await doFetch(newToken);
    } catch {}
  }
  if (!response.ok) throw new Error('Error al cargar notificaciones');
  const data = await response.json();
  return {
    rows: ((data.notifications || []) as NotificationRow[]).map((n) => mapNotification(n, role)),
    total: data.total || 0,
  };
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const doFetch = async (t: string) => fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${t}` } });
  let response = await doFetch(token);
  if (response.status === 401) {
    try {
      const { validateAndRefreshSession } = await import('@/lib/sessionUtils');
      await validateAndRefreshSession();
      const { supabase } = await import('@/lib/supabaseClient');
      const { data } = await supabase.auth.getSession();
      const newToken = data.session?.access_token;
      if (newToken && newToken !== token) response = await doFetch(newToken);
    } catch {}
  }
  if (!response.ok) throw new Error('Error al contar notificaciones');
  const data = await response.json();
  return data.count || 0;
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al marcar notificación como leída');
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Error al marcar notificaciones como leídas');
}
