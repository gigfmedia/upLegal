import { useState } from 'react';
import { Bell, Check, Clock, MessageSquare, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import type { Notification } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const notificationIcons = {
  appointment: <Calendar className="h-4 w-4 text-blue-500" />,
  message: <MessageSquare className="h-4 w-4 text-green-500" />,
  payment: <DollarSign className="h-4 w-4 text-purple-500" />,
  system: <AlertCircle className="h-4 w-4 text-amber-500" />,
};

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      window.location.href = link;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div className="relative h-full flex items-center">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-10 w-10 flex items-center justify-center hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 p-0 shadow-lg rounded-lg border border-gray-200 bg-white"
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
          forceMount
          sideOffset={8}
          side="bottom"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
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
            ) : notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No hay notificaciones
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 p-4 hover:bg-muted/50',
                      !notification.read && 'bg-muted/25'
                    )}
                    onClick={() => handleNotificationClick(notification.id, notification.link)}
                  >
                    <div className="mt-0.5">
                      {notificationIcons[notification.type as keyof typeof notificationIcons] || notificationIcons.system}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{notification.title}</p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
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
          <DropdownMenuItem className="justify-center py-2 text-sm font-medium text-blue-600">
            Ver todas las notificaciones
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
