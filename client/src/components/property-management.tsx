import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Eye, 
  Heart, 
  FileText, 
  Clock, 
  DollarSign, 
  Settings, 
  StickyNote,
  Pin,
  Trash2,
  Plus,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import type { Property, PropertyNote } from "@shared/schema";

interface PropertyAnalytics {
  views: number;
  saves: number;
  applicationCount: number;
  applicationsByStatus: Record<string, number>;
  listedAt: string | null;
  priceHistory: Array<{ price: string; changedAt: string; changedBy?: string }>;
}

interface PropertyManagementProps {
  property: Property;
  onUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "bg-gray-500" },
  { value: "available", label: "Available", color: "bg-green-500" },
  { value: "rented", label: "Rented", color: "bg-blue-500" },
  { value: "under_maintenance", label: "Under Maintenance", color: "bg-yellow-500" },
  { value: "coming_soon", label: "Coming Soon", color: "bg-purple-500" },
  { value: "unpublished", label: "Unpublished", color: "bg-red-500" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "featured", label: "Featured" },
];

export function PropertyManagement({ property, onUpdate }: PropertyManagementProps) {
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [scheduledDate, setScheduledDate] = useState<string>(
    property.scheduledPublishAt ? format(new Date(property.scheduledPublishAt), "yyyy-MM-dd") : ""
  );

  const { data: analytics } = useQuery<{ success: boolean; data: PropertyAnalytics }>({
    queryKey: ["/api/properties", property.id, "analytics"],
  });

  const { data: notes, refetch: refetchNotes } = useQuery<{ success: boolean; data: PropertyNote[] }>({
    queryKey: ["/api/properties", property.id, "notes"],
  });

  const statusMutation = useMutation({
    mutationFn: async (data: { listingStatus?: string; visibility?: string }) => {
      return apiRequest("PATCH", `/api/properties/${property.id}/status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      onUpdate?.();
    },
  });

  const expirationMutation = useMutation({
    mutationFn: async (data: { expirationDays?: number; autoUnpublish?: boolean }) => {
      return apiRequest("PATCH", `/api/properties/${property.id}/expiration`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      onUpdate?.();
    },
  });

  const priceMutation = useMutation({
    mutationFn: async (price: string) => {
      return apiRequest("PATCH", `/api/properties/${property.id}/price`, { price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id, "analytics"] });
      onUpdate?.();
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: { content: string; noteType: string }) => {
      return apiRequest("POST", `/api/properties/${property.id}/notes`, data);
    },
    onSuccess: () => {
      setNewNote("");
      refetchNotes();
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/properties/${property.id}/notes/${noteId}`, {});
    },
    onSuccess: () => {
      refetchNotes();
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      return apiRequest("PATCH", `/api/properties/${property.id}/notes/${noteId}`, { isPinned });
    },
    onSuccess: () => {
      refetchNotes();
    },
  });

  const scheduledPublishMutation = useMutation({
    mutationFn: async (date: string | null) => {
      return apiRequest("PATCH", `/api/properties/${property.id}/scheduled-publish`, {
        scheduledPublishAt: date ? new Date(date).toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      onUpdate?.();
    },
  });

  const currentStatus = STATUS_OPTIONS.find(s => s.value === (property.listingStatus || "draft"));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="status" className="w-full flex flex-col h-full max-h-[80vh]">
        <TabsList className="grid w-full grid-cols-4 shrink-0">
          <TabsTrigger value="status" data-testid="tab-status">Status</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
          <TabsContent value="status" className="space-y-4 m-0">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Listing Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge className={currentStatus?.color}>
                      {currentStatus?.label || "Unknown"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Change Status</Label>
                  <Select
                    value={property.listingStatus || "draft"}
                    onValueChange={(value) => statusMutation.mutate({ listingStatus: value })}
                    data-testid="select-listing-status"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Visibility</Label>
                  <Select
                    value={property.visibility || "public"}
                    onValueChange={(value) => statusMutation.mutate({ visibility: value })}
                    data-testid="select-visibility"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 m-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                  <p className="text-xl font-bold mt-1" data-testid="text-view-count">
                    {analytics?.data?.views || property.viewCount || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Saves</span>
                  </div>
                  <p className="text-xl font-bold mt-1" data-testid="text-save-count">
                    {analytics?.data?.saves || property.saveCount || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Apps</span>
                  </div>
                  <p className="text-xl font-bold mt-1" data-testid="text-application-count">
                    {analytics?.data?.applicationCount || property.applicationCount || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Listed</span>
                  </div>
                  <p className="text-sm font-medium mt-1 truncate" data-testid="text-listed-date">
                    {property.listedAt 
                      ? format(new Date(property.listedAt), "MMM d, yy")
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {analytics?.data?.priceHistory && analytics.data.priceHistory.length > 0 && (
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Price History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="space-y-2">
                    {analytics.data.priceHistory.map((entry: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {format(new Date(entry.changedAt), "MMM d, yyyy")}
                        </span>
                        <span className="font-medium">${parseFloat(entry.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 m-0">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Expiration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-Unpublish</Label>
                    <p className="text-xs text-muted-foreground">
                      Unpublish listing after expiration
                    </p>
                  </div>
                  <Switch
                    checked={property.autoUnpublish ?? true}
                    onCheckedChange={(checked) => expirationMutation.mutate({ autoUnpublish: checked })}
                    data-testid="switch-auto-unpublish"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expiration Days</Label>
                  <Select
                    value={String(property.expirationDays || 90)}
                    onValueChange={(value) => expirationMutation.mutate({ expirationDays: parseInt(value) })}
                    data-testid="select-expiration-days"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {property.expiresAt && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Expires:</span>{" "}
                      <span className="font-medium">
                        {format(new Date(property.expiresAt), "MMMM d, yyyy")}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Price
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="New price"
                    defaultValue={property.price || ""}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== property.price) {
                        priceMutation.mutate(e.target.value);
                      }
                    }}
                    data-testid="input-new-price"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Price changes are tracked in history
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Publish Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    data-testid="input-scheduled-publish-date"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => scheduledPublishMutation.mutate(scheduledDate || null)}
                    disabled={scheduledPublishMutation.isPending}
                    data-testid="button-set-scheduled-publish"
                    size="sm"
                  >
                    {scheduledPublishMutation.isPending ? "Setting..." : "Set Schedule"}
                  </Button>
                  {scheduledDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScheduledDate("");
                        scheduledPublishMutation.mutate(null);
                      }}
                      data-testid="button-clear-scheduled-publish"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {property.scheduledPublishAt && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Scheduled:</span>{" "}
                      <span className="font-medium">
                        {format(new Date(property.scheduledPublishAt), "MMM d, yyyy")}
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 m-0 pb-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StickyNote className="h-5 w-5" />
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a private note about this property..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px] text-sm"
                    data-testid="textarea-new-note"
                  />
                  <div className="flex gap-2 justify-between items-center">
                    <Select value={noteType} onValueChange={setNoteType}>
                      <SelectTrigger className="w-[130px]" data-testid="select-note-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => addNoteMutation.mutate({ content: newNote, noteType })}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      data-testid="button-add-note"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  {notes?.data?.map((note: any) => (
                    <div
                      key={note.id}
                      className={`p-3 border rounded-md ${note.is_pinned ? "border-primary/50 bg-primary/5" : "bg-card"}`}
                      data-testid={`note-${note.id}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase tracking-wider font-semibold">
                              {note.note_type}
                            </Badge>
                            {note.is_pinned && (
                              <Pin className="h-3 w-3 text-primary fill-current" />
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {format(new Date(note.created_at), "MMM d, yy")}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90 break-words">{note.content}</p>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => togglePinMutation.mutate({ 
                              noteId: note.id, 
                              isPinned: !note.is_pinned 
                            })}
                            data-testid={`button-pin-note-${note.id}`}
                          >
                            <Pin className={`h-3.5 w-3.5 ${note.is_pinned ? "text-primary fill-current" : "text-muted-foreground"}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive/80" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!notes?.data || notes.data.length === 0) && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        No internal notes found
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}