import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useProperties } from '@/hooks/use-properties';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MapPin,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export default function AgentApplications() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { properties, loading } = useProperties();

  // Update meta tags
  useMemo(() => {
    updateMetaTags({
      title: 'Applications - Agent Dashboard',
      description: 'Review and manage tenant applications for your properties',
    });
  }, []);

  // Get applications for assigned properties
  const assignedProperties = properties.filter((p: any) => p.listingAgentId === user?.id);
  const allApplications = assignedProperties.flatMap((p: any) => 
    (p.applications || []).map((app: any) => ({
      ...app,
      propertyId: p.id,
      propertyTitle: p.title,
      propertyAddress: `${p.city}, ${p.state}`,
    }))
  );

  // Group by status
  const groupedApps = useMemo(() => {
    const groups: Record<string, any[]> = {
      pending: [],
      under_review: [],
      approved: [],
      rejected: [],
      other: [],
    };
    
    allApplications.forEach((app: any) => {
      const status = app.status || 'pending';
      if (status === 'pending' || status === 'under_review' || status === 'approved' || status === 'rejected') {
        groups[status].push(app);
      } else {
        groups.other.push(app);
      }
    });
    
    return groups;
  }, [allApplications]);

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 p-0 h-auto"
              onClick={() => navigate('/agent-dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-purple-100 mt-2">{allApplications.length} total applications</p>
        </div>
      </div>

      {/* Applications by Status */}
      <div className="container mx-auto px-4 py-12 flex-1">
        {allApplications.length === 0 ? (
          <Card className="p-12 text-center" data-testid="empty-state">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Applications</h3>
            <p className="text-muted-foreground">No applications for your properties yet.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Section */}
            {groupedApps.pending.length > 0 && (
              <div data-testid="section-pending">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Pending ({groupedApps.pending.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedApps.pending.map((app: any) => (
                    <Card
                      key={app.id}
                      className="p-6"
                      data-testid={`card-application-${app.id}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{app.applicantName}</h3>
                          <p className="text-sm text-muted-foreground">{app.propertyTitle}</p>
                        </div>
                        <Badge className={STATUS_COLORS[app.status] || STATUS_COLORS.pending}>
                          {app.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {app.applicantEmail}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {app.propertyAddress}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        data-testid={`button-review-${app.id}`}
                        onClick={() => navigate(`/applications/${app.id}`)}
                      >
                        <span>Review</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Under Review Section */}
            {groupedApps.under_review.length > 0 && (
              <div data-testid="section-under-review">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Under Review ({groupedApps.under_review.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedApps.under_review.map((app: any) => (
                    <Card key={app.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{app.applicantName}</h3>
                          <p className="text-sm text-muted-foreground">{app.propertyTitle}</p>
                        </div>
                        <Badge className={STATUS_COLORS[app.status]}>
                          {app.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {app.applicantEmail}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => navigate(`/applications/${app.id}`)}
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Section */}
            {groupedApps.approved.length > 0 && (
              <div data-testid="section-approved">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Approved ({groupedApps.approved.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedApps.approved.map((app: any) => (
                    <Card key={app.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{app.applicantName}</h3>
                          <p className="text-sm text-muted-foreground">{app.propertyTitle}</p>
                        </div>
                        <Badge className={STATUS_COLORS[app.status]}>
                          {app.status}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => navigate(`/applications/${app.id}`)}
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Section */}
            {groupedApps.rejected.length > 0 && (
              <div data-testid="section-rejected">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Rejected ({groupedApps.rejected.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedApps.rejected.map((app: any) => (
                    <Card key={app.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{app.applicantName}</h3>
                          <p className="text-sm text-muted-foreground">{app.propertyTitle}</p>
                        </div>
                        <Badge className={STATUS_COLORS[app.status]}>
                          {app.status}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => navigate(`/applications/${app.id}`)}
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
