import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Mail, Phone, User, Trash2, Clock, CheckCircle, XCircle, Send, Loader2, Users, AlertCircle } from "lucide-react";

const coApplicantSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
  relationship: z.string().min(1, "Please select a relationship type"),
});

type CoApplicantFormValues = z.infer<typeof coApplicantSchema>;

interface CoApplicant {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  relationship: string;
  status: 'pending' | 'verified' | 'rejected';
  invitedAt: string;
  respondedAt?: string;
}

interface CoApplicantFormProps {
  applicationId: string;
  coApplicants: CoApplicant[];
  onCoApplicantAdded?: (coApplicant: CoApplicant) => void;
  onCoApplicantRemoved?: (id: string) => void;
  maxCoApplicants?: number;
  readonly?: boolean;
}

const relationshipOptions = [
  { value: "spouse", label: "Spouse / Partner" },
  { value: "roommate", label: "Roommate" },
  { value: "family", label: "Family Member" },
  { value: "friend", label: "Friend" },
  { value: "guarantor", label: "Guarantor / Co-Signer" },
  { value: "other", label: "Other" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Invitation Sent", variant: "secondary", icon: Clock },
  verified: { label: "Verified", variant: "default", icon: CheckCircle },
  rejected: { label: "Declined", variant: "destructive", icon: XCircle },
};

export function CoApplicantForm({
  applicationId,
  coApplicants = [],
  onCoApplicantAdded,
  onCoApplicantRemoved,
  maxCoApplicants = 3,
  readonly = false
}: CoApplicantFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CoApplicantFormValues>({
    resolver: zodResolver(coApplicantSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      relationship: "",
    },
  });

  const handleSubmit = async (data: CoApplicantFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/applications/${applicationId}/co-applicants`,
        data
      );
      
      const result = await response.json();
      
      toast({
        title: "Co-applicant invited",
        description: `An invitation has been sent to ${data.email}`,
      });
      
      form.reset();
      setIsDialogOpen(false);
      
      if (onCoApplicantAdded) {
        onCoApplicantAdded(result.data);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add co-applicant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (coApplicantId: string) => {
    setIsRemoving(coApplicantId);
    try {
      await apiRequest(
        "DELETE",
        `/api/applications/${applicationId}/co-applicants/${coApplicantId}`
      );
      
      toast({
        title: "Co-applicant removed",
        description: "The co-applicant has been removed from your application.",
      });
      
      if (onCoApplicantRemoved) {
        onCoApplicantRemoved(coApplicantId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove co-applicant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleResendInvite = async (coApplicantId: string, email: string) => {
    setIsResending(coApplicantId);
    try {
      await apiRequest(
        "POST",
        `/api/applications/${applicationId}/co-applicants/${coApplicantId}/resend`
      );
      
      toast({
        title: "Invitation resent",
        description: `A new invitation has been sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(null);
    }
  };

  const canAddMore = coApplicants.length < maxCoApplicants;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Co-Applicants</h3>
          <Badge variant="outline" className="ml-2">
            {coApplicants.length}/{maxCoApplicants}
          </Badge>
        </div>
        
        {!readonly && canAddMore && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-co-applicant">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Co-Applicant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Co-Applicant</DialogTitle>
                <DialogDescription>
                  Enter the details of the person you want to add to your application. They will receive an email invitation to complete their portion.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            data-testid="input-co-applicant-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john@example.com" 
                            data-testid="input-co-applicant-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          An invitation will be sent to this email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="(555) 123-4567" 
                            data-testid="input-co-applicant-phone"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-co-applicant-relationship">
                              <SelectValue placeholder="Select relationship type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {relationshipOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      data-testid="button-submit-co-applicant"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {/* Co-Applicants List */}
      {coApplicants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              No co-applicants added yet
            </p>
            <p className="text-xs text-muted-foreground">
              {readonly 
                ? "No co-applicants were added to this application"
                : "Add a spouse, roommate, or guarantor to strengthen your application"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coApplicants.map((coApplicant) => {
            const status = statusConfig[coApplicant.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const relationship = relationshipOptions.find(r => r.value === coApplicant.relationship);
            
            return (
              <Card key={coApplicant.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate" data-testid={`text-co-applicant-name-${coApplicant.id}`}>
                            {coApplicant.fullName}
                          </h4>
                          <Badge variant={status.variant} className="shrink-0">
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {coApplicant.email}
                          </span>
                          {coApplicant.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {coApplicant.phone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {relationship?.label || coApplicant.relationship}
                          {coApplicant.invitedAt && (
                            <span className="ml-2">
                              · Invited {new Date(coApplicant.invitedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {!readonly && (
                      <div className="flex items-center gap-2 shrink-0">
                        {coApplicant.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResendInvite(coApplicant.id, coApplicant.email)}
                            disabled={isResending === coApplicant.id}
                            data-testid={`button-resend-invite-${coApplicant.id}`}
                          >
                            {isResending === coApplicant.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Resend
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemove(coApplicant.id)}
                          disabled={isRemoving === coApplicant.id}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-co-applicant-${coApplicant.id}`}
                        >
                          {isRemoving === coApplicant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Info Box */}
      {!readonly && coApplicants.length > 0 && coApplicants.some(c => c.status === 'pending') && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Co-applicants with pending status need to complete their verification before your application can be fully processed.
          </p>
        </div>
      )}
    </div>
  );
}
