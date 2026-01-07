import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Bell,
  FileText,
  MessageSquare,
  AlertCircle,
  Info,
  CreditCard,
  Check,
  CheckCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  Home,
  Settings,
  Users
} from "lucide-react";

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'application' | 'payment' | 'property' | 'message' | 'system' | 'user';

export interface Notification {
  id: string;
  application_id: string | null;
  user_id: string;
  notification_type: string;
  channel: string;
  subject: string | null;
  content: string | null;
  sent_at: string | null;
  read_at: string | null;
  status: string;
  created_at: string;
  applications?: {
    id: string;
    property_id: string;
    properties?: {
      title: string;
    };
  };
  // Legacy fields from NotificationsPanel if any
  title?: string;
  message?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  read?: boolean;
  createdAt?: string;
  actionUrl?: string;
  actionLabel?: string;
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

function getNotificationMetadata(notification: Notification) {
  const type = notification.notification_type;
  
  let mappedType: NotificationType = 'info';
  let category: NotificationCategory = 'system';
  let Icon = Info;
  let title = notification.subject || notification.title || "Notification";

  if (type === "status_change") {
    mappedType = 'success';
    category = 'application';
    Icon = FileText;
  } else if (type === "document_request" || type === "info_requested") {
    mappedType = 'warning';
    category = 'application';
    Icon = AlertTriangle;
  } else if (type === "expiration_warning") {
    mappedType = 'error';
    category = 'application';
    Icon = AlertCircle;
  } else if (type === "payment_received" || type === "payment_verified") {
    mappedType = 'success';
    category = 'payment';
    Icon = CreditCard;
  } else if (type === "payment_failed") {
    mappedType = 'error';
    category = 'payment';
    Icon = AlertCircle;
  } else if (type === "lease_signature_complete") {
    mappedType = 'success';
    category = 'application';
    Icon = CheckCircle2;
  } else if (type === "price_drop") {
    mappedType = 'info';
    category = 'property';
    Icon = Home;
  } else if (type === "message") {
    mappedType = 'info';
    category = 'message';
    Icon = MessageSquare;
  }

  return { mappedType, category, Icon, title };
}

export function NotificationItem({
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
  const { mappedType, Icon, title } = getNotificationMetadata(notification);
  const config = typeConfig[mappedType];
  const isRead = !!notification.read_at || !!notification.read;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all hover-elevate group',
        !isRead ? 'bg-accent/50 border-primary/20' : 'hover:bg-muted/50 border-transparent'
      )}
      onClick={() => onClick?.(notification)}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex gap-3">
        <div className={cn('p-2 rounded-full flex-shrink-0 h-fit', config.bgClassName)}>
          <Icon className={cn('h-4 w-4', config.className)} strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className={cn('font-medium text-sm truncate', !isRead && 'font-semibold')}>
                {title}
              </p>
              {!isRead && (
                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {onMarkAsRead && !isRead && (
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

          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {notification.content || notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            {notification.applications?.properties?.title && (
              <p className="text-[10px] font-medium text-primary uppercase tracking-wider truncate mr-2">
                {notification.applications.properties.title}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-auto">
              {format(new Date(notification.created_at || notification.createdAt!), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnifiedNotificationsList({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
  className
}: {
  notifications: Notification[];
  isLoading?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}) {
  const unreadCount = notifications.filter(n => !n.read_at && !n.read).length;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 min-w-5 justify-center">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onMarkAllAsRead}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
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
        )}
      </ScrollArea>
    </div>
  );
}

export function UnifiedNotificationBell() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notificationsResponse, isLoading } = useQuery<{ data: Notification[] }>({
    queryKey: ["/api/user/notifications"],
    enabled: isLoggedIn,
    refetchInterval: 30000
  });

  const notifications = notificationsResponse?.data || [];
  const unreadCount = notifications.filter(n => !n.read_at && !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notifications/mark-all-read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at && !notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    setIsOpen(false);
    if (notification.application_id) {
      navigate(`/applications/${notification.application_id}`);
    } else if (notification.notification_type === "payment_received" || notification.notification_type === "payment_verified") {
      navigate("/payments");
    } else if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full"
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0 overflow-hidden">
        <UnifiedNotificationsList
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
          onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
          onNotificationClick={handleNotificationClick}
          className="max-h-[500px]"
        />
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setIsOpen(false);
              navigate("/applications");
            }}
          >
            View All Applications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
