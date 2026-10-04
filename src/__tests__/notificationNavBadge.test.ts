import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layout = readFileSync(resolve('src/components/dashboard/DashboardLayout.tsx'), 'utf-8');
const bell = readFileSync(resolve('src/components/NotificationDropdown.tsx'), 'utf-8');
const context = readFileSync(resolve('src/contexts/NotificationContext.tsx'), 'utf-8');

describe('4.59C.1 notification count in navigation', () => {
  it('sidebar reuses the same pill as Casos/Solicitudes for notifications', () => {
    expect(layout).toContain('notifBadgeFor');
    expect(layout).toContain('/lawyer/notificaciones');
    // Same visual treatment as navCounts pills.
    const pill = 'ml-auto bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full';
    expect(layout.split(pill).length - 1).toBeGreaterThanOrEqual(8);
  });

  it('zero and loading render no badge', () => {
    expect(layout).toContain('if (notifLoading) return null');
    expect(layout).toContain('return notifUnread > 0 ? notifUnread : null');
  });

  it('count comes from canonical NotificationContext (no list-derived hack)', () => {
    expect(layout).toContain("from '@/contexts/NotificationContext'");
    expect(layout).toContain('unreadCount');
    expect(layout).not.toMatch(/notifications\.filter|rows\.filter.*read/);
  });

  it('badge is accessible (unread count communicated)', () => {
    expect(layout).toContain('Notificaciones, ${notifBadgeFor(href)} sin leer');
  });

  it('bell badge anchored inside the bell, clear of the avatar', () => {
    expect(bell).toContain('absolute right-1 top-1');
    expect(bell).not.toContain('-right-1 -top-1');
  });

  it('notification read semantics untouched', () => {
    expect(context).toContain('markAsRead');
    expect(context).toContain('markAllNotificationsRead');
  });
});
