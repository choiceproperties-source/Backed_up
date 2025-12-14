import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { updateMetaTags } from '@/lib/seo';
import { CheckCircle, Clock, AlertTriangle, DollarSign, Download } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentRecord {
  id: string;
  type: 'rent' | 'security_deposit';
  status: 'pending' | 'paid' | 'overdue' | 'verified';
  amount: number;
  due_date: string;
  paid_at?: string;
  verified_at?: string;
  reference_id: string;
  created_at: string;
  verified_by_user?: { full_name: string };
}

interface LeaseData {
  id: string;
  property: { title: string; address: string };
  monthlyRent: number;
  securityDepositAmount: number;
}

interface PaymentHistoryData {
  lease: LeaseData;
  payments: PaymentRecord[];
  summary: {
    totalPayments: number;
    verified: number;
    paid: number;
    pending: number;
    overdue: number;
    totalVerifiedAmount: number;
    totalOutstandingAmount: number;
  };
}

export default function LandlordPaymentHistory() {
  useEffect(() => {
    updateMetaTags({
      title: 'Payment History - Choice Properties',
      description: 'View detailed payment history for a lease.',
      url: 'https://choiceproperties.com/landlord-payment-history',
    });
  }, []);

  const { isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { leaseId } = useParams<{ leaseId: string }>();
  const { toast } = useToast();

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  const { data: historyData, isLoading } = useQuery<PaymentHistoryData>({
    queryKey: [`/api/leases/${leaseId}/payment-history`],
  });

  const downloadReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`);
      if (!response.ok) throw new Error('Failed to download receipt');
      
      const data = await response.json();
      const receipt = data.data;
      
      const content = `
PAYMENT RECEIPT
===============
Receipt Number: ${receipt.receiptNumber}
Payment ID: ${receipt.paymentId}

PROPERTY
--------
${receipt.property.title}
${receipt.property.address}

PAYMENT DETAILS
---------------
Type: ${receipt.type}
Amount: $${receipt.amount.toFixed(2)}
Status: ${receipt.status}
Reference ID: ${receipt.referenceId}

DATES
-----
Due Date: ${receipt.dueDate ? format(new Date(receipt.dueDate), 'MMMM dd, yyyy') : 'N/A'}
Paid Date: ${receipt.paidDate ? format(new Date(receipt.paidDate), 'MMMM dd, yyyy') : 'N/A'}
Verified Date: ${receipt.verificationDate ? format(new Date(receipt.verificationDate), 'MMMM dd, yyyy') : 'N/A'}

TENANT
------
Name: ${receipt.tenant.name}
Email: ${receipt.tenant.email}

VERIFICATION
------------
Verified By: ${receipt.verifiedBy}

Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}
      `;

      const element = document.createElement('a');
      element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
      element.setAttribute('download', `receipt-${receipt.receiptNumber}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: 'Success',
        description: 'Receipt downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download receipt.',
        variant: 'destructive',
      });
    }
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

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading payment history...</div>
        </div>
        <Footer />
      </>
    );
  }

  if (!historyData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background py-12">
          <div className="container max-w-6xl mx-auto px-4">
            <Card className="p-8 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Payment History Found</h2>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const { lease, payments, summary } = historyData;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4">
              <Button variant="outline" onClick={() => navigate('/landlord-lease-dashboard')}>
                ← Back to Leases
              </Button>
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment History</h1>
            <p className="text-muted-foreground">
              {lease.property.title} • {lease.property.address}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Verified</p>
                  <p className="text-2xl font-bold">${summary.totalVerifiedAmount.toFixed(2)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{summary.verified} payments</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
                  <p className="text-2xl font-bold">${summary.totalOutstandingAmount.toFixed(2)}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{summary.pending + summary.overdue} payments</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Payments</p>
                  <p className="text-2xl font-bold">{summary.totalPayments}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">All time</p>
            </Card>
          </div>

          {/* Payment Records */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold mb-4">All Payments</h2>
            {payments.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No payments recorded yet.</p>
              </Card>
            ) : (
              payments.map((payment) => (
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
                      <p className="text-sm text-muted-foreground mb-1">
                        Due: {format(new Date(payment.due_date), 'MMMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        Ref: {payment.reference_id}
                      </p>
                      {payment.verified_by_user && (
                        <p className="text-xs text-muted-foreground">
                          Verified by: {payment.verified_by_user.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold">${payment.amount.toFixed(2)}</p>
                      {['verified', 'paid'].includes(payment.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReceipt(payment.id)}
                          className="gap-1"
                          data-testid={`button-download-receipt-${payment.id}`}
                        >
                          <Download className="w-3 h-3" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
