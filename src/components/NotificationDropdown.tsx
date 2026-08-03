import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotifications, type Notification } from '@/contexts/NotificationContext';
import { useAuth } from '@/hooks/useAuthState';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import posthog from 'posthog-js';

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, isError } =
    useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const role =
    user?.user_metadata?.role === 'lawyer' || user?.profile?.role === 'lawyer'
      ? 'lawyer'
      : 'client';
  const notificationsPath = role === 'lawyer' ? '/lawyer/notificaciones' : '/dashboard/notificaciones';

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      posthog.capture('notification_viewed');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    posthog.capture('notification_clicked', {
      notification_type: notification.type,
      entity_type: notification.entityType,
    });
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div className="relative flex h-full items-center">
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 p-0 shadow-lg rounded-lg border border-gray-200 bg-white"
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
          sideOffset={8}
          side="bottom"
        >
          <div className="flex items-center justify-between rounded-t-lg border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-medium">Notificaciones</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:bg-transparent hover:text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAllAsRead();
                }}
              >
                Marcar todo como leído
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[300px] w-full">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            ) : isError ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No pudimos cargar tus notificaciones.
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Bell className="h-8 w-8 text-gray-300" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-700">No tienes notificaciones nuevas</p>
                <p className="px-6 text-xs text-muted-foreground">
                  Aquí aparecerán actualizaciones sobre tus consultas, citas, pagos y actividad en
                  LegalUp.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 10).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 p-4 hover:bg-muted/50',
                      !notification.read && 'bg-muted/25'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-0.5">
                      <NotificationIcon type={notification.type} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{notification.title}</p>
                        {!notification.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <div className="flex items-center pt-1 text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </ScrollArea>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-center gap-1 py-2 text-sm font-medium text-blue-600"
            onSelect={(e) => {
              e.preventDefault();
              navigate(notificationsPath);
              setIsOpen(false);
            }}
          >
            Ver todas las notificaciones
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
