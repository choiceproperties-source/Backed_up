import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/breadcrumb";
import { ApplicationDetailView } from "@/components/application-detail-view";
import { updateMetaTags } from "@/lib/seo";
import { ArrowLeft, FileText, Loader2, AlertCircle, DollarSign, Send, Ban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ApplicationTimeline } from "@/components/application/ApplicationTimeline";

interface ApplicationFullResponse {
  success: boolean;
  data: any;
  message: string;
}

export default function ApplicationDetail() {
  const [, params] = useRoute("/applications/:id");
  const applicationId = params?.id;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery<ApplicationFullResponse>({
    queryKey: ["/api/v2/applications", applicationId, "full"],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`/api/v2/applications/${applicationId}/full`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch application details");
      }
      return res.json();
    },
    enabled: !!applicationId && !!user?.id,
  });

  const application = response?.success ? response.data : null;
  const isLandlord = user?.role === 'landlord' || user?.role === 'property_manager' || user?.role === 'admin';
  const isApplicant = user?.id === application?.user_id;

  const handleRequestPayment = async (data: { amount: string; purpose: string; message?: string }) => {
    try {
      await apiRequest("PATCH", `/api/v2/applications/${applicationId}/status`, {
        status: "payment_requested",
        paymentRequest: data
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/applications", applicationId, "full"] });
      toast({ title: "Payment Requested", description: "The applicant has been notified." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to request payment.", variant: "destructive" });
    }
  };

  const handlePaymentAction = async (action: "pay" | "decline", reason?: string) => {
    try {
      if (action === "pay") {
        const res = await apiRequest("POST", `/api/applications/${applicationId}/pay`, {});
        const result = await res.json();
        if (result.success) {
          // Immediately confirm payment for now (placeholder for real provider callback)
          const confirmRes = await apiRequest("POST", `/api/applications/${applicationId}/payment/complete`, {});
          const confirmResult = await confirmRes.json();
          
          if (confirmResult.success) {
            toast({ title: "Payment Completed", description: "Your payment has been successfully completed and the application is locked." });
            refetch();
          } else {
            toast({ title: "Payment Confirmation Failed", description: confirmResult.message || "Failed to confirm payment.", variant: "destructive" });
          }
        } else {
          toast({ title: "Payment Failed", description: result.message || "Failed to initiate payment.", variant: "destructive" });
        }
      } else {
        // Logic for decline
        toast({ title: "Action completed", description: `You have declined the request.` });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to complete action.", variant: "destructive" });
    }
  };

  const paymentRequest = application?.payment_request;
  const isPaymentPending = application?.status === "payment_requested" && !paymentRequest?.payment_intent_id;

  useEffect(() => {
    updateMetaTags({
      title: "Application Details - Choice Properties",
      description: "View your rental application details and status.",
    });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Loading application details...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-4">
                Please log in to view application details.
              </p>
              <Link href="/login">
                <Button data-testid="button-login">Log In</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/applications">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Application Details</h1>
          </div>
          <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-600 dark:text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Failed to Load Application</h2>
                <p className="text-red-700 dark:text-red-300 mb-6">We couldn't load this application. Please check the URL or go back to your applications list.</p>
                <Link href="/applications">
                  <Button data-testid="button-back-to-applications">Back to Applications</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const queryParams = new URLSearchParams(window.location.search);
  const activeTab = queryParams.get('tab') || 'overview';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Applications", href: "/applications" },
            { label: "Application Details" },
          ]}
        />

        <div className="flex items-center gap-4 mb-6">
          <Link href="/applications">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Application Details
          </h1>
        </div>

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : application ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-xl" data-testid="text-property-title">
                    {application.properties?.title || "Property Application"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {application.properties?.address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={application.status === 'approved' ? 'default' : 'outline'}>{application.status?.replace('_', ' ') || 'draft'}</Badge>
                  <Link href={`/properties/${application.property_id}`}>
                    <Button variant="outline" size="sm" data-testid="button-view-property">
                      View Property
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-10">
              <div className="py-6">
                <ApplicationTimeline currentStatus={application.status} history={application.statusHistory || []} />
              </div>
              <Separator />
              <ApplicationDetailView
                defaultTab={activeTab}
                application={{
                  id: application.id,
                  userId: application.user_id,
                  propertyId: application.property_id,
                  status: application.status,
                  previousStatus: application.previous_status,
                  score: application.score,
                  scoreBreakdown: application.score_breakdown,
                  statusHistory: application.status_history,
                  personalInfo: application.personal_info,
                  employment: application.employment,
                  rentalHistory: application.rental_history,
                  documents: application.documents,
                  documentStatus: application.document_status,
                  rejectionCategory: application.rejection_category,
                  rejectionReason: application.rejection_reason,
                  rejectionDetails: application.rejection_details,
                  createdAt: application.created_at,
                  expiresAt: application.expires_at,
                  reviewedAt: application.reviewed_at,
                  users: application.users,
                  properties: application.properties,
                  coApplicants: application.coApplicants,
                  comments: application.comments,
                  notifications: application.notifications,
                }}
                onStatusChange={() => refetch()}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Application Not Found
              </h2>
              <p className="text-muted-foreground mb-4">
                The application you are looking for does not exist or you do not
                have permission to view it.
              </p>
              <Link href="/applications">
                <Button data-testid="button-back-to-applications">
                  Back to Applications
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
