import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Home,
  Briefcase,
  MessageSquare,
  Plus,
  Trash2,
  Shield,
} from 'lucide-react';

interface ConditionalRequirement {
  id: string;
  type: 'document' | 'information' | 'verification';
  description: string;
  required: boolean;
  satisfied: boolean;
  satisfiedAt?: string;
  satisfiedBy?: string;
  notes?: string;
}

interface ApplicationData {
  id: string;
  property_id: string;
  user_id: string;
  status: string;
  payment_status: string;
  score?: number;
  score_breakdown?: any;
  personal_info?: any;
  rental_history?: any;
  employment?: any;
  references?: any;
  documents?: any;
  conditional_requirements?: ConditionalRequirement[];
  conditional_approval_reason?: string;
  conditional_approval_at?: string;
  conditional_approval_due_date?: string;
  info_requested_reason?: string;
  rejection_reason?: string;
  rejection_details?: any;
  status_history?: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>;
  lease_status?: string;
  created_at: string;
  updated_at: string;
  properties?: {
    id: string;
    title: string;
    address: string;
    city?: string;
    state?: string;
    price?: number;
  };
  users?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
}

export default function ApplicationReview() {
  const { user, isLoggedIn } = useAuth();
  const [, params] = useRoute('/application-review/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const applicationId = params?.id;

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showConditionalDialog, setShowConditionalDialog] = useState(false);
  const [showInfoRequestDialog, setShowInfoRequestDialog] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [infoRequestReason, setInfoRequestReason] = useState('');
  const [conditionalRequirements, setConditionalRequirements] = useState<Array<{
    type: 'document' | 'information' | 'verification';
    description: string;
    required: boolean;
  }>>([{ type: 'document', description: '', required: true }]);
  const [conditionalDueDate, setConditionalDueDate] = useState('');

  const { data: application, isLoading, error } = useQuery<ApplicationData>({
    queryKey: ['/api/applications', applicationId],
    enabled: !!applicationId && isLoggedIn,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: any }) => {
      return apiRequest('POST', `/api/applications/${applicationId}/action`, {
        action,
        ...data,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/applications', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/owner/applications'] });
      toast({
        title: 'Success',
        description: `Application ${variables.action.replace('_', ' ')} successfully`,
      });
      setShowApproveDialog(false);
      setShowRejectDialog(false);
      setShowConditionalDialog(false);
      setShowInfoRequestDialog(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update application',
        variant: 'destructive',
      });
    },
  });

  if (!isLoggedIn || !user || (user.role !== 'landlord' && user.role !== 'admin' && user.role !== 'agent')) {
    navigate('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex-1">
          <Card className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Application Not Found</h2>
            <p className="text-muted-foreground mb-4">The application you're looking for doesn't exist or you don't have access.</p>
            <Button onClick={() => navigate('/landlord-applications')} data-testid="button-back-to-list">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: any }> = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200', icon: FileText },
      pending_payment: { bg: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200', icon: DollarSign },
      payment_verified: { bg: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200', icon: CheckCircle },
      submitted: { bg: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200', icon: FileText },
      under_review: { bg: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200', icon: Clock },
      info_requested: { bg: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200', icon: MessageSquare },
      conditional_approval: { bg: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200', icon: AlertTriangle },
      approved: { bg: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', icon: CheckCircle },
      rejected: { bg: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200', icon: XCircle },
      withdrawn: { bg: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200', icon: XCircle },
    };
    const style = styles[status] || styles.draft;
    const Icon = style.icon;
    return (
      <Badge className={style.bg}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const canTakeAction = ['submitted', 'under_review', 'info_requested', 'conditional_approval'].includes(application.status);

  const addRequirement = () => {
    setConditionalRequirements([...conditionalRequirements, { type: 'document', description: '', required: true }]);
  };

  const removeRequirement = (index: number) => {
    setConditionalRequirements(conditionalRequirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const updated = [...conditionalRequirements];
    (updated[index] as any)[field] = value;
    setConditionalRequirements(updated);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/landlord-applications')}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Application Review</h1>
              <p className="text-blue-100 text-sm mt-1">
                {application.properties?.title || 'Property Application'}
              </p>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6" data-testid="card-applicant-info">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Applicant Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{application.users?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {application.users?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {application.users?.phone || application.personal_info?.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied On</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(application.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6" data-testid="card-property-info">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-green-600" />
                Property Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{application.properties?.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {application.properties?.address}
                    {application.properties?.city && `, ${application.properties.city}`}
                    {application.properties?.state && `, ${application.properties.state}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {application.properties?.price ? `$${Number(application.properties.price).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Badge className={application.payment_status === 'paid' || application.payment_status === 'manually_verified' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                    : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'}>
                    {application.payment_status === 'manually_verified' ? 'Verified' : (application.payment_status || 'pending').replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </Card>

            {application.employment && (
              <Card className="p-6" data-testid="card-employment">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                  Employment Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium">{application.employment.employer || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{application.employment.position || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Income</p>
                    <p className="font-medium">
                      {application.employment.monthlyIncome ? `$${Number(application.employment.monthlyIncome).toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employment Duration</p>
                    <p className="font-medium">{application.employment.duration || 'N/A'}</p>
                  </div>
                </div>
              </Card>
            )}

            {application.score_breakdown && (
              <Card className="p-6" data-testid="card-score">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  Application Score
                </h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold text-indigo-600">
                    {application.score || application.score_breakdown.totalScore || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    out of {application.score_breakdown.maxScore || 100} points
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['incomeScore', 'creditScore', 'rentalHistoryScore', 'employmentScore', 'documentsScore'].map((key) => (
                    <div key={key} className="text-center p-2 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground capitalize">{key.replace('Score', '')}</p>
                      <p className="font-semibold">{application.score_breakdown[key] || 0}</p>
                    </div>
                  ))}
                </div>
                {application.score_breakdown.flags?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Flags:</p>
                    <div className="flex flex-wrap gap-2">
                      {application.score_breakdown.flags.map((flag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-amber-600 border-amber-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {application.status_history && application.status_history.length > 0 && (
              <Card className="p-6" data-testid="card-history">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  Status History
                </h2>
                <div className="space-y-3">
                  {application.status_history.slice().reverse().map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(entry.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.changedAt).toLocaleString()}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {application.conditional_requirements && application.conditional_requirements.length > 0 && (
              <Card className="p-6" data-testid="card-conditional-requirements">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Conditional Requirements
                </h2>
                <div className="space-y-3">
                  {application.conditional_requirements.map((req) => (
                    <div key={req.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      {req.satisfied ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {req.type}
                          </Badge>
                          {req.required && (
                            <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1">{req.description}</p>
                        {req.satisfied && req.satisfiedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Satisfied on {new Date(req.satisfiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {application.conditional_approval_due_date && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Due by: {new Date(application.conditional_approval_due_date).toLocaleDateString()}
                  </p>
                )}
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {canTakeAction && (
              <Card className="p-6" data-testid="card-actions">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setShowApproveDialog(true)}
                    disabled={actionMutation.isPending}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Application
                  </Button>
                  <Button
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => setShowConditionalDialog(true)}
                    disabled={actionMutation.isPending}
                    data-testid="button-conditional-approve"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Conditional Approval
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowInfoRequestDialog(true)}
                    disabled={actionMutation.isPending}
                    data-testid="button-request-info"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Request Information
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={actionMutation.isPending}
                    data-testid="button-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Application
                  </Button>
                </div>
              </Card>
            )}

            {application.status === 'approved' && (
              <Card className="p-6 border-green-200 dark:border-green-800" data-testid="card-approved-info">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">Approved</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  This application has been approved. Next steps:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-medium text-green-600">1</div>
                    <span>Prepare lease agreement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">2</div>
                    <span className="text-muted-foreground">Send for signature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">3</div>
                    <span className="text-muted-foreground">Schedule move-in</span>
                  </div>
                </div>
                {application.lease_status && (
                  <Badge className="mt-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Lease: {application.lease_status.replace('_', ' ')}
                  </Badge>
                )}
              </Card>
            )}

            {application.status === 'rejected' && (
              <Card className="p-6 border-red-200 dark:border-red-800" data-testid="card-rejected-info">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Rejected</h2>
                </div>
                {application.rejection_reason && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Reason:</p>
                    <p className="text-sm">{application.rejection_reason}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this application? This will begin the lease preparation process.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => actionMutation.mutate({ action: 'approve' })}
              disabled={actionMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              className="mt-2"
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => actionMutation.mutate({ action: 'reject', data: { reason: rejectReason } })}
              disabled={actionMutation.isPending || !rejectReason.trim()}
              data-testid="button-confirm-reject"
            >
              {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInfoRequestDialog} onOpenChange={setShowInfoRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Information</DialogTitle>
            <DialogDescription>
              Specify what additional information you need from the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="info-request">Information Needed</Label>
            <Textarea
              id="info-request"
              value={infoRequestReason}
              onChange={(e) => setInfoRequestReason(e.target.value)}
              placeholder="Describe the information you need..."
              className="mt-2"
              data-testid="input-info-request"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfoRequestDialog(false)}>Cancel</Button>
            <Button
              onClick={() => actionMutation.mutate({ action: 'request_info', data: { reason: infoRequestReason } })}
              disabled={actionMutation.isPending || !infoRequestReason.trim()}
              data-testid="button-confirm-info-request"
            >
              {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConditionalDialog} onOpenChange={setShowConditionalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conditional Approval</DialogTitle>
            <DialogDescription>
              Specify the requirements the applicant must meet before full approval.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
            {conditionalRequirements.map((req, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Requirement {index + 1}</Label>
                  {conditionalRequirements.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                      data-testid={`button-remove-req-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Select
                  value={req.type}
                  onValueChange={(value) => updateRequirement(index, 'type', value)}
                >
                  <SelectTrigger data-testid={`select-req-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document Required</SelectItem>
                    <SelectItem value="information">Information Needed</SelectItem>
                    <SelectItem value="verification">Verification Required</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={req.description}
                  onChange={(e) => updateRequirement(index, 'description', e.target.value)}
                  placeholder="Describe the requirement..."
                  data-testid={`input-req-desc-${index}`}
                />
              </div>
            ))}
            <Button variant="outline" onClick={addRequirement} className="w-full" data-testid="button-add-requirement">
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
            <div>
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <Input
                id="due-date"
                type="date"
                value={conditionalDueDate}
                onChange={(e) => setConditionalDueDate(e.target.value)}
                className="mt-2"
                data-testid="input-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConditionalDialog(false)}>Cancel</Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => actionMutation.mutate({
                action: 'conditional_approve',
                data: {
                  conditionalRequirements: conditionalRequirements.filter(r => r.description.trim()),
                  dueDate: conditionalDueDate || undefined,
                },
              })}
              disabled={actionMutation.isPending || !conditionalRequirements.some(r => r.description.trim())}
              data-testid="button-confirm-conditional"
            >
              {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Conditional Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
