import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, Clock, CheckCircle2, AlertCircle, XCircle, Loader2, LogIn } from "lucide-react";
import { updateMetaTags } from "@/lib/seo";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/alert-dialog";

interface ApplicationResponse {
  id: string;
  property_id: string;
  user_id: string;
  status: string;
  step: number;
  personal_info: any;
  rental_history: any;
  employment: any;
  references: any;
  disclosures: any;
  documents: any;
  score: number | null;
  created_at: string;
  updated_at: string;
  properties?: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: ApplicationResponse[];
  message: string;
}

interface TransformedApplication {
  id: string;
  propertyId: string;
  userId: string;
  status: string;
  step: number;
  score: number | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
  };
}

function transformApplication(app: ApplicationResponse): TransformedApplication {
  return {
    id: app.id,
    propertyId: app.property_id,
    userId: app.user_id,
    status: app.status || "draft",
    step: app.step || 0,
    score: app.score,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
    property: app.properties ? {
      id: app.properties.id,
      title: app.properties.title,
      address: app.properties.address,
      city: app.properties.city,
      state: app.properties.state,
    } : undefined
  };
}

export default function Applications() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    updateMetaTags({
      title: "My Applications - Choice Properties",
      description: "View and track your rental applications."
    });
  }, []);

  const withdrawMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return apiRequest('PATCH', `/api/applications/${applicationId}/status`, { 
        status: 'withdrawn',
        reason: 'Applicant withdrew application'
      });
    },
    onSuccess: () => {
      toast({ title: 'Application withdrawn successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/applications/user', user?.id] });
      setWithdrawingId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to withdraw application',
        description: error.message,
        variant: 'destructive',
      });
      setWithdrawingId(null);
    },
  });

  const canWithdraw = (status: string) => {
    return ['draft', 'pending', 'under_review', 'pending_verification'].includes(status);
  };

  const { data: applicationsData, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ['/api/applications/user', user?.id],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`/api/applications/user/${user!.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch applications');
      }
      return res.json();
    },
    enabled: !!user?.id,
  });

  const applications = applicationsData?.success && applicationsData?.data 
    ? applicationsData.data.map(transformApplication) 
    : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "approved_pending_lease":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "under_review":
      case "pending_verification":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "withdrawn":
      case "expired":
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      approved: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
      approved_pending_lease: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
      rejected: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
      under_review: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
      pending_verification: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
      pending: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
      draft: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
      withdrawn: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
      expired: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
    };
    return variants[status] || variants.draft;
  };

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending: "Pending",
      under_review: "Under Review",
      pending_verification: "Pending Verification",
      approved: "Approved",
      approved_pending_lease: "Approved - Pending Lease",
      rejected: "Rejected",
      withdrawn: "Withdrawn",
      expired: "Expired"
    };
    return labels[status] || status;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <Breadcrumb items={[{ label: "My Applications" }]} />
        <div className="flex-1 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="py-16 text-center">
                <LogIn className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Sign In Required</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view your rental applications.</p>
                <Link href="/login">
                  <Button data-testid="button-login">Sign In</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <Breadcrumb items={[{ label: "My Applications" }]} />

      <div className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-page-title">My Applications</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Track all your rental applications in one place.</p>

          {error && (
            <Card className="mb-6 border-red-200 dark:border-red-800">
              <CardContent className="py-4">
                <p className="text-red-600 dark:text-red-400 text-center">Failed to load applications. Please try again.</p>
              </CardContent>
            </Card>
          )}

          {applications.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Start browsing properties and submit your first application.</p>
                <Link href="/properties">
                  <Button data-testid="button-browse-properties">Browse Properties</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id} className="hover:shadow-lg transition-shadow" data-testid={`card-application-${app.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate" data-testid={`text-property-title-${app.id}`}>
                          {app.property?.title || "Property Application"}
                        </h3>
                        {app.property && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {app.property.address}, {app.property.city}, {app.property.state}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Applied on {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "Unknown date"}
                        </p>
                        {app.score && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Application Score: {app.score}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(app.status)}
                        <Badge className={getStatusBadge(app.status)} data-testid={`badge-status-${app.id}`}>
                          {formatStatus(app.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <Link href={`/applications/${app.id}`}>
                        <Button size="sm" data-testid={`button-view-details-${app.id}`}>
                          View Details
                        </Button>
                      </Link>
                      {app.propertyId && (
                        <Link href={`/property/${app.propertyId}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-property-${app.id}`}>
                            View Property
                          </Button>
                        </Link>
                      )}
                      {app.status === "draft" && (
                        <Link href={`/apply?propertyId=${app.propertyId}&applicationId=${app.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-continue-application-${app.id}`}>
                            Continue Application
                          </Button>
                        </Link>
                      )}
                      {canWithdraw(app.status) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-orange-600 border-orange-300"
                              data-testid={`button-withdraw-${app.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Withdraw
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
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => withdrawMutation.mutate(app.id)}
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={withdrawMutation.isPending}
                                data-testid={`button-confirm-withdraw-${app.id}`}
                              >
                                {withdrawMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Confirm Withdrawal
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
