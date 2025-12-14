import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useApplications } from '@/hooks/use-applications';
import { useFavorites } from '@/hooks/use-favorites';
import { useSavedSearches } from '@/hooks/use-saved-searches';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  FileText,
  Search,
  LogOut,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Loader2,
  Trash2,
  ArrowRight,
  CheckCircle,
  Clock,
  X,
  Eye,
  Filter,
  CreditCard,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Upload,
  CalendarClock,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PaymentForm } from '@/components/payment-form';

interface PropertyData {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  images?: string[];
  status?: string;
  listing_type?: string;
  property_type?: string;
}

interface PaymentAttempt {
  referenceId: string;
  timestamp: string;
  status: 'failed' | 'pending' | 'success';
  amount: number;
  errorMessage?: string;
}

interface ConditionalRequirement {
  id: string;
  type: 'document' | 'information' | 'verification';
  description: string;
  required: boolean;
  satisfied: boolean;
  satisfiedAt?: string;
  notes?: string;
}

interface ApplicationData {
  id: string;
  property_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'submitted' | 'under_review' | 'info_requested' | 'conditional_approval' | 'withdrawn';
  property?: PropertyData;
  created_at?: string;
  updated_at?: string;
  application_fee?: number;
  payment_status?: 'pending' | 'paid' | 'failed';
  payment_attempts?: PaymentAttempt[];
  payment_paid_at?: string;
  conditional_requirements?: ConditionalRequirement[];
  conditional_approval_reason?: string;
  conditional_approval_due_date?: string;
  info_requested_reason?: string;
  lease_status?: string;
  [key: string]: any;
}

