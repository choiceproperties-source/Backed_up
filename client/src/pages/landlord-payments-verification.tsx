import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { updateMetaTags } from '@/lib/seo';
import { CheckCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Payment {
  id: string;
  type: 'rent' | 'security_deposit';
  status: 'pending' | 'paid' | 'overdue' | 'verified';
  amount: number;
  dueDate: string;
  paidDate?: string;
  referenceId: string;
  propertyTitle?: string;
}

export default function LandlordPaymentsVerification() {
  useEffect(() => {
    updateMetaTags({
      title: 'Verify Payments - Choice Properties',
      description: 'Verify tenant rent and deposit payments.',
      url: 'https://choiceproperties.com/landlord-payments-verification',
    });
  }, []);

  const { isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});
  const [verificationData, setVerificationData] = useState<Record<string, {
    amount: string;
    method: string;
    dateReceived: string;
  }>>({});

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // Fetch payments on mount
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch('/api/applications/landlord');
        if (res.ok) {
          const data = await res.json() as any;
          const applications = Array.isArray(data.data) ? data.data : [];
          const payments: Payment[] = [];

          for (const app of applications) {
            const pRes = await fetch(`/api/applications/${app.id}/payments`);
            if (pRes.ok) {
              const pData = await pRes.json() as any;
              const appPayments = Array.isArray(pData.data) ? pData.data : [];
              payments.push(...appPayments.map((p: any) => ({
                ...p,
                propertyTitle: app.property?.title || 'Unknown Property'
              })));
            }
          }
          setAllPayments(payments);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load payments.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [toast]);

  const verifyMutation = useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      method,
      dateReceived,
    }: {
      paymentId: string;
      amount: string;
      method: string;
      dateReceived: string;
    }) => {
      return await apiRequest(
        `/api/payments/${paymentId}/verify`,
        'POST',
        { amount, method, dateReceived }
      );
    },
    onSuccess: (data: any, variables) => {
      toast({
        title: 'Success',
        description: data.message || 'Payment verified successfully.',
      });
      setOpenDialogs({ ...openDialogs, [variables.paymentId]: false });
      setVerificationData({
        ...verificationData,
        [variables.paymentId]: { amount: '', method: '', dateReceived: '' },
      });
      setAllPayments((prev) =>
        prev.map((p) =>
          p.id === variables.paymentId ? { ...p, status: 'verified' as const } : p
        )
      );
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to verify payment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleVerify = (paymentId: string) => {
    const data = verificationData[paymentId];
    if (!data?.amount || !data?.method || !data?.dateReceived) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }
    verifyMutation.mutate({ paymentId, ...data });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400';
      case 'paid':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400';
      default:
        return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'paid':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoadingPayments) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading payments...</div>
        </div>
        <Footer />
      </>
    );
  }

  const pendingPayments = allPayments.filter((p) => p.status === 'paid' || p.status === 'pending');
  const overduePayments = allPayments.filter((p) => p.status === 'overdue');
  const verifiedPayments = allPayments.filter((p) => p.status === 'verified');

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Verify Payments</h1>
            <p className="text-muted-foreground">
              Review and verify tenant rent and deposit payments
            </p>
          </div>

          {allPayments.length === 0 ? (
            <Card className="p-8 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Payments Found</h2>
              <p className="text-muted-foreground">
                You don't have any payments to verify yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Overdue Rent Section */}
              {overduePayments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold">Overdue Rent</h2>
                    <Badge variant="destructive">{overduePayments.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {overduePayments.map((payment) => (
                      <Card key={payment.id} className="p-4 border-amber-200 dark:border-amber-800">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                {payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit'}
                              </h3>
                              <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400">
                                <span className="inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Overdue
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {payment.propertyTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Was due: {format(new Date(payment.dueDate), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">${payment.amount.toFixed(2)}</p>
                            <Dialog
                              open={openDialogs[payment.id] || false}
                              onOpenChange={(open) =>
                                setOpenDialogs({ ...openDialogs, [payment.id]: open })
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="mt-2"
                                  data-testid={`button-verify-overdue-${payment.id}`}
                                >
                                  Verify
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Verify Overdue Payment</DialogTitle>
                                  <DialogDescription>
                                    {payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit'} - ${payment.amount.toFixed(2)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor={`amount-${payment.id}`}>Amount</Label>
                                    <Input
                                      id={`amount-${payment.id}`}
                                      type="number"
                                      placeholder="0.00"
                                      step="0.01"
                                      value={verificationData[payment.id]?.amount || ''}
                                      onChange={(e) =>
                                        setVerificationData({
                                          ...verificationData,
                                          [payment.id]: {
                                            ...verificationData[payment.id],
                                            amount: e.target.value,
                                          },
                                        })
                                      }
                                      data-testid={`input-amount-overdue-${payment.id}`}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`method-${payment.id}`}>Payment Method</Label>
                                    <Select
                                      value={verificationData[payment.id]?.method || ''}
                                      onValueChange={(value) =>
                                        setVerificationData({
                                          ...verificationData,
                                          [payment.id]: {
                                            ...verificationData[payment.id],
                                            method: value,
                                          },
                                        })
                                      }
                                    >
                                      <SelectTrigger
                                        id={`method-${payment.id}`}
                                        data-testid={`select-method-overdue-${payment.id}`}
                                      >
                                        <SelectValue placeholder="Select method" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="check">Check</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                                        <SelectItem value="money_order">Money Order</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`date-${payment.id}`}>Date Received</Label>
                                    <Input
                                      id={`date-${payment.id}`}
                                      type="date"
                                      value={verificationData[payment.id]?.dateReceived || ''}
                                      onChange={(e) =>
                                        setVerificationData({
                                          ...verificationData,
                                          [payment.id]: {
                                            ...verificationData[payment.id],
                                            dateReceived: e.target.value,
                                          },
                                        })
                                      }
                                      data-testid={`input-date-overdue-${payment.id}`}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleVerify(payment.id)}
                                    disabled={verifyMutation.isPending}
                                    className="w-full"
                                    data-testid={`button-confirm-overdue-${payment.id}`}
                                  >
                                    {verifyMutation.isPending ? 'Verifying...' : 'Confirm Verification'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {pendingPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Awaiting Verification</h2>
                  <div className="space-y-3">
                    {pendingPayments.map((payment) => (
                      <Card key={payment.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                {payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit'}
                              </h3>
                              <Badge className={getStatusColor(payment.status)}>
                                <span className="inline-flex items-center gap-1">
                                  {getStatusIcon(payment.status)}
                                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Due: {format(new Date(payment.dueDate), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold mb-2">${payment.amount.toFixed(2)}</p>
                            <Dialog
                              open={openDialogs[payment.id] || false}
                              onOpenChange={(open) =>
                                setOpenDialogs({ ...openDialogs, [payment.id]: open })
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  data-testid={`button-verify-payment-${payment.id}`}
                                >
                                  Verify
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Verify Payment</DialogTitle>
                                  <DialogDescription>
                                    {payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit'} - ${payment.amount.toFixed(2)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor={`amount-${payment.id}`}>Amount</Label>
                                    <Input
                                      id={`amount-${payment.id}`}
                                      type="number"
                                      placeholder="0.00"
                                      step="0.01"
                                      value={verificationData[payment.id]?.amount || ''}
                                      onChange={(e) =>
                                        setVerificationData({
                                          ...verificationData,
                                          [payment.id]: {
                                            ...verificationData[payment.id],
                                            amount: e.target.value,
                                          },
                                        })
                                      }
                                      data-testid={`input-amount-${payment.id}`}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`method-${payment.id}`}>Payment Method</Label>
                                    <Select
                                      value={verificationData[payment.id]?.method || ''}
                                      onValueChange={(value) =>
                                        setVerificationData({
                                          ...verificationData,
                                          [payment.id]: {
                                            ...verificationData[payment.id],
                                            method: value,
                                          },
                                        })
                                      }
                                    >
                                      <SelectTrigger
                                        id={`method-${payment.id}`}
                                        data-testid={`select-method-${payment.id}`}
                                      >
                                        <SelectValue placeholder="Select method" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="check">Check</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                                        <SelectItem value="money_order">Money Order</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor={`date-${payment.id}`}>Date Received</Label>
                                    <Input
                                      id={`date-${payment.id}`}
                                      type="date"
                                      value={verificationData[payment.id]?.dateReceived || ''}
                                      onChange={(e) =>
                                        setVerificationData({
                                          ...verificationData,
                                          [payment.id]: {
                                            ...verificationData[payment.id],
                                            dateReceived: e.target.value,
                                          },
                                        })
                                      }
                                      data-testid={`input-date-${payment.id}`}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleVerify(payment.id)}
                                    disabled={verifyMutation.isPending}
                                    className="w-full"
                                    data-testid={`button-confirm-verify-${payment.id}`}
                                  >
                                    {verifyMutation.isPending ? 'Verifying...' : 'Confirm Verification'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {verifiedPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Verified Payments</h2>
                  <div className="space-y-3">
                    {verifiedPayments.map((payment) => (
                      <Card key={payment.id} className="p-4 opacity-75">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-muted-foreground">
                                {payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit'}
                              </h3>
                              <Badge className={getStatusColor(payment.status)}>
                                <span className="inline-flex items-center gap-1">
                                  {getStatusIcon(payment.status)}
                                  Verified
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(new Date(payment.dueDate), 'MMMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">${payment.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
