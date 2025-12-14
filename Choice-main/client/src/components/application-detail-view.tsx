import { useState } from 'react';
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
}

export function ApplicationDetailView({
  application,
  onClose,
  onStatusChange,
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
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
  const canWithdraw = isApplicant && ['draft', 'pending', 'under_review', 'pending_verification'].includes(application.status);
  const canRecalculateScore = isAdminOrOwner && !isApplicant;

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      options,
    }: {
      status: string;
      options?: any;
    }) => {
      return apiRequest('PATCH', `/api/applications/${application.id}/status`, { status, ...options });
    },
    onSuccess: () => {
      toast({ title: 'Status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
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
        queryKey: ['/api/applications', application.id],
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
        queryKey: ['/api/applications', application.id],
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="text-applicant-name">
            {application.users?.fullName || 'Applicant'}
          </h2>
          <p className="text-muted-foreground" data-testid="text-applicant-email">
            {application.users?.email}
          </p>
          {application.users?.phone && (
            <p className="text-muted-foreground text-sm">{application.users.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusColors[application.status]} data-testid="badge-application-status">
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
        <Card className="p-6" data-testid="card-score-breakdown">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Application Score
            </h3>
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Income', value: scoreBreakdown.incomeScore, max: 25, icon: DollarSign },
              { label: 'Credit', value: scoreBreakdown.creditScore, max: 25, icon: TrendingUp },
              { label: 'Rental History', value: scoreBreakdown.rentalHistoryScore, max: 20, icon: Home },
              { label: 'Employment', value: scoreBreakdown.employmentScore, max: 15, icon: Briefcase },
              { label: 'Documents', value: scoreBreakdown.documentsScore, max: 15, icon: FileText },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <item.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-semibold text-foreground">
                  {item.value}/{item.max}
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
      {['pending', 'under_review', 'pending_verification'].includes(application.status) && (
        <Card className="p-4" data-testid="card-actions">
          <div className="flex gap-3 flex-wrap">
            {application.status === 'pending' && (
              <Button
                onClick={handleStartReview}
                disabled={statusMutation.isPending}
                data-testid="button-start-review"
              >
                <Clock className="h-4 w-4 mr-2" />
                Start Review
              </Button>
            )}
            {['under_review', 'pending_verification'].includes(application.status) && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={statusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-reject-open">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Application</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting this application.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium">Category</label>
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
                        <label className="text-sm font-medium">Explanation</label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Provide additional details..."
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
                        Confirm Rejection
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {application.status === 'under_review' && (
              <Button
                variant="outline"
                onClick={handleRequestVerification}
                disabled={statusMutation.isPending}
                data-testid="button-request-verification"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Request Verification
              </Button>
            )}
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
      <Accordion type="multiple" defaultValue={['personal', 'status-history']} className="space-y-2">
        {/* Personal Info */}
        <AccordionItem value="personal">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
              {application.personalInfo ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{application.personalInfo.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{application.personalInfo.dateOfBirth || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SSN Provided</p>
                    <p className="font-medium">{application.personalInfo.ssn ? 'Yes (Hidden)' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{application.personalInfo.phone || 'N/A'}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground col-span-2">No personal information provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Employment Info */}
        <AccordionItem value="employment">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Employment
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
              {application.employment ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Employer</p>
                    <p className="font-medium">{application.employment.employer || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Position</p>
                    <p className="font-medium">{application.employment.position || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Income</p>
                    <p className="font-medium">
                      ${(application.employment.monthlyIncome || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Years Employed</p>
                    <p className="font-medium">{application.employment.yearsEmployed || 0} years</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground col-span-2">No employment information provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rental History */}
        <AccordionItem value="rental-history">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Rental History
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
              {application.rentalHistory ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Address</p>
                    <p className="font-medium">{application.rentalHistory.currentAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Landlord Name</p>
                    <p className="font-medium">{application.rentalHistory.landlordName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Years Renting</p>
                    <p className="font-medium">{application.rentalHistory.yearsRenting || 0} years</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Previous Eviction</p>
                    <p className="font-medium">
                      {application.rentalHistory.hasEviction ? (
                        <span className="text-red-600">Yes</span>
                      ) : (
                        'No'
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground col-span-2">No rental history provided</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Documents */}
        <AccordionItem value="documents">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 p-4 bg-muted/50 rounded-md">
              {['id', 'proof_of_income', 'employment_verification', 'bank_statements'].map((docType) => {
                const doc = application.documentStatus?.[docType] || application.documents?.[docType];
                const uploaded = doc?.uploaded || !!doc;
                const verified = doc?.verified || false;
                return (
                  <div key={docType} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{docType.replace(/_/g, ' ')}</span>
                    <div className="flex gap-2">
                      <Badge variant={uploaded ? 'default' : 'outline'}>
                        {uploaded ? 'Uploaded' : 'Missing'}
                      </Badge>
                      {uploaded && (
                        <Badge variant={verified ? 'default' : 'secondary'}>
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

        {/* Co-Applicants */}
        {application.coApplicants && application.coApplicants.length > 0 && (
          <AccordionItem value="co-applicants">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Co-Applicants ({application.coApplicants.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                {application.coApplicants.map((co) => (
                  <div key={co.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{co.fullName}</p>
                      <p className="text-sm text-muted-foreground">{co.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{co.relationship}</Badge>
                      {co.monthlyIncome && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ${co.monthlyIncome.toLocaleString()}/mo
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Status History */}
        <AccordionItem value="status-history">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status History
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 p-4">
              {application.statusHistory && application.statusHistory.length > 0 ? (
                application.statusHistory.map((entry, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <Badge className={statusColors[entry.status]}>
                          {formatStatusLabel(entry.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.changedAt)}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <Badge className={statusColors[application.status]}>
                        {formatStatusLabel(application.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(application.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
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
