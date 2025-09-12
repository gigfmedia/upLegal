import { useState, useEffect, useRef } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      // Only close if mouse is not over any part of the dropdown
      if (!dropdownRef.current?.querySelector(':hover')) {
        setIsOpen(false);
      }
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleNotificationClick = (e: React.MouseEvent, id: string, link?: string) => {
    e.preventDefault();
    markAsRead(id);
    setIsOpen(false);
    if (link) {
      window.location.href = link;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <div 
      className="relative flex items-center justify-center h-10 w-10" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <DropdownMenu 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            if (!dropdownRef.current?.querySelector(':hover')) {
              setIsOpen(false);
            }
          } else {
            setIsOpen(true);
          }
        }} 
        modal={false}
      >
        <div 
          className="h-full w-full flex items-center justify-center"
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = undefined;
            }
            setIsOpen(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`h-10 w-10 p-0 rounded-full ${isOpen ? 'bg-accent' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            onMouseEnter={handleMouseEnter}
          >
            <div className="relative h-10 w-10 flex items-center justify-center">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="sr-only">Notificaciones</span>
          </Button>
        </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent
          className="w-80 p-0 shadow-lg rounded-lg border border-gray-200 bg-white"
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = undefined;
            }
          }}
          onMouseLeave={handleMouseLeave}
          forceMount
          sideOffset={8}
          side="bottom"
        >
          <div 
            className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg"
            onMouseEnter={() => {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = undefined;
              }
            }}
          >
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
          <ScrollArea 
            className="h-[300px] w-full"
            onMouseEnter={handleMouseEnter}
          >
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
                    onClick={(e) => handleNotificationClick(e, notification.id, notification.link)}
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
