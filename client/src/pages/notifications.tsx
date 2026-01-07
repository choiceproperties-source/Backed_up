import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UnifiedNotificationsList, Notification } from "@/components/notifications-unified";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function NotificationsPage() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");

  const { data: notificationsResponse, isLoading } = useQuery<{ data: Notification[] }>({
    queryKey: ["/api/user/notifications"],
    enabled: isLoggedIn,
  });

  const notifications = notificationsResponse?.data || [];

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
    
    if (notification.application_id) {
      navigate(`/applications/${notification.application_id}`);
    } else if (notification.notification_type === "payment_received" || notification.notification_type === "payment_verified") {
      navigate("/payments");
    } else if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "unread") return !n.read_at && !n.read;
    return true;
  });

  if (!isLoggedIn) return null;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your property applications and payments.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            <Card className="border-none shadow-sm overflow-hidden">
              <UnifiedNotificationsList
                notifications={filteredNotifications}
                isLoading={isLoading}
                onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
                onNotificationClick={handleNotificationClick}
              />
            </Card>
          </TabsContent>
          <TabsContent value="unread" className="mt-0">
            <Card className="border-none shadow-sm overflow-hidden">
              <UnifiedNotificationsList
                notifications={filteredNotifications}
                isLoading={isLoading}
                onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
                onNotificationClick={handleNotificationClick}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
