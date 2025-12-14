import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { Timeline, type TimelineStep } from '@/components/timeline';
import { updateMetaTags } from '@/lib/seo';
import { FileText, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface LandlordApplication {
  id: string;
  userId: string;
  propertyId: string;
  leaseStatus: string;
  leaseSentAt: string | null;
  leaseAcceptedAt: string | null;
  leaseSignedAt: string | null;
  moveInDate: string | null;
  moveInInstructions: any;
  user: {
    fullName: string;
    email: string;
  };
  property: {
    title: string;
    address: string;
  };
}

export default function LandlordLeaseDashboard() {
  useEffect(() => {
    updateMetaTags({
      title: 'Lease Pipeline Dashboard - Choice Properties',
      description: 'Manage lease status, signatures, and move-in tracking for your properties.',
      url: 'https://choiceproperties.com/landlord-lease-dashboard',
    });
  }, []);

  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();

  if (!isLoggedIn || user?.role !== 'landlord') {
    navigate('/login');
    return null;
  }

  const { data: applications, isLoading } = useQuery<LandlordApplication[]>({
    queryKey: ['/api/landlord/applications/leases'],
  });

  const getTimelineSteps = (app: LandlordApplication): TimelineStep[] => [
    {
      id: 'lease_sent',
      label: 'Lease Sent',
      description: app.leaseSentAt ? 'Lease delivered to tenant' : 'Not sent yet',
      date: app.leaseSentAt ? new Date(app.leaseSentAt) : null,
      status: app.leaseSentAt ? 'completed' : 'pending',
    },
    {
      id: 'lease_accepted',
      label: 'Tenant Accepted',
      description: app.leaseAcceptedAt ? 'Tenant reviewed and accepted' : 'Awaiting tenant acceptance',
      date: app.leaseAcceptedAt ? new Date(app.leaseAcceptedAt) : null,
      status: app.leaseAcceptedAt ? 'completed' : (app.leaseSentAt ? 'current' : 'pending'),
    },
    {
      id: 'lease_signed',
      label: 'Both Signed',
      description: app.leaseSignedAt ? 'Lease fully executed' : 'Awaiting signatures',
      date: app.leaseSignedAt ? new Date(app.leaseSignedAt) : null,
      status: app.leaseSignedAt ? 'completed' : (app.leaseAcceptedAt ? 'current' : 'pending'),
    },
    {
      id: 'move_in_ready',
      label: 'Move-In Scheduled',
      description: app.moveInDate
        ? `Move-in: ${new Date(app.moveInDate).toLocaleDateString()}`
        : 'Not scheduled',
      date: app.moveInDate ? new Date(app.moveInDate) : null,
      status: app.moveInDate ? 'completed' : 'pending',
    },
  ];

  const statusCounts = {
    sent: applications?.filter((a) => a.leaseSentAt && !a.leaseAcceptedAt).length || 0,
    accepted: applications?.filter((a) => a.leaseAcceptedAt && !a.leaseSignedAt).length || 0,
    signed: applications?.filter((a) => a.leaseSignedAt && !a.moveInDate).length || 0,
    moveInReady: applications?.filter((a) => a.moveInDate).length || 0,
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading lease pipeline...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Lease Pipeline</h1>
            <p className="text-muted-foreground">
              Monitor lease status, signatures, and move-in preparation
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {statusCounts.sent}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lease Sent</p>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {statusCounts.accepted}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting Signature</p>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {statusCounts.signed}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Fully Signed</p>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {statusCounts.moveInReady}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Move-In Ready</p>
            </Card>
          </div>

          {/* Lease Pipeline */}
          {!applications || applications.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Active Leases</h2>
              <p className="text-muted-foreground">
                You don't have any active leases yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Group by status */}
              {['lease_sent', 'lease_accepted', 'lease_signed', 'move_in_ready'].map((status) => {
                const statusApps = applications.filter((a) => a.leaseStatus === status);
                if (statusApps.length === 0) return null;

                const statusLabel = {
                  lease_sent: 'Lease Sent - Awaiting Review',
                  lease_accepted: 'Tenant Accepted - Awaiting Signatures',
                  lease_signed: 'Fully Signed - Ready for Move-In',
                  move_in_ready: 'Move-In Scheduled',
                }[status];

                return (
                  <div key={status}>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      {status === 'lease_sent' && <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                      {status === 'lease_accepted' && <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                      {(status === 'lease_signed' || status === 'move_in_ready') && (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      )}
                      {statusLabel}
                    </h2>
                    <div className="space-y-4">
                      {statusApps.map((app) => (
                        <Card key={app.id} className="p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">{app.property.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {app.property.address}
                              </p>
                            </div>
                          </div>

                          {/* Tenant Info */}
                          <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{app.user.fullName}</p>
                              <p className="text-xs text-muted-foreground">{app.user.email}</p>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="py-4 border-y mb-4">
                            <Timeline steps={getTimelineSteps(app)} />
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link href={`/application-review/${app.id}`}>
                              <Button variant="default" size="sm" className="gap-2">
                                <FileText className="w-4 h-4" />
                                View Details
                              </Button>
                            </Link>
                            {!app.leaseSentAt && (
                              <Button variant="outline" size="sm">
                                Send Lease
                              </Button>
                            )}
                            {app.leaseSignedAt && !app.moveInDate && (
                              <Button variant="outline" size="sm">
                                Prepare Move-In
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
