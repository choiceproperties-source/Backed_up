import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UnifiedNotificationsList, Notification } from "@/components/notifications-unified";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCheck, Filter, Bell, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function NotificationsPage() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);

  const { data: notificationsResponse, isLoading } = useQuery<{ data: Notification[] }>({
    queryKey: ["/api/user/notifications"],
    enabled: isLoggedIn,
    refetchInterval: 60000,
  });

  const notifications = notificationsResponse?.data || [];
  const unreadCount = notifications.filter(n => !n.read_at && !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/user/notifications"] });
      const previous = queryClient.getQueryData<{ data: Notification[] }>(["/api/user/notifications"]);
      if (previous) {
        queryClient.setQueryData(["/api/user/notifications"], {
          ...previous,
          data: previous.data.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
        });
      }
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) queryClient.setQueryData(["/api/user/notifications"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notifications/mark-all-read");
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/user/notifications"] });
      const previous = queryClient.getQueryData<{ data: Notification[] }>(["/api/user/notifications"]);
      if (previous) {
        queryClient.setQueryData(["/api/user/notifications"], {
          ...previous,
          data: previous.data.map(n => ({ ...n, read_at: new Date().toISOString() }))
        });
      }
      return { previous };
    },
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(["/api/user/notifications"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] })
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesTab = activeTab === "all" || (activeTab === "unread" && !n.read_at && !n.read);
      const matchesType = !typeFilter || n.notification_type?.includes(typeFilter.toLowerCase());
      
      const isActionRequired = n.notification_type === "document_request" || 
                              n.notification_type === "info_requested" || 
                              n.notification_type === "payment_failed";
      
      const matchesActionRequired = !actionRequiredOnly || isActionRequired;
      
      return matchesTab && matchesType && matchesActionRequired;
    });
  }, [notifications, activeTab, typeFilter, actionRequiredOnly]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at && !notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Check for deep-linking actionUrl in metadata or root
    let targetUrl = (notification as any).metadata?.actionUrl || notification.actionUrl;
    
    if (!targetUrl && notification.application_id) {
      targetUrl = `/applications/${notification.application_id}`;
      if (notification.notification_type === "document_request" || notification.content?.toLowerCase().includes("document")) {
        targetUrl += "?tab=documents";
      } else if (notification.notification_type === "info_requested" || notification.content?.toLowerCase().includes("review")) {
        targetUrl += "?tab=review";
      }
    } else if (!targetUrl && (notification.notification_type === "payment_received" || notification.notification_type === "payment_verified")) {
      targetUrl = "/tenant-payments";
    }
    
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 lg:pb-8">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground text-sm">
                  Stay updated with your property applications and payments
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button 
                onClick={() => markAllAsReadMutation.mutate()}
                variant="outline"
                className="w-full md:w-auto hover-elevate"
                data-testid="button-mark-all-read-page"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>

          <Card className="p-1 shadow-sm border-none bg-background/50 backdrop-blur-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between p-2 border-b gap-4">
                <TabsList className="bg-transparent h-auto p-0 gap-2">
                  <TabsTrigger 
                    value="all" 
                    className="rounded-full px-4 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="unread" 
                    className="rounded-full px-4 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex gap-2"
                  >
                    Unread
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 bg-primary-foreground/20 text-inherit border-none">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Button 
                    variant={actionRequiredOnly ? "default" : "ghost"} 
                    size="sm" 
                    className={cn("h-9 gap-2 px-3 rounded-full transition-all", actionRequiredOnly && "bg-orange-500 hover:bg-orange-600 text-white")}
                    onClick={() => setActionRequiredOnly(!actionRequiredOnly)}
                    data-testid="button-filter-action-required"
                  >
                    <AlertCircle className={cn("h-4 w-4", actionRequiredOnly ? "text-white" : "text-orange-500")} />
                    <span className="hidden sm:inline">Action Required</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 gap-2 px-3 rounded-full">
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filter by Type</span>
                        {typeFilter && <Badge variant="secondary" className="ml-1 h-5 px-1.5 capitalize">{typeFilter}</Badge>}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTypeFilter(null)}>All Types</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTypeFilter("application")}>Applications</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTypeFilter("payment")}>Payments</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTypeFilter("message")}>Messages</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="bg-background">
                <UnifiedNotificationsList
                  notifications={filteredNotifications}
                  isLoading={isLoading}
                  onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                  onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
                  onNotificationClick={handleNotificationClick}
                  className="min-h-[400px]"
                />
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
