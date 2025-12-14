import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
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
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

interface ApplicationFullResponse {
  success: boolean;
  data: any;
  message: string;
}

export default function ApplicationDetail() {
  const [, params] = useRoute("/applications/:id");
  const applicationId = params?.id;
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    updateMetaTags({
      title: "Application Details - Choice Properties",
      description: "View your rental application details and status.",
    });
  }, []);

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery<ApplicationFullResponse>({
    queryKey: ["/api/applications", applicationId, "full"],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`/api/applications/${applicationId}/full`, {
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Error Loading Application
              </h2>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error
                  ? error.message
                  : "Something went wrong"}
              </p>
              <Button onClick={() => refetch()} data-testid="button-retry">
                Try Again
              </Button>
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
                    {application.properties?.city &&
                      `, ${application.properties.city}`}
                    {application.properties?.state &&
                      `, ${application.properties.state}`}
                  </p>
                </div>
                <Link href={`/properties/${application.property_id}`}>
                  <Button variant="outline" size="sm" data-testid="button-view-property">
                    View Property
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ApplicationDetailView
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
