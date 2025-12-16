import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Home,
  FileText,
  CreditCard,
  Users,
  MessageSquare,
  Settings,
} from 'lucide-react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'application' | 'payment' | 'property' | 'message' | 'system' | 'user';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  loading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
}

const typeConfig = {
  info: {
    icon: Info,
    className: 'text-blue-500',
    bgClassName: 'bg-blue-100 dark:bg-blue-900/30',
  },
  success: {
    icon: CheckCircle2,
    className: 'text-green-500',
    bgClassName: 'bg-green-100 dark:bg-green-900/30',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-orange-500',
    bgClassName: 'bg-orange-100 dark:bg-orange-900/30',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-500',
    bgClassName: 'bg-red-100 dark:bg-red-900/30',
  },
};

const categoryIcons = {
  application: FileText,
  payment: CreditCard,
  property: Home,
  message: MessageSquare,
  system: Settings,
  user: Users,
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;
  const CategoryIcon = categoryIcons[notification.category];

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        !notification.read && 'bg-muted/50 border-primary/20',
        onClick && 'cursor-pointer hover:bg-muted'
      )}
      onClick={() => onClick?.(notification)}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex gap-3">
        <div className={cn('p-2 rounded-full flex-shrink-0', config.bgClassName)}>
          <Icon className={cn('h-4 w-4', config.className)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className={cn('font-medium text-sm', !notification.read && 'font-semibold')}>
                {notification.title}
              </p>
              {!notification.read && (
                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onMarkAsRead && !notification.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  data-testid={`button-mark-read-${notification.id}`}
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(notification.id);
                  }}
                  data-testid={`button-dismiss-${notification.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs gap-1">
              <CategoryIcon className="h-3 w-3" />
              {notification.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>

          {notification.actionLabel && notification.actionUrl && (
            <Button
              variant="link"
              size="sm"
              className="px-0 h-auto mt-2"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = notification.actionUrl!;
              }}
              data-testid={`button-action-${notification.id}`}
            >
              {notification.actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationsPanel({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <Card className="w-full max-w-md" data-testid="notifications-loading">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md" data-testid="notifications-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CardTitle>Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge>{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDismiss={onDismiss}
                  onClick={onNotificationClick}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationBellTrigger({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: NotificationsPanelProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationsPanel
          notifications={notifications}
          loading={loading}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onDismiss={onDismiss}
          onNotificationClick={(notification) => {
            onNotificationClick?.(notification);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
