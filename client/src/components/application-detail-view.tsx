import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-context';
import {
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Home,
  DollarSign,
  Users,
  MessageSquare,
  Bell,
  Calendar,
  ChevronRight,
  Loader2,
  Star,
} from 'lucide-react';

// Application status badge colors
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  under_review: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  pending_verification: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  approved_pending_lease: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
  rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  withdrawn: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  expired: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

// Rejection categories
const rejectionCategories = [
  { value: 'income', label: 'Insufficient Income' },
  { value: 'credit', label: 'Credit Issues' },
  { value: 'rental_history', label: 'Rental History Concerns' },
  { value: 'background_check', label: 'Background Check Failed' },
  { value: 'incomplete_application', label: 'Incomplete Application' },
  { value: 'documents', label: 'Missing/Invalid Documents' },
  { value: 'other', label: 'Other' },
];

interface ScoreBreakdown {
  incomeScore: number;
  creditScore: number;
  rentalHistoryScore: number;
  employmentScore: number;
  documentsScore: number;
  totalScore: number;
  maxScore: number;
  flags: string[];
}

interface StatusHistoryItem {
  status: string;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

interface CoApplicant {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  relationship: string;
  monthlyIncome?: number;
}

interface ApplicationComment {
  id: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
  users?: { id: string; fullName: string };
}

interface ApplicationNotification {
  id: string;
  notificationType: string;
  subject: string;
  status: string;
  createdAt: string;
  sentAt?: string;
}

interface ApplicationData {
  id: string;
  userId: string;
  propertyId: string;
  status: string;
  previousStatus?: string;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  statusHistory?: StatusHistoryItem[];
  personalInfo?: any;
  employment?: any;
  rentalHistory?: any;
  documents?: any;
  documentStatus?: any;
  rejectionCategory?: string;
  rejectionReason?: string;
  rejectionDetails?: any;
  createdAt: string;
  expiresAt?: string;
  reviewedAt?: string;
  users?: { id: string; fullName: string; email: string; phone?: string };
  properties?: { id: string; title: string };
  coApplicants?: CoApplicant[];
  comments?: ApplicationComment[];
  notifications?: ApplicationNotification[];
}

interface ApplicationDetailViewProps {
  application: ApplicationData;
  onClose?: () => void;
  onStatusChange?: () => void;
  defaultTab?: string;
}

export function ApplicationDetailView({
  application,
  onClose,
  onStatusChange,
  defaultTab = "overview",
}: ApplicationDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [rejectionCategory, setRejectionCategory] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  
  const isApplicant = user?.id === application.userId;
  const isOwner = user?.role === 'landlord' || user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const isAdminOrOwner = isAdmin || isOwner;
  const canWithdraw = isApplicant && ['draft', 'pending', 'under_review', 'pending_verification', 'payment_requested'].includes(application.status);
  const canRecalculateScore = isAdminOrOwner && !isApplicant;
  const canReview = isAdminOrOwner && ['under_review', 'payment_completed'].includes(application.status);

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      options,
    }: {
      status: string;
      options?: any;
    }) => {
      return apiRequest('PATCH', `/api/v2/applications/${application.id}/status`, { status, ...options });
    },
    onSuccess: () => {
      toast({ title: 'Status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/applications'] });
      onStatusChange?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/applications/${application.id}/comments`, {
        content: newComment,
        isInternal: isInternalComment,
      });
    },
    onSuccess: () => {
      toast({ title: 'Comment added' });
      setNewComment('');
      queryClient.invalidateQueries({
        queryKey: ['/api/v2/applications', application.id],
      });
    },
    onError: () => {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    },
  });

  // Recalculate score mutation
  const scoreMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/applications/${application.id}/score`);
    },
    onSuccess: () => {
      toast({ title: 'Score recalculated' });
      queryClient.invalidateQueries({
        queryKey: ['/api/v2/applications', application.id],
      });
      onStatusChange?.();
    },
    onError: () => {
      toast({ title: 'Failed to recalculate score', variant: 'destructive' });
    },
  });

  const handleApprove = () => {
    statusMutation.mutate({ status: 'approved' });
  };

  const handleReject = () => {
    statusMutation.mutate({
      status: 'rejected',
      options: {
        rejectionCategory,
        rejectionReason,
        rejectionDetails: {
          categories: [rejectionCategory],
          explanation: rejectionReason,
          appealable: rejectionCategory !== 'background_check',
        },
      },
    });
    setShowRejectDialog(false);
  };

  const handleStartReview = () => {
    statusMutation.mutate({ status: 'under_review' });
  };

  const handleRequestVerification = () => {
    statusMutation.mutate({ status: 'pending_verification' });
  };

  const handleWithdraw = () => {
    statusMutation.mutate({ 
      status: 'withdrawn',
      options: {
        reason: withdrawReason || 'Applicant withdrew application',
      },
    });
    setShowWithdrawDialog(false);
    setWithdrawReason('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const scoreBreakdown = application.scoreBreakdown;
  const scorePercentage = scoreBreakdown
    ? Math.round((scoreBreakdown.totalScore / scoreBreakdown.maxScore) * 100)
    : 0;

  const auditData = application as any;
  const { statusHistory = [] } = auditData || {};

  return (
    <div className="space-y-6">
      {application.status === 'payment_requested' && (
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-100 dark:border-blue-900 mb-6">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-semibold mb-2">
            <DollarSign className="h-5 w-5" />
            <span>Payment Requested</span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            The landlord has requested a payment for {application.personalInfo?.firstName}'s application.
          </p>
          <div className="flex gap-2">
            <Button 
              data-testid="button-pay-fee"
              onClick={() => onStatusChange?.()}
              disabled={!!(application as any).paymentRequest?.payment_intent_id}
            >
              {(application as any).paymentRequest?.payment_intent_id ? 'Payment Processing...' : 'Pay Application Fee'}
            </Button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-1" data-testid="text-applicant-name">
            {application.users?.fullName || 'Applicant'}
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs" data-testid="text-applicant-email">
            {application.users?.email}
          </p>
          {application.users?.phone && (
            <p className="text-muted-foreground text-sm mt-1">{application.users.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
            <Badge className={cn(statusColors[application.status], "font-bold uppercase tracking-widest text-[10px]")} data-testid="badge-application-status">
              {formatStatusLabel(application.status)}
            </Badge>
          {application.expiresAt && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <Clock className="h-3 w-3 mr-1" />
              Expires {formatDate(application.expiresAt)}
            </Badge>
          )}
        </div>
      </div>

      {/* Score Card */}
      {scoreBreakdown ? (
        <Card className="p-8 rounded-xl shadow-sm border-border/50" data-testid="card-score-breakdown">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Application Score
            </h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 uppercase tracking-widest text-[10px] font-bold">
                Market Average: 72
              </Badge>
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 uppercase tracking-widest text-[10px] font-bold">
                Top 15%
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-foreground">
                {scoreBreakdown.totalScore}
              </span>
              <span className="text-muted-foreground">/ {scoreBreakdown.maxScore}</span>
              {canRecalculateScore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => scoreMutation.mutate()}
                  disabled={scoreMutation.isPending}
                  data-testid="button-recalculate-score"
                >
                  {scoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Recalculate'
                  )}
                </Button>
              )}
            </div>
          </div>

          <Progress value={scorePercentage} className="h-3 mb-6" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { label: 'Income', value: scoreBreakdown.incomeScore, max: 25, icon: DollarSign, color: 'text-emerald-500' },
              { label: 'Credit', value: scoreBreakdown.creditScore, max: 25, icon: TrendingUp, color: 'text-blue-500' },
              { label: 'Rental History', value: scoreBreakdown.rentalHistoryScore, max: 20, icon: Home, color: 'text-amber-500' },
              { label: 'Employment', value: scoreBreakdown.employmentScore, max: 15, icon: Briefcase, color: 'text-purple-500' },
              { label: 'Documents', value: scoreBreakdown.documentsScore, max: 15, icon: FileText, color: 'text-indigo-500' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-xl bg-muted/30 border border-border/20 transition-all hover:bg-muted/50">
                <item.icon className={cn("h-6 w-6 mx-auto mb-2 opacity-80", item.color)} />
                <p className="uppercase tracking-widest text-[9px] font-bold text-muted-foreground mb-1">{item.label}</p>
                <p className="text-xl font-bold text-foreground">
                  {item.value}
                  <span className="text-[10px] text-muted-foreground font-medium ml-0.5">/ {item.max}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Only show flags to admins/owners */}
          {!isApplicant && scoreBreakdown.flags && scoreBreakdown.flags.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Flags:</p>
              <div className="flex gap-2 flex-wrap">
                {scoreBreakdown.flags.map((flag) => (
                  <Badge key={flag} variant="outline" className="text-orange-600 border-orange-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {flag.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* Score Pending Section - only show after application is submitted */
        application.status !== 'draft' && (
          <Card className="p-6" data-testid="card-score-pending">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-foreground">Application Score</h3>
                <p className="text-sm text-muted-foreground">
                  {isApplicant 
                    ? "Your application score will be available after the property manager reviews your submission."
                    : "Score not yet calculated. Click 'Calculate Score' to generate the application score."}
                </p>
              </div>
              {canRecalculateScore && (
                <Button
                  size="sm"
                  onClick={() => scoreMutation.mutate()}
                  disabled={scoreMutation.isPending}
                  className="ml-auto"
                  data-testid="button-calculate-score"
                >
                  {scoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Calculate Score
                </Button>
              )}
            </div>
          </Card>
        )
      )}

      {/* Action Buttons */}
      {canReview && (
        <Card className="p-4" data-testid="card-actions">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleApprove}
              disabled={statusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Application
            </Button>
            
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" data-testid="button-reject-open">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Application</DialogTitle>
                  <DialogDescription>
                    Please select a reason category and provide additional details for the rejection.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Rejection Category</label>
                    <Select value={rejectionCategory} onValueChange={setRejectionCategory}>
                      <SelectTrigger data-testid="select-rejection-category">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {rejectionCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Additional Explanation</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Why is this application being rejected?"
                      data-testid="textarea-rejection-reason"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectionCategory || statusMutation.isPending}
                    data-testid="button-confirm-reject"
                  >
                    {statusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm Rejection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      )}

      {/* Applicant Withdrawal Section */}
      {canWithdraw && (
        <Card className="p-4" data-testid="card-applicant-actions">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-medium text-foreground">Withdraw Application</h4>
              <p className="text-sm text-muted-foreground">
                You can withdraw your application if you no longer wish to proceed.
              </p>
            </div>
            <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-orange-600 border-orange-300" data-testid="button-withdraw">
                  <XCircle className="h-4 w-4 mr-2" />
                  Withdraw Application
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to withdraw this application? This action cannot be undone.
                    You may need to submit a new application if you change your mind.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
                  <Textarea
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    placeholder="Why are you withdrawing this application?"
                    data-testid="textarea-withdraw-reason"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleWithdraw}
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={statusMutation.isPending}
                    data-testid="button-confirm-withdraw"
                  >
                    {statusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Confirm Withdrawal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      )}

      {/* Withdrawn Status Info */}
      {application.status === 'withdrawn' && (
        <Card className="p-4 border-l-4 border-orange-500" data-testid="card-withdrawn-info">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-orange-500" />
            Application Withdrawn
          </h4>
          <p className="text-sm text-muted-foreground">
            This application was withdrawn and is no longer being considered.
          </p>
        </Card>
      )}

      {/* Rejection Details */}
      {application.status === 'rejected' && application.rejectionDetails && (
        <Card className="p-4 border-l-4 border-red-500" data-testid="card-rejection-details">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Rejection Details
          </h4>
          <p className="text-sm text-muted-foreground">
            <strong>Category:</strong>{' '}
            {rejectionCategories.find((c) => c.value === application.rejectionCategory)?.label ||
              application.rejectionCategory}
          </p>
          {application.rejectionReason && (
            <p className="text-sm mt-2">{application.rejectionReason}</p>
          )}
          {application.rejectionDetails?.appealable && (
            <Badge variant="outline" className="mt-2">
              Appealable
            </Badge>
          )}
        </Card>
      )}

      {/* Accordion sections */}
      <Accordion type="multiple" defaultValue={[defaultTab === "documents" ? "documents" : defaultTab === "review" ? "status-history" : "personal", "status-history"]} className="space-y-4">
        <AccordionItem value="documents" data-testid="accordion-documents" className="border rounded-xl px-2 shadow-sm bg-card/50 overflow-visible">
          <AccordionTrigger className="px-4 py-6 hover:no-underline group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">Documents</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
            <div className="space-y-3 p-4 bg-muted/30 border border-dashed rounded-lg">
              {['id', 'proof_of_income', 'employment_verification', 'bank_statements'].map((docType) => {
                const doc = application.documentStatus?.[docType] || application.documents?.[docType];
                const uploaded = doc?.uploaded || !!doc;
                const verified = doc?.verified || false;
                return (
                  <div key={docType} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-md transition-colors">
                    <span className="text-sm font-medium capitalize">{docType.replace(/_/g, ' ')}</span>
                    <div className="flex gap-2">
                      <Badge variant={uploaded ? 'default' : 'outline'} className="text-[10px] uppercase tracking-widest font-bold">
                        {uploaded ? 'Uploaded' : 'Missing'}
                      </Badge>
                      {uploaded && (
                        <Badge variant={verified ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-widest font-bold">
                          {verified ? 'Verified' : 'Pending'}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Personal Info */}
        <AccordionItem value="personal" className="border rounded-xl px-2 shadow-sm bg-card/50 overflow-visible">
          <AccordionTrigger className="px-4 py-6 hover:no-underline group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">Personal Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted/30 rounded-xl border border-border/20">
              {application.personalInfo ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Full Name</p>
                    <p className="font-semibold text-foreground">{application.personalInfo.fullName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Date of Birth</p>
                    <p className="font-semibold text-foreground">{application.personalInfo.dateOfBirth || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">SSN Provided</p>
                    <p className="font-semibold text-foreground">{application.personalInfo.ssn ? 'Yes (Encrypted)' : 'No'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Phone</p>
                    <p className="font-semibold text-foreground">{application.personalInfo.phone || 'N/A'}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground col-span-4 italic text-center py-4">No personal information provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Employment Info */}
        <AccordionItem value="employment" className="border rounded-xl px-2 shadow-sm bg-card/50 overflow-visible">
          <AccordionTrigger className="px-4 py-6 hover:no-underline group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">Employment</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted/30 rounded-xl border border-border/20">
              {application.employment ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Employer</p>
                    <p className="font-semibold text-foreground">{application.employment.employer || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Position</p>
                    <p className="font-semibold text-foreground">{application.employment.position || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Monthly Income</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${(application.employment.monthlyIncome || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Years Employed</p>
                    <p className="font-semibold text-foreground">{application.employment.yearsEmployed || 0} years</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground col-span-4 italic text-center py-4">No employment information provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rental History */}
        <AccordionItem value="rental-history" className="border rounded-xl px-2 shadow-sm bg-card/50 overflow-visible">
          <AccordionTrigger className="px-4 py-6 hover:no-underline group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
                <Home className="h-5 w-5" />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">Rental History</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-6 p-6 bg-muted/30 rounded-xl border border-border/20">
              {application.rentalHistory ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Current Address</p>
                    <p className="font-semibold text-foreground">{application.rentalHistory.currentAddress || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Landlord Name</p>
                    <p className="font-semibold text-foreground">{application.rentalHistory.landlordName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Years Renting</p>
                    <p className="font-semibold text-foreground">{application.rentalHistory.yearsRenting || 0} years</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Previous Eviction</p>
                    <p className="font-bold">
                      {application.rentalHistory.hasEviction ? (
                        <span className="text-red-600 uppercase tracking-widest">Yes</span>
                      ) : (
                        <span className="text-emerald-600 uppercase tracking-widest">No</span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground col-span-2 italic text-center py-4">No rental history provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Status History */}
        <AccordionItem value="status-history" className="border rounded-xl px-2 shadow-sm bg-card/50 overflow-visible">
          <AccordionTrigger className="px-4 py-6 hover:no-underline group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10 text-slate-600 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <span className="font-bold uppercase tracking-widest text-xs">Status History</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 pt-0">
            <div className="space-y-4 p-4">
              {application.statusHistory && application.statusHistory.length > 0 ? (
                application.statusHistory.map((entry, index) => (
                  <div key={index} className="flex items-start gap-4 relative">
                    {index !== application.statusHistory!.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-[-16px] w-[2px] bg-border/50" />
                    )}
                    <div className="w-4 h-4 rounded-full bg-primary border-4 border-background mt-1 z-10" />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <Badge className={cn(statusColors[entry.status], "text-[9px] uppercase tracking-widest font-bold")}>
                          {formatStatusLabel(entry.status)}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                          {formatDate(entry.changedAt)}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-muted-foreground bg-muted/20 p-2 rounded-md border border-border/10">{entry.reason}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">No status history available.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Comments/Notes */}
        <AccordionItem value="comments">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes ({application.comments?.length || 0})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-4">
              {/* Add comment form */}
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a note..."
                  data-testid="textarea-new-comment"
                />
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded"
                    />
                    Internal note (not visible to applicant)
                  </label>
                  <Button
                    size="sm"
                    onClick={() => commentMutation.mutate()}
                    disabled={!newComment.trim() || commentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Existing comments */}
              {application.comments && application.comments.length > 0 ? (
                <div className="space-y-3 pt-4 border-t">
                  {application.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-md ${
                        comment.isInternal
                          ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">
                          {comment.users?.fullName || 'Staff'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      {comment.isInternal && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Internal
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No notes yet</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Notifications */}
        {application.notifications && application.notifications.length > 0 && (
          <AccordionItem value="notifications">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications ({application.notifications.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 p-4 bg-muted/50 rounded-md">
                {application.notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{notif.subject}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {notif.notificationType.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={notif.status === 'sent' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {notif.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notif.sentAt || notif.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 inline mr-1" />
          Submitted: {formatDate(application.createdAt)}
          {application.reviewedAt && (
            <span className="ml-4">Reviewed: {formatDate(application.reviewedAt)}</span>
          )}
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose} data-testid="button-close-detail">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