export default function RenterDashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('applications');
  const [favoriteProperties, setFavoriteProperties] = useState<PropertyData[]>([]);
  const [loadingFavoritesDetails, setLoadingFavoritesDetails] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationData | null>(null);

  // Fetch hooks
  const { applications, loading: appsLoading } = useApplications();
  const { favorites, toggleFavorite, loading: favoritesLoading } = useFavorites();
  const { searches, loading: searchesLoading, deleteSearch } = useSavedSearches();

  // Fetch property details for favorites
  useEffect(() => {
    if (favorites.length === 0) {
      setFavoriteProperties([]);
      return;
    }

    const fetchFavoriteDetails = async () => {
      setLoadingFavoritesDetails(true);
      try {
        const properties: PropertyData[] = [];
        for (const favId of favorites) {
          const res = await fetch(`/api/properties/${favId}`);
          if (res.ok) {
            const data = await res.json();
            properties.push(data.data || data);
          }
        }
        setFavoriteProperties(properties);
      } catch (err) {
      } finally {
        setLoadingFavoritesDetails(false);
      }
    };

    fetchFavoriteDetails();
  }, [favorites]);

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  // Handle delete search
  const handleDeleteSearch = async (searchId: string) => {
    const success = await deleteSearch(searchId);
    if (success) {
      toast({
        title: 'Deleted',
        description: 'Saved search removed',
      });
    }
  };

  // Handle remove favorite
  const handleRemoveFavorite = async (propertyId: string) => {
    await toggleFavorite(propertyId);
    toast({
      title: 'Removed',
      description: 'Property removed from favorites',
    });
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'conditional_approval':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'pending':
      case 'submitted':
      case 'under_review':
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'info_requested':
        return <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'rejected':
        return <X className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
      submitted: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
      under_review: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700',
      info_requested: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
      conditional_approval: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700',
      approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700',
      rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700',
    };
    return styles[status] || styles.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending Review',
      submitted: 'Submitted',
      under_review: 'Under Review',
      info_requested: 'Info Requested',
      conditional_approval: 'Conditionally Approved',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Stats
  const stats = {
    applications: applications.length,
    approved: applications.filter((a: ApplicationData) => a.status === 'approved').length,
    pending: applications.filter((a: ApplicationData) => a.status === 'pending').length,
    favorites: favoriteProperties.length,
    savedSearches: searches.length,
    memberSince: user?.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
  };

  const tabOptions = [
    { id: 'applications', label: 'My Applications', icon: FileText, count: stats.applications },
    { id: 'favorites', label: 'Saved Properties', icon: Heart, count: stats.favorites },
    { id: 'searches', label: 'Saved Searches', icon: Search, count: stats.savedSearches },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Renter Dashboard</h1>
              <p className="text-blue-100 text-lg">
                Welcome back, <span className="font-semibold">{user?.email?.split('@')[0]}</span>!
              </p>
            </div>
            <Button
              onClick={() => {
                logout();
                navigate('/');
              }}
              variant="ghost"
              className="text-white hover:bg-white/20 border border-white/30"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-10 relative z-10 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Applications Card */}
          <Card
            className="p-6 hover:shadow-lg transition-all duration-300 border border-border hover:border-blue-300 dark:hover:border-blue-700"
            data-testid="stat-applications"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Applications
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {stats.applications}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                  {stats.approved} approved • {stats.pending} pending
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-200 dark:text-blue-800 flex-shrink-0" />
            </div>
          </Card>

          {/* Saved Properties Card */}
          <Card
            className="p-6 hover:shadow-lg transition-all duration-300 border border-border hover:border-red-300 dark:hover:border-red-700"
            data-testid="stat-favorites"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Saved Properties
                </p>
                <p className="text-4xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {stats.favorites}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.favorites === 1 ? 'property' : 'properties'} in wishlist
                </p>
              </div>
              <Heart className="h-8 w-8 text-red-200 dark:text-red-800 flex-shrink-0 fill-current" />
            </div>
          </Card>

          {/* Saved Searches Card */}
          <Card
            className="p-6 hover:shadow-lg transition-all duration-300 border border-border hover:border-indigo-300 dark:hover:border-indigo-700"
            data-testid="stat-searches"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Saved Searches
                </p>
                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  {stats.savedSearches}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Quick access to filters
                </p>
              </div>
              <Search className="h-8 w-8 text-indigo-200 dark:text-indigo-800 flex-shrink-0" />
            </div>
          </Card>

          {/* Member Since Card */}
          <Card
            className="p-6 hover:shadow-lg transition-all duration-300 border border-border hover:border-emerald-300 dark:hover:border-emerald-700"
            data-testid="stat-member-since"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Member Since
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  {stats.memberSince}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Active member
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-200 dark:text-emerald-800 flex-shrink-0" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 flex-1 pb-12">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto -mx-4 px-4">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold text-sm transition-all duration-200 border-b-2 flex items-center gap-2 whitespace-nowrap relative group ${
                activeTab === tab.id
                  ? 'border-b-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-b-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs"
                  data-testid={`tab-count-${tab.id}`}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* My Applications Section */}
        {activeTab === 'applications' && (
          <div className="space-y-4" data-testid="section-applications">
            {appsLoading ? (
              <Card className="p-16 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading your applications...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  This should only take a moment
                </p>
              </Card>
            ) : applications.length === 0 ? (
              <Card className="p-16 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Applications Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Start your rental journey by applying to properties that catch your eye.
                </p>
                <Button
                  onClick={() => navigate('/properties')}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-browse-properties"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Browse Properties
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {(applications as ApplicationData[]).map((app) => (
                  <Card
                    key={app.id}
                    className="p-6 hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 hover:border-l-blue-600"
                    data-testid={`card-application-${app.id}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          {getStatusIcon(app.status)}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">
                              {app.property?.title || `Application #${app.id.slice(0, 8)}`}
                            </h3>
                            {app.property?.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {app.property.address}, {app.property.city}, {app.property.state}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status & Date */}
                        <div className="flex flex-wrap gap-3 mt-3">
                          <Badge className={getStatusBadge(app.status)}>
                            {getStatusLabel(app.status)}
                          </Badge>
                          {app.payment_status === 'paid' ? (
                            <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Fee Paid
                            </Badge>
                          ) : app.payment_status === 'failed' ? (
                            <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Payment Failed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Fee Pending
                            </Badge>
                          )}
                          {app.created_at && (
                            <span className="text-xs text-muted-foreground font-medium">
                              Applied {new Date(app.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Payment Attempts */}
                        {Array.isArray(app.payment_attempts) && app.payment_attempts.length > 0 && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Payment Attempts ({app.payment_attempts.length})
                            </p>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {app.payment_attempts.slice(-3).map((attempt, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground font-mono">{attempt.referenceId || 'N/A'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {attempt.timestamp ? new Date(attempt.timestamp).toLocaleDateString() : 'N/A'}
                                    </span>
                                    <Badge 
                                      variant={attempt.status === 'success' ? 'default' : 'destructive'} 
                                      className="text-xs"
                                    >
                                      {attempt.status === 'success' ? 'Paid' : 'Failed'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Conditional Approval Requirements */}
                        {app.status === 'conditional_approval' && (
                          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid={`conditional-requirements-${app.id}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Conditionally Approved</h4>
                            </div>
                            {app.conditional_approval_reason && (
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">{app.conditional_approval_reason}</p>
                            )}
                            {app.conditional_approval_due_date && (
                              <div className="flex items-center gap-2 mb-3 text-sm text-yellow-700 dark:text-yellow-300">
                                <CalendarClock className="h-4 w-4" />
                                <span>Due by: {new Date(app.conditional_approval_due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {Array.isArray(app.conditional_requirements) && app.conditional_requirements.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">Requirements to Complete:</p>
                                {app.conditional_requirements.map((req) => (
                                  <div key={req.id} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-700">
                                    {req.satisfied ? (
                                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {req.type}
                                        </Badge>
                                        {req.required && !req.satisfied && (
                                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                            Required
                                          </Badge>
                                        )}
                                        {req.satisfied && (
                                          <Badge className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                                            Complete
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm mt-1">{req.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Info Requested Display */}
                        {app.status === 'info_requested' && (
                          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid={`info-requested-${app.id}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              <h4 className="font-semibold text-amber-800 dark:text-amber-200">Additional Information Requested</h4>
                            </div>
                            {app.info_requested_reason && (
                              <p className="text-sm text-amber-700 dark:text-amber-300">{app.info_requested_reason}</p>
                            )}
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                              Please contact the landlord or respond to their message to provide the requested information.
                            </p>
                          </div>
                        )}

                        {/* Approved - Next Steps */}
                        {app.status === 'approved' && (
                          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg" data-testid={`approved-steps-${app.id}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <h4 className="font-semibold text-green-800 dark:text-green-200">Congratulations! Application Approved</h4>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                              Your application has been approved. Here are the next steps:
                            </p>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300">1</div>
                                <span className="text-green-700 dark:text-green-300">Wait for lease agreement</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300">2</div>
                                <span className="text-green-700 dark:text-green-300">Sign the lease document</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300">3</div>
                                <span className="text-green-700 dark:text-green-300">Schedule move-in date</span>
                              </div>
                            </div>
                            {app.lease_status && (
                              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                                <p className="text-xs font-medium text-green-700 dark:text-green-300">
                                  Lease Status: <Badge variant="outline" className="ml-1 text-green-600 border-green-400">{app.lease_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {app.property_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/property/${app.property_id}`)}
                            data-testid={`button-view-property-${app.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {app.payment_status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedApplication(app);
                              setShowPaymentDialog(true);
                            }}
                            data-testid={`button-pay-fee-${app.id}`}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            {app.payment_status === 'failed' ? 'Retry Payment' : 'Pay Fee'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Properties Section */}
        {activeTab === 'favorites' && (
          <div className="space-y-6" data-testid="section-favorites">
            {loadingFavoritesDetails || favoritesLoading ? (
              <Card className="p-16 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading saved properties...</p>
              </Card>
            ) : favoriteProperties.length === 0 ? (
              <Card className="p-16 text-center">
                <Heart className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Saved Properties Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Heart your favorite properties to save them here for easy access.
                </p>
                <Button
                  onClick={() => navigate('/properties')}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-explore-properties"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Explore Properties
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProperties.map((property) => (
                  <Card
                    key={property.id}
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
                    data-testid={`card-property-${property.id}`}
                  >
                    {/* Image Section */}
                    <div className="relative aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-muted-foreground opacity-50" />
                        </div>
                      )}
                      {/* Heart Button */}
                      <button
                        onClick={() => handleRemoveFavorite(property.id)}
                        className="absolute top-3 right-3 bg-white dark:bg-slate-900 rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
                        data-testid={`button-unfavorite-${property.id}`}
                      >
                        <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                      </button>
                      {/* Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-blue-600 text-white">
                          {property.property_type || 'Property'}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2">
                        {property.title}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {property.city}, {property.state}
                        </span>
                      </p>

                      {/* Property Details */}
                      <div className="flex gap-4 text-sm mb-4 pb-4 border-b border-border">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Bed className="h-4 w-4" />
                          {property.bedrooms} bed
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Bath className="h-4 w-4" />
                          {property.bathrooms} bath
                        </span>
                      </div>

                      {/* Price & Action */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="font-bold text-lg text-foreground">
                            {(property.price || 0).toLocaleString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/property/${property.id}`)}
                          data-testid={`button-view-property-${property.id}`}
                        >
                          View
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Searches Section */}
        {activeTab === 'searches' && (
          <div className="space-y-4" data-testid="section-searches">
            {searchesLoading ? (
              <Card className="p-16 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading saved searches...</p>
              </Card>
            ) : searches.length === 0 ? (
              <Card className="p-16 text-center">
                <Search className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Saved Searches Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Save your search filters to quickly revisit them anytime.
                </p>
                <Button
                  onClick={() => navigate('/properties')}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-search"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Start Searching
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {searches.map((search, idx) => (
                  <Card
                    key={search.id}
                    className="p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700"
                    data-testid={`card-search-${search.id}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Left Content */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground mb-3">
                          {search.name || `Search ${idx + 1}`}
                        </h3>

                        {/* Filter Tags */}
                        {search.filters && (
                          <div className="flex flex-wrap gap-2">
                            {search.filters.city && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-city-${search.id}`}
                              >
                                <MapPin className="h-3 w-3" />
                                {search.filters.city}
                              </Badge>
                            )}
                            {search.filters.minPrice && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-price-${search.id}`}
                              >
                                <DollarSign className="h-3 w-3" />
                                ${search.filters.minPrice?.toLocaleString()} -
                                ${search.filters.maxPrice?.toLocaleString()}
                              </Badge>
                            )}
                            {search.filters.bedrooms && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-beds-${search.id}`}
                              >
                                <Bed className="h-3 w-3" />
                                {search.filters.bedrooms}+ Beds
                              </Badge>
                            )}
                            {search.filters.bathrooms && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-baths-${search.id}`}
                              >
                                <Bath className="h-3 w-3" />
                                {search.filters.bathrooms}+ Baths
                              </Badge>
                            )}
                            {search.filters.propertyType && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-type-${search.id}`}
                              >
                                <Filter className="h-3 w-3" />
                                {search.filters.propertyType}
                              </Badge>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-3">
                          Saved {new Date(search.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Right Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const params = new URLSearchParams();
                            Object.entries(search.filters || {}).forEach(([key, value]) => {
                              if (value) params.append(key, String(value));
                            });
                            navigate(`/properties?${params.toString()}`);
                          }}
                          data-testid={`button-view-results-${search.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Results
                        </Button>
                        <ConfirmDialog
                          title="Delete Saved Search"
                          description="Are you sure you want to delete this saved search? This action cannot be undone."
                          onConfirm={() => handleDeleteSearch(search.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-delete-search-${search.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Processing Fee</DialogTitle>
            <DialogDescription>
              Pay the application fee to expedite your application review.
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <PaymentForm
              amount={selectedApplication.application_fee || 50}
              propertyAddress={selectedApplication.property?.address}
              applicationId={selectedApplication.id}
              onError={(error) => {
                toast({
                  title: "Payment Failed",
                  description: error,
                  variant: "destructive"
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
