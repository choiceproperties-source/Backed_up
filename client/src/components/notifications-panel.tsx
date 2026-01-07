import { UnifiedNotificationsList, NotificationItem, UnifiedNotificationBell } from "./notifications-unified";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";

export type { Notification, NotificationType, NotificationCategory } from "./notifications-unified";

export function NotificationsPanel({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onNotificationClick,
}: any) {
  const unreadCount = notifications.filter((n: any) => !n.read_at && !n.read).length;

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
      <CardContent className="p-0">
        <UnifiedNotificationsList
          notifications={notifications}
          isLoading={loading}
          onMarkAsRead={onMarkAsRead}
          onDismiss={onDismiss}
          onNotificationClick={onNotificationClick}
          className="border-none shadow-none"
        />
      </CardContent>
    </Card>
  );
}

export function NotificationBellTrigger(props: any) {
  return <UnifiedNotificationBell {...props} />;
}
