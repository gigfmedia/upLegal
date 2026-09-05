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
  let response: Response | null = null;
  let lastError: string | null = null;
  try {
    response = await doFetch(token);
    if (response.status === 401) {
      try {
        const { validateAndRefreshSession } = await import('@/lib/sessionUtils');
        await validateAndRefreshSession();
        const { data } = await supabase.auth.getSession();
        const newToken = data.session?.access_token;
        if (newToken && newToken !== token) response = await doFetch(newToken);
      } catch {}
    }
    if (response.ok) {
      const data = await response.json();
      return {
        rows: ((data.notifications || []) as NotificationRow[]).map((n) => mapNotification(n, role)),
        total: data.total || 0,
      };
    }
    try { lastError = `${response.status} ${await response.text()}`; } catch { lastError = `${response.status}`; }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }
  // Fallback: lectura directa vía Supabase RLS (bypass Render cold start / token expirado)
  console.warn('[notifications] API falló, usando fallback Supabase:', lastError);
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) throw new Error(lastError || 'Error al cargar notificaciones');
  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message || lastError || 'Error al cargar notificaciones');
  return {
    rows: ((data || []) as NotificationRow[]).map((n) => mapNotification(n, role)),
    total: count || 0,
  };
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const doFetch = async (t: string) => fetch('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${t}` } });
  let response: Response | null = null;
  let lastError: string | null = null;
  try {
    response = await doFetch(token);
    if (response.status === 401) {
      try {
        const { validateAndRefreshSession } = await import('@/lib/sessionUtils');
        await validateAndRefreshSession();
        const { data } = await supabase.auth.getSession();
        const newToken = data.session?.access_token;
        if (newToken && newToken !== token) response = await doFetch(newToken);
      } catch {}
    }
    if (response?.ok) {
      const data = await response.json();
      return data.count || 0;
    }
    try { lastError = `${response?.status} ${await response?.text()}`; } catch { lastError = `${response?.status}`; }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }
  console.warn('[notifications] unread-count API falló, fallback Supabase:', lastError);
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) throw new Error(lastError || 'Error al contar notificaciones');
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
  if (error) throw new Error(error.message || lastError || 'Error al contar notificaciones');
  return count || 0;
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
