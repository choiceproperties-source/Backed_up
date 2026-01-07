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
import { Download, FileText, Home, CheckCircle, Clock, Eye, EyeOff, ExternalLink, MessageSquare, Check } from 'lucide-react';

const STEP_ORDER = ['submitted', 'under_review', 'approved', 'lease_sent'] as const;

function StatusStepper({ currentStatus }: { currentStatus: string }) {
  const steps = [
    { id: 'submitted', label: 'Applied' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'lease_sent', label: 'Lease Sent' },
  ];

  const currentIndex = STEP_ORDER.indexOf(currentStatus as any);
  // If status is further along (e.g. lease_accepted), mark all as completed
  const effectiveIndex = currentIndex === -1 ? (['lease_accepted', 'move_in_ready', 'completed'].includes(currentStatus) ? 3 : 0) : currentIndex;

  return (
    <div className="w-full py-4" aria-label="Application progress">
      <div className="relative flex justify-between">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted" aria-hidden="true" />
        
        {/* Active Progress Bar */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500" 
          style={{ width: `${(effectiveIndex / (steps.length - 1)) * 100}%` }}
          aria-hidden="true"
        />

        {steps.map((step, index) => {
          const isCompleted = index < effectiveIndex;
          const isCurrent = index === effectiveIndex;
          const isFuture = index > effectiveIndex;

          return (
            <div key={step.id} className="relative flex flex-col items-center group z-10">
              <div 
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors bg-background ${
                  isCompleted ? 'border-primary bg-primary text-primary-foreground' : 
                  isCurrent ? 'border-primary text-primary ring-4 ring-primary/10' : 
                  'border-muted text-muted-foreground'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <span className={`mt-2 text-xs font-medium text-center ${
                isFuture ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Application {
  id: string;
  propertyId: string;
  leaseStatus: string;
  leaseSentAt: string | null;
  leaseAcceptedAt: string | null;
  leaseSignedAt: string | null;
  moveInDate: string | null;
  moveInInstructions: any;
  leaseUrl?: string; // Standard lease URL field
  signedLeaseUrl?: string; // Standard signed lease URL field
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    owner_id?: string;
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
  const [previewLeaseId, setPreviewLeaseId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['/api/v2/applications/user', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v2/applications/user/${user?.id}`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      const json = await res.json();
      return json.data || json;
    },
    enabled: !!user?.id,
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

  const togglePreview = (id: string, url: string) => {
    if (previewLeaseId === id && previewUrl === url) {
      setPreviewLeaseId(null);
      setPreviewUrl(null);
    } else {
      setPreviewLeaseId(id);
      setPreviewUrl(url);
    }
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
      <main className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/80 py-12 px-6 relative overflow-hidden mb-12">
          <div className="container max-w-6xl mx-auto relative z-10">
            <h1 className="text-4xl font-bold tracking-tight mb-2 text-white">Lease Dashboard</h1>
            <p className="text-white/80 text-lg font-medium">
              Track your lease status and prepare for move-in
            </p>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 pb-12">

          {activeApplications.length === 0 ? (
            <Card className="p-16 flex flex-col items-center justify-center text-center">
              <FileText className="w-20 h-20 text-muted-foreground/40 mb-6" strokeWidth={1.5} />
              <h2 className="text-xl font-bold mb-2">No Active Leases</h2>
              <p className="text-muted-foreground mb-6 max-w-sm">
                You don't have any active leases yet. Browse properties and apply to get started.
              </p>
              <Link href="/properties">
                <Button>Browse Properties</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-8">
              {activeApplications.map((app) => (
                <Card key={app.id} className="p-8 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
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
                        <StatusStepper currentStatus={app.leaseStatus} />
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
                        <div className="flex flex-wrap gap-2">
                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => app.leaseUrl && togglePreview(app.id + '-base', app.leaseUrl)}
                                disabled={!app.leaseUrl}
                              >
                                {previewLeaseId === app.id + '-base' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {previewLeaseId === app.id + '-base' ? 'Hide' : 'Preview'} Lease
                              </Button>
                              <Button variant="outline" size="sm" className="gap-2" asChild>
                                <a href={app.leaseUrl} download target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              </Button>
                            </div>
                            
                            {app.leaseSignedAt && (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-2"
                                  onClick={() => app.signedLeaseUrl && togglePreview(app.id + '-signed', app.signedLeaseUrl)}
                                  disabled={!app.signedLeaseUrl}
                                >
                                  {previewLeaseId === app.id + '-signed' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  {previewLeaseId === app.id + '-signed' ? 'Hide' : 'Preview'} Signed
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                  <a href={app.signedLeaseUrl} download target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                    Download Signed
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline Document Viewer */}
                        {previewLeaseId?.startsWith(app.id) && previewUrl && (
                          <div className="mt-4 border rounded-lg overflow-hidden bg-muted/20 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between p-2 bg-muted border-b">
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                Document Preview
                              </span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setPreviewLeaseId(null); setPreviewUrl(null); }}>
                                <Clock className="w-3 h-3 rotate-45" />
                              </Button>
                            </div>
                            <div className="relative aspect-[3/4] sm:aspect-video w-full bg-white dark:bg-zinc-900">
                              {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.includes('blob') ? (
                                <iframe 
                                  src={previewUrl} 
                                  className="w-full h-full border-0" 
                                  title="Lease Document Preview"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full p-4">
                                  <img 
                                    src={previewUrl} 
                                    alt="Lease Document Preview" 
                                    className="max-h-full max-w-full object-contain shadow-sm"
                                  />
                                  <Button variant="link" size="sm" className="mt-2 gap-1" asChild>
                                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3" />
                                      View full size
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                  <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row gap-3">
                    <Link href={`/applications/${app.id}`}>
                      <Button variant="outline" className="flex-1 gap-2">
                        <FileText className="w-4 h-4" />
                        View Full Application
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={() => {
                        // Messaging is typically handled through inquiries
                        // Navigate to property details where the contact dialog lives
                        navigate(`/properties/${app.property.id}?contact=true`);
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Landlord
                    </Button>
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
