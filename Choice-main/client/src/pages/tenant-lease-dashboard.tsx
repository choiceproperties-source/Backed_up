import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Timeline, type TimelineStep } from '@/components/timeline';
import { updateMetaTags } from '@/lib/seo';
import { Download, FileText, Home, CheckCircle, Clock } from 'lucide-react';

interface Application {
  id: string;
  propertyId: string;
  leaseStatus: string;
  leaseSentAt: string | null;
  leaseAcceptedAt: string | null;
  leaseSignedAt: string | null;
  moveInDate: string | null;
  moveInInstructions: any;
  property: {
    title: string;
    address: string;
    city: string;
    state: string;
  };
}

export default function TenantLeaseDashboard() {
  useEffect(() => {
    updateMetaTags({
      title: 'Lease Dashboard - Choice Properties',
      description: 'Track your lease status, review documents, and prepare for move-in.',
      url: 'https://choiceproperties.com/tenant-lease-dashboard',
    });
  }, []);

  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['/api/applications/tenant'],
  });

  const getTimelineSteps = (app: Application): TimelineStep[] => {
    const statuses: TimelineStep[] = [
      {
        id: 'lease_preparation',
        label: 'Lease Preparation',
        description: 'Landlord is preparing your lease',
        status: 'completed',
      },
      {
        id: 'lease_sent',
        label: 'Lease Sent',
        description: app.leaseSentAt ? 'Lease document received' : 'Waiting for lease...',
        date: app.leaseSentAt ? new Date(app.leaseSentAt) : null,
        status: app.leaseSentAt ? 'completed' : 'pending',
      },
      {
        id: 'lease_accepted',
        label: 'Lease Accepted',
        description: app.leaseAcceptedAt ? 'You accepted the lease' : 'Review and accept lease',
        date: app.leaseAcceptedAt ? new Date(app.leaseAcceptedAt) : null,
        status: app.leaseAcceptedAt ? 'completed' : (app.leaseSentAt ? 'current' : 'pending'),
      },
      {
        id: 'lease_signed',
        label: 'Signed by Both Parties',
        description: app.leaseSignedAt ? 'Lease fully executed' : 'Signatures pending',
        date: app.leaseSignedAt ? new Date(app.leaseSignedAt) : null,
        status: app.leaseSignedAt ? 'completed' : (app.leaseAcceptedAt ? 'current' : 'pending'),
      },
      {
        id: 'move_in_ready',
        label: 'Move-In Ready',
        description: app.moveInDate ? `Move-in on ${new Date(app.moveInDate).toLocaleDateString()}` : 'Preparing move-in details',
        date: app.moveInDate ? new Date(app.moveInDate) : null,
        status: app.moveInDate ? 'completed' : 'pending',
      },
    ];
    return statuses;
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading your leases...</div>
        </div>
        <Footer />
      </>
    );
  }

  const activeApplications = applications?.filter(
    (app) => ['lease_sent', 'lease_accepted', 'lease_signed', 'move_in_ready'].includes(app.leaseStatus)
  ) || [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Lease Dashboard</h1>
            <p className="text-muted-foreground">
              Track your lease status and prepare for move-in
            </p>
          </div>

          {activeApplications.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Active Leases</h2>
              <p className="text-muted-foreground mb-4">
                You don't have any active leases yet. Browse properties and apply to get started.
              </p>
              <Link href="/properties">
                <Button>Browse Properties</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-8">
              {activeApplications.map((app) => (
                <Card key={app.id} className="p-6">
                  {/* Property Header */}
                  <div className="mb-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">{app.property.title}</h2>
                        <p className="text-muted-foreground">
                          {app.property.address}, {app.property.city}, {app.property.state}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          {app.leaseStatus.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mb-8 py-6 border-t border-b">
                    <h3 className="text-lg font-semibold mb-4">Lease Timeline</h3>
                    <Timeline steps={getTimelineSteps(app)} />
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    {app.leaseSentAt && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Documents</h4>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Download Lease
                          </Button>
                          {app.leaseSignedAt && (
                            <Button variant="outline" size="sm" className="gap-2">
                              <Download className="w-4 h-4" />
                              Download Signed Lease
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {app.moveInInstructions && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Move-In Readiness</h4>
                        <div className="space-y-2">
                          {app.moveInInstructions.keyPickup && (
                            <div className="flex items-start gap-3 p-3 bg-muted rounded">
                              <Home className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Key Pickup</p>
                                <p className="text-xs text-muted-foreground">
                                  {app.moveInInstructions.keyPickup.location} at{' '}
                                  {app.moveInInstructions.keyPickup.time}
                                </p>
                              </div>
                            </div>
                          )}

                          {app.moveInInstructions.accessDetails && (
                            <div className="flex items-start gap-3 p-3 bg-muted rounded">
                              <CheckCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Access Details</p>
                                <p className="text-xs text-muted-foreground">
                                  {[
                                    app.moveInInstructions.accessDetails.gateCode && 'Gate Code',
                                    app.moveInInstructions.accessDetails.keypadCode && 'Keypad Code',
                                    app.moveInInstructions.accessDetails.smartLockCode && 'Smart Lock',
                                  ]
                                    .filter(Boolean)
                                    .join(', ')}
                                </p>
                              </div>
                            </div>
                          )}

                          {app.moveInInstructions.checklistItems && (
                            <div>
                              <p className="text-sm font-medium mb-2">Move-In Checklist</p>
                              <div className="space-y-1">
                                {app.moveInInstructions.checklistItems.map((item: any) => (
                                  <div key={item.id} className="flex items-center gap-2 text-sm">
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        item.completed
                                          ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                                          : 'border-muted-foreground'
                                      }`}
                                    >
                                      {item.completed && (
                                        <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                                      )}
                                    </div>
                                    <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                                      {item.item}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="mt-6 pt-6 border-t">
                    <Link href={`/applications/${app.id}`}>
                      <Button variant="outline" className="w-full gap-2">
                        <FileText className="w-4 h-4" />
                        View Full Application
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
