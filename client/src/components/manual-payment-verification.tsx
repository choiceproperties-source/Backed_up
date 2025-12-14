import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, AlertTriangle, DollarSign, Calendar, FileText, User } from "lucide-react";
import { format } from "date-fns";

interface ManualPaymentVerificationProps {
  applicationId: string;
  applicationFee: number;
  currentPaymentStatus: string;
  paymentAttempts?: Array<{
    referenceId: string;
    timestamp: string;
    status: 'failed' | 'pending' | 'success';
    amount: number;
    errorMessage?: string;
  }>;
  onVerificationComplete?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "money_order", label: "Money Order" },
  { value: "other", label: "Other" },
];

export function ManualPaymentVerification({
  applicationId,
  applicationFee,
  currentPaymentStatus,
  paymentAttempts = [],
  onVerificationComplete,
}: ManualPaymentVerificationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(applicationFee.toString());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 16));
  const [internalNote, setInternalNote] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const isAlreadyVerified = currentPaymentStatus === "paid" || currentPaymentStatus === "manually_verified";

  const verifyPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/applications/${applicationId}/verify-payment`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMethod,
          receivedAt,
          internalNote: internalNote || null,
          confirmationChecked,
        }),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Payment Verified",
        description: `Payment verified successfully. Reference: ${data.data?.referenceId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId, 'payment-verifications'] });
      onVerificationComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "manually_verified":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isAlreadyVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Payment Verified
          </CardTitle>
          <CardDescription>
            The application fee has already been verified for this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {getStatusBadge(currentPaymentStatus)}
            <span className="text-sm text-muted-foreground">
              Application fee: ${applicationFee}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Manual Payment Verification
        </CardTitle>
        <CardDescription>
          Verify application fee payment received through alternative methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {paymentAttempts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Previous Payment Attempts
            </h4>
            <div className="space-y-2">
              {paymentAttempts.map((attempt, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(attempt.status)}
                      <span className="text-sm font-medium">${attempt.amount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(attempt.timestamp), "MMM d, yyyy h:mm a")} - Ref: {attempt.referenceId}
                    </p>
                    {attempt.errorMessage && (
                      <p className="text-xs text-destructive">{attempt.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Separator />
          </div>
        )}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount Received ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              data-testid="input-amount"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod" data-testid="select-payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="receivedAt">Date & Time Received</Label>
            <Input
              id="receivedAt"
              type="datetime-local"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              data-testid="input-received-at"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="internalNote">Internal Note (optional)</Label>
            <Textarea
              id="internalNote"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Add any internal notes about this payment..."
              className="resize-none"
              data-testid="input-internal-note"
            />
          </div>

          <Separator />

          <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <Checkbox
              id="confirmation"
              checked={confirmationChecked}
              onCheckedChange={(checked) => setConfirmationChecked(checked === true)}
              data-testid="checkbox-confirmation"
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="confirmation" className="font-medium cursor-pointer">
                I confirm the application fee has been received
              </Label>
              <p className="text-sm text-muted-foreground">
                By checking this box, you verify that payment of ${amount || "0"} has been received via {paymentMethod || "selected method"}.
              </p>
            </div>
          </div>

          <Button
            onClick={() => verifyPaymentMutation.mutate()}
            disabled={
              verifyPaymentMutation.isPending ||
              !amount ||
              !paymentMethod ||
              !receivedAt ||
              !confirmationChecked
            }
            className="w-full"
            data-testid="button-verify-payment"
          >
            {verifyPaymentMutation.isPending ? "Verifying..." : "Verify Payment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PaymentVerificationHistoryProps {
  applicationId: string;
  isLandlord?: boolean;
}

export function PaymentVerificationHistory({ applicationId, isLandlord = false }: PaymentVerificationHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/applications', applicationId, 'payment-verifications'],
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

  const { verifications = [], paymentAttempts = [], currentStatus, manuallyVerified } = data?.data || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Payment History
        </CardTitle>
        <CardDescription>
          Complete payment verification history for this application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Status:</span>
          {currentStatus === "manually_verified" || currentStatus === "paid" ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <CheckCircle className="w-3 h-3 mr-1" /> Verified
            </Badge>
          ) : currentStatus === "failed" ? (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" /> Failed
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" /> {currentStatus || "Pending"}
            </Badge>
          )}
        </div>

        {verifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Manual Verifications</h4>
            {verifications.map((v: any) => (
              <div key={v.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Verified</Badge>
                      <span className="font-medium">${v.amount}</span>
                      <span className="text-sm text-muted-foreground">via {v.payment_method}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Received: {format(new Date(v.received_at), "MMM d, yyyy h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Verified by: {v.users?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      Ref: {v.reference_id}
                    </p>
                    {isLandlord && v.internal_note && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Note: {v.internal_note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {paymentAttempts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Automated Payment Attempts</h4>
            {paymentAttempts.map((attempt: any, index: number) => (
              <div key={index} className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {attempt.status === "success" ? (
                        <Badge className="bg-green-100 text-green-800">Success</Badge>
                      ) : attempt.status === "failed" ? (
                        <Badge variant="destructive">Failed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      <span className="font-medium">${attempt.amount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(attempt.timestamp), "MMM d, yyyy h:mm a")}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      Ref: {attempt.referenceId}
                    </p>
                    {attempt.errorMessage && (
                      <p className="text-xs text-destructive">{attempt.errorMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {verifications.length === 0 && paymentAttempts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payment history available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
