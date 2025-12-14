import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, DollarSign, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SecurityDepositStatusProps {
  applicationId: string;
  userRole: "tenant" | "landlord" | "admin";
}

interface DepositStatusData {
  required: boolean;
  leaseStatus: string;
  securityDepositAmount?: string;
  payment?: {
    id: string;
    amount: string;
    status: "pending" | "paid" | "overdue" | "verified";
    due_date: string;
    paid_at?: string;
    verified_at?: string;
    verified_by?: string;
  };
  message: string;
}

export function SecurityDepositStatus({ applicationId, userRole }: SecurityDepositStatusProps) {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<{ data: DepositStatusData }>({
    queryKey: ["/api/applications", applicationId, "security-deposit"],
    enabled: !!applicationId,
  });

  const verifyMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiRequest("POST", `/api/payments/${paymentId}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "security-deposit"] });
      toast({
        title: "Payment Verified",
        description: "Security deposit has been verified successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Verification Failed",
        description: err.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiRequest("POST", `/api/payments/${paymentId}/mark-paid`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "security-deposit"] });
      toast({
        title: "Payment Submitted",
        description: "Payment has been marked as paid. Awaiting landlord verification.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to mark payment as paid",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-security-deposit-loading">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const depositStatus = data.data;

  if (!depositStatus?.required) {
    return null;
  }

  const payment = depositStatus.payment;
  const amount = depositStatus.securityDepositAmount
    ? parseFloat(depositStatus.securityDepositAmount).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "N/A";

  const getStatusBadge = () => {
    if (!payment) {
      return <Badge variant="secondary">Not Created</Badge>;
    }
    switch (payment.status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case "paid":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Paid - Awaiting Verification</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "verified":
        return <Badge variant="default" className="bg-green-600">Verified</Badge>;
      default:
        return <Badge variant="secondary">{payment.status}</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!payment) return <Clock className="h-5 w-5 text-muted-foreground" />;
    switch (payment.status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "paid":
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card data-testid="card-security-deposit-status">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <CardTitle className="text-lg" data-testid="text-security-deposit-title">Security Deposit</CardTitle>
          <CardDescription data-testid="text-security-deposit-description">
            {userRole === "tenant" ? "Your security deposit status" : "Tenant security deposit status"}
          </CardDescription>
        </div>
        {getStatusBadge()}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <div>
                <p className="font-medium" data-testid="text-deposit-amount">Amount: {amount}</p>
                {payment?.due_date && (
                  <p className="text-sm text-muted-foreground" data-testid="text-deposit-due-date">
                    Due: {format(new Date(payment.due_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {payment?.paid_at && (
            <p className="text-sm text-muted-foreground" data-testid="text-deposit-paid-at">
              Paid on: {format(new Date(payment.paid_at), "MMM d, yyyy")}
            </p>
          )}

          {payment?.verified_at && (
            <p className="text-sm text-green-600" data-testid="text-deposit-verified-at">
              Verified on: {format(new Date(payment.verified_at), "MMM d, yyyy")}
            </p>
          )}

          {/* Tenant actions */}
          {userRole === "tenant" && payment && payment.status === "pending" && (
            <Button
              onClick={() => markPaidMutation.mutate(payment.id)}
              disabled={markPaidMutation.isPending}
              data-testid="button-mark-deposit-paid"
            >
              {markPaidMutation.isPending ? "Submitting..." : "Mark as Paid"}
            </Button>
          )}

          {/* Landlord/Admin actions */}
          {(userRole === "landlord" || userRole === "admin") && payment && payment.status === "paid" && (
            <Button
              onClick={() => verifyMutation.mutate(payment.id)}
              disabled={verifyMutation.isPending}
              data-testid="button-verify-deposit"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify Payment"}
            </Button>
          )}

          {!payment && (
            <p className="text-sm text-muted-foreground" data-testid="text-deposit-not-created">
              Security deposit payment record will be created after lease acceptance.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
