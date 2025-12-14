import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Copy, Loader2 } from "lucide-react";

interface PropertyTemplate {
  id: string;
  name: string;
  description?: string;
  templateData: Record<string, any>;
  createdAt: string;
}

export function PropertyTemplates() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const { data: templatesResponse, refetch: refetchTemplates } = useQuery<{
    success: boolean;
    data: PropertyTemplate[];
  }>({
    queryKey: ["/api/property-templates"],
  });

  const templates = templatesResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", "/api/property-templates", {
        name: data.name,
        description: data.description,
        templateData: {},
      });
    },
    onSuccess: () => {
      toast({ title: "Template created successfully" });
      setTemplateName("");
      setTemplateDescription("");
      setShowCreateDialog(false);
      refetchTemplates();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("DELETE", `/api/property-templates/${templateId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Template deleted successfully" });
      refetchTemplates();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("POST", `/api/property-templates/${templateId}/use`, {});
    },
    onSuccess: () => {
      toast({ title: "Template copied to clipboard" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to use template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      name: templateName,
      description: templateDescription,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Property Templates</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create templates for quick property listing
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Property Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., 2BR Apartment Standard"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-desc">Description (Optional)</Label>
                <Textarea
                  id="template-desc"
                  placeholder="Describe what this template is for..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  data-testid="textarea-template-description"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
                data-testid="button-save-template"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No templates yet. Create one to speed up property listings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card
              key={template.id}
              data-testid={`card-template-${template.id}`}
            >
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => useTemplateMutation.mutate(template.id)}
                    data-testid={`button-use-template-${template.id}`}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(template.id)}
                    data-testid={`button-delete-template-${template.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
