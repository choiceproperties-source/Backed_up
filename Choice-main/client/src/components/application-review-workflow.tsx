import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, MessageSquare, History, ThumbsUp, ThumbsDown, HelpCircle, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface ApplicationReviewWorkflowProps {
  applicationId: string;
  currentStatus: string;
  applicantName: string;
  propertyTitle: string;
  onActionComplete?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100", icon: FileText },
  pending_payment: { label: "Pending Payment", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100", icon: Clock },
  payment_verified: { label: "Payment Verified", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100", icon: CheckCircle },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100", icon: FileText },
  under_review: { label: "Under Review", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100", icon: Clock },
  info_requested: { label: "Info Requested", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", icon: ThumbsUp },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100", icon: ThumbsDown },
  withdrawn: { label: "Withdrawn", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100", icon: XCircle },
};

export function ApplicationReviewWorkflow({
  applicationId,
  currentStatus,
  applicantName,
  propertyTitle,
  onActionComplete,
}: ApplicationReviewWorkflowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [infoRequestDialogOpen, setInfoRequestDialogOpen] = useState(false);
  const [conditionalDialogOpen, setConditionalDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [infoRequestReason, setInfoRequestReason] = useState("");
  const [conditionalReason, setConditionalReason] = useState("");
  const [conditionalRequirements, setConditionalRequirements] = useState<Array<{
    type: 'document' | 'information' | 'verification';
    description: string;
    required: boolean;
  }>>([]);
  const [dueDate, setDueDate] = useState("");
  const [conditionalDueDate, setConditionalDueDate] = useState("");

  const reviewActionMutation = useMutation({
    mutationFn: async (actionData: { action: string; reason?: string; conditionalRequirements?: string; dueDate?: string }) => {
      return apiRequest(`/api/applications/${applicationId}/review-action`, {
        method: "POST",
        body: JSON.stringify(actionData),
      });
    },
    onSuccess: (data: any, variables) => {
      const actionLabels: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        conditional_approve: "conditionally approved",
        request_info: "info requested",
        submit_for_review: "submitted for review",
      };
      toast({
        title: "Action Completed",
        description: `Application has been ${actionLabels[variables.action] || variables.action}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId, 'audit-trail'] });
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
      setInfoRequestDialogOpen(false);
      setConditionalDialogOpen(false);
      setConditionalRequirements([]);
      setConditionalReason("");
      setConditionalDueDate("");
      onActionComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to process action",
        variant: "destructive",
      });
    },
  });

  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const canApprove = ["submitted", "under_review", "info_requested"].includes(currentStatus);
  const canReject = ["submitted", "under_review", "info_requested"].includes(currentStatus);
  const canRequestInfo = ["submitted", "under_review"].includes(currentStatus);
  const canConditionalApprove = ["submitted", "under_review", "info_requested"].includes(currentStatus);
  const isFinalized = ["approved", "rejected", "withdrawn"].includes(currentStatus);

  const addRequirement = () => {
    setConditionalRequirements([
      ...conditionalRequirements,
      { type: 'document', description: '', required: true }
    ]);
  };

  const removeRequirement = (index: number) => {
    setConditionalRequirements(conditionalRequirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const updated = [...conditionalRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setConditionalRequirements(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Application Review
          </span>
          <Badge className={statusConfig.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Review application from {applicantName} for {propertyTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFinalized ? (
          <div className="text-center py-4">
            <StatusIcon className={`w-12 h-12 mx-auto mb-2 ${currentStatus === 'approved' ? 'text-green-600' : currentStatus === 'rejected' ? 'text-red-600' : 'text-gray-600'}`} />
            <p className="text-lg font-medium">Application {statusConfig.label}</p>
            <p className="text-sm text-muted-foreground">No further actions available</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!canApprove || reviewActionMutation.isPending}
                  data-testid="button-approve"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve Application
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Application</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to approve this application from {applicantName}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => reviewActionMutation.mutate({ action: "approve" })}
                    disabled={reviewActionMutation.isPending}
                    data-testid="button-confirm-approve"
                  >
                    {reviewActionMutation.isPending ? "Processing..." : "Confirm Approval"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={infoRequestDialogOpen} onOpenChange={setInfoRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  disabled={!canRequestInfo || reviewActionMutation.isPending}
                  data-testid="button-request-info"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Request Additional Info
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Additional Information</DialogTitle>
                  <DialogDescription>
                    Specify what additional information or documents are required from the applicant.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="infoRequest">Information Required</Label>
                    <Textarea
                      id="infoRequest"
                      value={infoRequestReason}
                      onChange={(e) => setInfoRequestReason(e.target.value)}
                      placeholder="Please provide additional documentation for..."
                      className="min-h-[100px]"
                      data-testid="input-info-request-reason"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Response Due Date (optional)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      data-testid="input-due-date"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInfoRequestDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => reviewActionMutation.mutate({
                      action: "request_info",
                      reason: infoRequestReason,
                      dueDate: dueDate || undefined,
                    })}
                    disabled={!infoRequestReason || reviewActionMutation.isPending}
                    data-testid="button-confirm-request-info"
                  >
                    {reviewActionMutation.isPending ? "Processing..." : "Send Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  disabled={!canReject || reviewActionMutation.isPending}
                  data-testid="button-reject"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Application</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this application. This will be communicated to the applicant.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejectReason">Rejection Reason</Label>
                    <Textarea
                      id="rejectReason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please explain why this application is being rejected..."
                      className="min-h-[100px]"
                      data-testid="input-reject-reason"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => reviewActionMutation.mutate({
                      action: "reject",
                      reason: rejectReason,
                    })}
                    disabled={!rejectReason || reviewActionMutation.isPending}
                    data-testid="button-confirm-reject"
                  >
                    {reviewActionMutation.isPending ? "Processing..." : "Confirm Rejection"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ApplicationAuditTrailProps {
  applicationId: string;
  isLandlord?: boolean;
}

export function ApplicationAuditTrail({ applicationId, isLandlord = false }: ApplicationAuditTrailProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/applications', applicationId, 'audit-trail'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { statusHistory = [], paymentAttempts = [], paymentVerifications = [], comments = [] } = data?.data || {};

  const allEvents = [
    ...statusHistory.map((h: any) => ({
      type: "status",
      timestamp: h.changedAt,
      data: h,
    })),
    ...paymentAttempts.map((p: any) => ({
      type: "payment_attempt",
      timestamp: p.timestamp,
      data: p,
    })),
    ...paymentVerifications.map((v: any) => ({
      type: "payment_verification",
      timestamp: v.created_at,
      data: v,
    })),
    ...(isLandlord ? comments.map((c: any) => ({
      type: "comment",
      timestamp: c.created_at,
      data: c,
    })) : []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getEventIcon = (type: string) => {
    switch (type) {
      case "status":
        return <History className="w-4 h-4" />;
      case "payment_attempt":
        return <AlertCircle className="w-4 h-4" />;
      case "payment_verification":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "comment":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEventContent = (event: any) => {
    switch (event.type) {
      case "status":
        const statusConfig = STATUS_CONFIG[event.data.status] || STATUS_CONFIG.draft;
        return (
          <div>
            <span className="font-medium">Status changed to </span>
            <Badge className={statusConfig.color} size="sm">{statusConfig.label}</Badge>
            {event.data.reason && (
              <p className="text-sm text-muted-foreground mt-1">{event.data.reason}</p>
            )}
          </div>
        );
      case "payment_attempt":
        return (
          <div>
            <span className="font-medium">Payment attempt: </span>
            <Badge variant={event.data.status === "success" ? "default" : "destructive"} size="sm">
              {event.data.status}
            </Badge>
            <span className="text-muted-foreground"> - ${event.data.amount}</span>
            {event.data.errorMessage && (
              <p className="text-sm text-destructive mt-1">{event.data.errorMessage}</p>
            )}
          </div>
        );
      case "payment_verification":
        return (
          <div>
            <span className="font-medium">Manual payment verified: </span>
            <span className="text-green-600">${event.data.amount}</span>
            <span className="text-muted-foreground"> via {event.data.payment_method}</span>
            <p className="text-sm text-muted-foreground">Ref: {event.data.reference_id}</p>
          </div>
        );
      case "comment":
        return (
          <div>
            <span className="font-medium">{event.data.users?.full_name || "Unknown"}: </span>
            <span>{event.data.comment}</span>
          </div>
        );
      default:
        return <span>Unknown event</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Activity History
        </CardTitle>
        <CardDescription>
          Complete timeline of application activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded yet
          </p>
        ) : (
          <div className="space-y-4">
            {allEvents.map((event, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  {getEventContent(event)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.timestamp), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TenantPaymentStatusProps {
  paymentStatus: string;
  paymentAmount: number;
  referenceId?: string;
  verifiedAt?: string;
}

export function TenantPaymentStatus({
  paymentStatus,
  paymentAmount,
  referenceId,
  verifiedAt,
}: TenantPaymentStatusProps) {
  const isVerified = paymentStatus === "paid" || paymentStatus === "manually_verified";
  const isFailed = paymentStatus === "failed";
  const isPending = paymentStatus === "pending";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isVerified ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : isFailed ? (
            <XCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600" />
          )}
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">${paymentAmount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            {isVerified ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </Badge>
            ) : isFailed ? (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" /> Failed
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" /> Pending
              </Badge>
            )}
          </div>
          {referenceId && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono text-sm">{referenceId}</span>
            </div>
          )}
          {verifiedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verified:</span>
              <span className="text-sm">{format(new Date(verifiedAt), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
        {isVerified && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-100">
              Your application fee has been verified. Your application is now under review.
            </p>
          </div>
        )}
        {isFailed && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-100">
              Your payment could not be processed. Please contact the property owner for alternative payment methods.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
