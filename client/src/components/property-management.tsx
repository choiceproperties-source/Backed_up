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
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" data-testid="tab-status">Status</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Listing Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  <Badge className={currentStatus?.color}>
                    {currentStatus?.label || "Unknown"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Change Status</Label>
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
                <Label>Visibility</Label>
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

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Views</span>
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="text-view-count">
                  {analytics?.data?.views || property.viewCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Saves</span>
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="text-save-count">
                  {analytics?.data?.saves || property.saveCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Applications</span>
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="text-application-count">
                  {analytics?.data?.applicationCount || property.applicationCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Listed</span>
                </div>
                <p className="text-sm font-medium mt-2" data-testid="text-listed-date">
                  {property.listedAt 
                    ? format(new Date(property.listedAt), "MMM d, yyyy")
                    : "Not listed"}
                </p>
              </CardContent>
            </Card>
          </div>

          {analytics?.data?.priceHistory && analytics.data.priceHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Price History
                </CardTitle>
              </CardHeader>
              <CardContent>
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

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Expiration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Unpublish</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically unpublish listing after expiration
                  </p>
                </div>
                <Switch
                  checked={property.autoUnpublish ?? true}
                  onCheckedChange={(checked) => expirationMutation.mutate({ autoUnpublish: checked })}
                  data-testid="switch-auto-unpublish"
                />
              </div>

              <div className="space-y-2">
                <Label>Expiration Days</Label>
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
                <div className="p-3 bg-muted rounded-md">
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Update Price
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                Price changes are tracked in history for your records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Publishing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Publish Date (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Set a future date to automatically publish this listing
                </p>
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
                >
                  {scheduledPublishMutation.isPending ? "Setting..." : "Set Schedule"}
                </Button>
                {scheduledDate && (
                  <Button
                    variant="outline"
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
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Scheduled to publish:</span>{" "}
                    <span className="font-medium">
                      {format(new Date(property.scheduledPublishAt), "MMMM d, yyyy")}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a private note about this property..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-new-note"
                />
                <div className="flex gap-2 justify-between items-center">
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="w-[150px]" data-testid="select-note-type">
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
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {notes?.data?.map((note: any) => (
                  <div
                    key={note.id}
                    className={`p-3 border rounded-md ${note.is_pinned ? "border-primary bg-primary/5" : ""}`}
                    data-testid={`note-${note.id}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {note.note_type}
                          </Badge>
                          {note.is_pinned && (
                            <Pin className="h-3 w-3 text-primary" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => togglePinMutation.mutate({ 
                            noteId: note.id, 
                            isPinned: !note.is_pinned 
                          })}
                          data-testid={`button-pin-note-${note.id}`}
                        >
                          <Pin className={`h-4 w-4 ${note.is_pinned ? "text-primary" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {(!notes?.data || notes.data.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notes yet. Add your first note above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}