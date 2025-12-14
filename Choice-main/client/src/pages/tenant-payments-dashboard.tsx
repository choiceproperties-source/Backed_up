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
import { DollarSign, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Payment {
  id: string;
  type: 'rent' | 'security_deposit';
  status: 'pending' | 'paid' | 'overdue' | 'verified';
  amount: number;
  dueDate: string;
  paidDate?: string;
  referenceId: string;
  leaseId?: string;
  applicationId?: string;
}

interface Lease {
  id: string;
  monthlyRent: number;
  securityDepositAmount: number;
  rentDueDay: number;
  leaseStartDate: string;
  leaseEndDate: string;
}

interface Application {
  id: string;
  leaseId: string;
  lease: Lease;
  property: {
    title: string;
    address: string;
  };
}

export default function TenantPaymentsDashboard() {
  useEffect(() => {
    updateMetaTags({
      title: 'Payments - Choice Properties',
      description: 'Manage your rent and security deposit payments.',
      url: 'https://choiceproperties.com/tenant-payments',
    });
  }, []);

  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  const { data: applications, isLoading: appsLoading } = useQuery<Application[]>({
    queryKey: ['/api/applications/tenant'],
  });

  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Fetch payments for all applications
  useEffect(() => {
    if (!applications || applications.length === 0) return;

    const fetchPayments = async () => {
      setIsLoadingPayments(true);
      try {
        const payments: Payment[] = [];
        for (const app of applications) {
          const response = await fetch(`/api/applications/${app.id}/payments`);
          if (response.ok) {
            const data = await response.json();
            if (data.data) {
              payments.push(...data.data);
            }
          }
        }
        setAllPayments(payments);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your payments.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [applications, toast]);

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiRequest(
        `/api/payments/${paymentId}/mark-paid`,
        'POST'
      );
      return response;
    },
    onSuccess: (data, paymentId) => {
      toast({
        title: 'Success',
        description: 'Payment marked as paid.',
      });
      setAllPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, status: 'paid' as const } : p
        )
      );
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark payment as paid. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const createMarkPaidHandler = (paymentId: string) => () => {
    markPaidMutation.mutate(paymentId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400';
      case 'paid':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400';
      case 'pending':
      default:
        return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const upcomingPayments = allPayments.filter((p) => p.status === 'pending').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const paidPayments = allPayments.filter((p) => ['paid', 'verified'].includes(p.status));
  const overduePayments = allPayments.filter((p) => p.status === 'overdue');

  const totalOutstanding = upcomingPayments.reduce((sum, p) => sum + p.amount, 0) + overduePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  if (appsLoading || isLoadingPayments) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading your payments...</div>
        </div>
        <Footer />
      </>
    );
  }

  const hasPayments = allPayments.length > 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Payments</h1>
            <p className="text-muted-foreground">
              Track your rent and security deposit payments
            </p>
          </div>

          {!hasPayments ? (
            <Card className="p-8 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Active Payments</h2>
              <p className="text-muted-foreground">
                You don't have any active payment obligations yet. Once your lease is accepted, your payment schedule will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
                      <p className="text-3xl font-bold">${totalOutstanding.toFixed(2)}</p>
                    </div>
                    {totalOutstanding > 0 && (
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    )}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Paid</p>
                      <p className="text-3xl font-bold">${totalPaid.toFixed(2)}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </Card>
              </div>

              {/* Overdue Alert - Professional & Calm */}
              {overduePayments.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      {overduePayments.length} Payment{overduePayments.length > 1 ? 's' : ''} Due
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      You have ${overduePayments.reduce((s, p) => s + p.amount, 0).toFixed(2)} in payments that are overdue. Please address these at your earliest convenience.
                    </p>
                  </div>
                </div>
              )}

              {/* Upcoming Payments */}
              {upcomingPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Upcoming Payments</h2>
                  <div className="space-y-3">
                    {upcomingPayments.map((payment) => (
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
                            <p className="text-xs text-muted-foreground">
                              Ref: {payment.referenceId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">${payment.amount.toFixed(2)}</p>
                            {payment.status === 'pending' && (
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={createMarkPaidHandler(payment.id)}
                                disabled={markPaidMutation.isPending}
                                data-testid={`button-mark-paid-${payment.id}`}
                              >
                                {markPaidMutation.isPending ? 'Processing...' : 'Mark Paid'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Overdue Payments - Calm Professional Display */}
              {overduePayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Payments Requiring Attention</h2>
                  <div className="space-y-3">
                    {overduePayments.map((payment) => (
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
                                  Overdue
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Due date: {format(new Date(payment.dueDate), 'MMMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Reference: {payment.referenceId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">${payment.amount.toFixed(2)}</p>
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={createMarkPaidHandler(payment.id)}
                              disabled={markPaidMutation.isPending}
                              data-testid={`button-mark-paid-overdue-${payment.id}`}
                            >
                              {markPaidMutation.isPending ? 'Processing...' : 'Mark Paid'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {paidPayments.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Payment History</h2>
                  <div className="space-y-3">
                    {paidPayments.map((payment) => (
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
                                  {payment.status === 'verified' ? 'Verified' : 'Paid'}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Due: {format(new Date(payment.dueDate), 'MMMM dd, yyyy')}
                            </p>
                            {payment.paidDate && (
                              <p className="text-xs text-muted-foreground">
                                Paid: {format(new Date(payment.paidDate), 'MMMM dd, yyyy')}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Ref: {payment.referenceId}
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
