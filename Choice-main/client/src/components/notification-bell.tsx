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
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  Bell, 
  FileText,
  MessageSquare,
  AlertCircle,
  Info
} from "lucide-react";

interface Notification {
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
}

export function NotificationBell() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notificationsResponse, isLoading } = useQuery<{ data: Notification[] }>({
    queryKey: ["/api/user/notifications"],
    enabled: isLoggedIn,
    refetchInterval: 30000
  });

  const notifications: Notification[] = notificationsResponse?.data || [];
  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.application_id) {
      setIsOpen(false);
      navigate(`/applications/${notification.application_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "status_change":
        return <FileText className="h-4 w-4 text-primary" />;
      case "document_request":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "reminder":
        return <Bell className="h-4 w-4 text-muted-foreground" />;
      case "expiration_warning":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    if (notification.subject) return notification.subject;
    
    switch (notification.notification_type) {
      case "status_change":
        return "Application Status Updated";
      case "document_request":
        return "Document Requested";
      case "reminder":
        return "Reminder";
      case "expiration_warning":
        return "Application Expiring Soon";
      case "message":
        return "New Message";
      default:
        return "Notification";
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
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-4 p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} new</Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  {index > 0 && <Separator />}
                  <button
                    data-testid={`notification-${notification.id}`}
                    className={`w-full p-3 text-left transition-colors hover-elevate ${
                      !notification.read_at ? "bg-accent/50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm ${!notification.read_at ? "font-medium" : ""}`}>
                            {getNotificationTitle(notification)}
                          </span>
                          {!notification.read_at && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {notification.content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                        )}
                        {notification.applications?.properties?.title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Property: {notification.applications.properties.title}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/applications");
                }}
                data-testid="button-view-all-notifications"
              >
                View All Applications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
