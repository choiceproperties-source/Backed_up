import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useInquiries } from '@/hooks/use-inquiries';
import { useRequirements } from '@/hooks/use-requirements';
import { useProperties } from '@/hooks/use-properties';
import { useOwnerApplications } from '@/hooks/use-property-applications';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  MessageSquare,
  FileText,
  Users,
  LogOut,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Loader2,
  Briefcase,
  MapPin,
  DollarSign,
  Edit2,
  TrendingUp,
  Target,
  Home,
  Bed,
  Bath,
  ArrowRight,
  Sparkles,
  ClipboardList,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export default function AgentDashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('inquiries');
  const [showNewRequirementForm, setShowNewRequirementForm] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    budgetMin: 0,
    budgetMax: 0,
    bedrooms: 0,
    bathrooms: 0,
    locations: '',
    amenities: '',
    leaseTerm: '',
    moveInDate: '',
    additionalNotes: '',
  });

  // Fetch hooks
  const {
    agentInquiries,
    isLoading: inquiriesLoading,
  } = useInquiries();
  const {
    requirements,
    loading: reqsLoading,
    createRequirement,
    deleteRequirement,
    updateRequirement,
  } = useRequirements();
  const { properties, loading: propsLoading } = useProperties();
  const { 
    applications: ownerApplications, 
    isLoading: appsLoading,
    updateStatus,
    isUpdatingStatus,
    scoreApplication,
    isScoringApplication,
  } = useOwnerApplications();

  // Redirect if not logged in or not an agent
  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  if (user.role !== 'agent' && user.role !== 'admin') {
    navigate('/');
    return null;
  }

  // Calculate stats
  const stats = useMemo(() => {
    const respondedInquiries = agentInquiries.filter((i: any) => i.status === 'responded').length;
    const closedInquiries = agentInquiries.filter((i: any) => i.status === 'closed').length;
    const totalInquiries = agentInquiries.length;
    const totalLeads = totalInquiries + requirements.length;
    const convertedInquiries = respondedInquiries + closedInquiries;
    
    return {
      inquiries: totalInquiries,
      requirements: requirements.length,
      leads: totalLeads,
      pendingInquiries: agentInquiries.filter((i: any) => i.status === 'pending').length,
      respondedInquiries,
      closedInquiries,
      // Conversion rate = percentage of inquiries that were responded to or closed
      conversionRate: totalInquiries > 0 ? Math.round((convertedInquiries / totalInquiries) * 100) : 0,
    };
  }, [agentInquiries, requirements]);

  // Generate deterministic weekly data based on actual inquiries/requirements
  const weeklyLeadData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Distribute actual data across the week deterministically
    const inquiriesPerDay = Math.floor(stats.inquiries / 7);
    const requirementsPerDay = Math.floor(stats.requirements / 7);
    const inquiriesRemainder = stats.inquiries % 7;
    const requirementsRemainder = stats.requirements % 7;
    
    return days.map((day, index) => ({
      name: day,
      inquiries: inquiriesPerDay + (index < inquiriesRemainder ? 1 : 0),
      requirements: requirementsPerDay + (index < requirementsRemainder ? 1 : 0),
    }));
  }, [stats.inquiries, stats.requirements]);

  // Conversion pie chart data - use minValue for rendering zero segments visually
  const conversionData = useMemo(() => {
    const total = stats.respondedInquiries + stats.closedInquiries + stats.pendingInquiries;
    const minValue = total > 0 ? 0.001 : 0; // Epsilon to render zero segments
    return [
      { name: 'Responded', value: stats.respondedInquiries || minValue, actualValue: stats.respondedInquiries, color: '#8b5cf6' },
      { name: 'Closed', value: stats.closedInquiries || minValue, actualValue: stats.closedInquiries, color: '#10b981' },
      { name: 'Pending', value: stats.pendingInquiries || minValue, actualValue: stats.pendingInquiries, color: '#f59e0b' },
    ];
  }, [stats]);

  // Match properties with requirements
  const matchedProperties = useMemo(() => {
    if (!requirements.length || !properties.length) return [];
    
    return requirements.map((req: any) => {
      const matches = properties.filter((prop: any) => {
        const priceMatch = (!req.budgetMin || prop.price >= req.budgetMin) && 
                          (!req.budgetMax || prop.price <= req.budgetMax);
        const bedroomMatch = !req.bedrooms || prop.bedrooms >= req.bedrooms;
        const bathroomMatch = !req.bathrooms || prop.bathrooms >= req.bathrooms;
        return priceMatch && bedroomMatch && bathroomMatch;
      }).slice(0, 3);
      
      return {
        requirement: req,
        matches,
        matchCount: matches.length,
      };
    });
  }, [requirements, properties]);

  // Handle add requirement
  const handleAddRequirement = async () => {
    if (!newRequirement.contactName || !newRequirement.contactEmail) {
      toast({
        title: 'Error',
        description: 'Please fill in contact name and email',
        variant: 'destructive',
      });
      return;
    }

    const result = await createRequirement({
      contactName: newRequirement.contactName,
      contactEmail: newRequirement.contactEmail,
      contactPhone: newRequirement.contactPhone,
      budgetMin: newRequirement.budgetMin,
      budgetMax: newRequirement.budgetMax,
      bedrooms: newRequirement.bedrooms,
      bathrooms: newRequirement.bathrooms,
      locations: newRequirement.locations ? newRequirement.locations.split(',').map(l => l.trim()) : [],
      amenities: newRequirement.amenities ? newRequirement.amenities.split(',').map(a => a.trim()) : [],
      leaseTerm: newRequirement.leaseTerm,
      moveInDate: newRequirement.moveInDate,
      additionalNotes: newRequirement.additionalNotes,
    });

    if (result) {
      setNewRequirement({
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        budgetMin: 0,
        budgetMax: 0,
        bedrooms: 0,
        bathrooms: 0,
        locations: '',
        amenities: '',
        leaseTerm: '',
        moveInDate: '',
        additionalNotes: '',
      });
      setShowNewRequirementForm(false);
    }
  };

  // Handle delete requirement
  const handleDeleteRequirement = async (requirementId: string) => {
    await deleteRequirement(requirementId);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
      responded: 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
      closed: 'bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800',
    };
    return colors[status] || colors.pending;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      responded: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      closed: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Agent Dashboard</h1>
            <p className="text-white/80 mt-2">Manage inquiries, requirements, and leads</p>
          </div>
          <Button
            onClick={() => {
              logout();
              navigate('/');
            }}
            variant="ghost"
            className="text-white hover:bg-white/20"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4" data-testid="stat-inquiries">
            <p className="text-sm font-semibold text-muted-foreground">Inquiries</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.inquiries}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.pendingInquiries} pending</p>
          </Card>
          <Card className="p-4" data-testid="stat-requirements">
            <p className="text-sm font-semibold text-muted-foreground">Requirements</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.requirements}
            </p>
            <Users className="h-4 w-4 text-indigo-500 mt-2" />
          </Card>
          <Card className="p-4" data-testid="stat-leads">
            <p className="text-sm font-semibold text-muted-foreground">Total Leads</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.leads}</p>
            <Briefcase className="h-4 w-4 text-blue-500 mt-2" />
          </Card>
          <Card className="p-4" data-testid="stat-conversion">
            <p className="text-sm font-semibold text-muted-foreground">Conversion Rate</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.conversionRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stats.respondedInquiries + stats.closedInquiries} converted</p>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 mt-12 flex-1">
        <div className="flex gap-2 mb-8 flex-wrap border-b border-border">
          {[
            { id: 'inquiries', label: 'Inquiries', icon: MessageSquare, count: stats.inquiries },
            { id: 'applications', label: 'Applications', icon: ClipboardList, count: ownerApplications.length },
            { id: 'requirements', label: 'Requirements', icon: FileText, count: stats.requirements },
            { id: 'matching', label: 'Property Matching', icon: Target, count: matchedProperties.filter(m => m.matchCount > 0).length },
            { id: 'leads', label: 'Analytics', icon: TrendingUp, count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-b-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Inquiries */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4 pb-12" data-testid="section-inquiries">
            {inquiriesLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading inquiries...</p>
              </Card>
            ) : agentInquiries.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No inquiries yet</p>
                <p className="text-muted-foreground text-sm mt-2">Visitor inquiries will appear here</p>
              </Card>
            ) : (
              agentInquiries.map((inquiry: any) => (
                <Card
                  key={inquiry.id}
                  className={`p-6 border-l-4 ${getStatusColor(inquiry.status)}`}
                  data-testid={`card-inquiry-${inquiry.id}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{inquiry.senderName}</h3>
                      <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {inquiry.senderEmail}
                        </p>
                        {inquiry.senderPhone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {inquiry.senderPhone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={getStatusBadge(inquiry.status)}
                      data-testid={`badge-status-${inquiry.status}`}
                    >
                      {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                    </Badge>
                  </div>

                  {inquiry.message && (
                    <div className="bg-muted p-4 rounded mb-4">
                      <p className="text-foreground text-sm">{inquiry.message}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Inquiry Type</p>
                      <p className="font-semibold text-foreground">{inquiry.inquiryType || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-semibold text-foreground">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-4 pb-12" data-testid="section-applications">
            {appsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading applications...</p>
              </Card>
            ) : ownerApplications.length === 0 ? (
              <Card className="p-12 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No applications yet</p>
                <p className="text-muted-foreground text-sm mt-2">Applications for your properties will appear here</p>
              </Card>
            ) : (
              ownerApplications.map((app: any) => {
                const getAppStatusBadge = (status: string) => {
                  const variants: Record<string, string> = {
                    approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
                    approved_pending_lease: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
                    rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
                    under_review: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
                    pending_verification: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
                    pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
                    draft: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
                    withdrawn: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                    expired: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                  };
                  return variants[status] || variants.draft;
                };

                const getAppStatusIcon = (status: string) => {
                  switch (status) {
                    case 'approved':
                    case 'approved_pending_lease':
                      return <CheckCircle className="h-5 w-5 text-green-500" />;
                    case 'rejected':
                      return <XCircle className="h-5 w-5 text-red-500" />;
                    case 'under_review':
                    case 'pending_verification':
                      return <Clock className="h-5 w-5 text-blue-500" />;
                    case 'pending':
                      return <Clock className="h-5 w-5 text-yellow-500" />;
                    default:
                      return <FileText className="h-5 w-5 text-gray-500" />;
                  }
                };

                const formatAppStatus = (status: string) => {
                  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                };

                return (
                  <Card
                    key={app.id}
                    className="p-6"
                    data-testid={`card-application-${app.id}`}
                  >
                    <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-foreground">
                          {app.users?.full_name || 'Unknown Applicant'}
                        </h3>
                        <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {app.users?.email || 'No email'}
                          </p>
                          {app.users?.phone && (
                            <p className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {app.users.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAppStatusIcon(app.status)}
                        <Badge className={getAppStatusBadge(app.status)}>
                          {formatAppStatus(app.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {app.properties?.title || 'Unknown Property'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {app.properties?.address}
                        {app.properties?.city && `, ${app.properties.city}`}
                        {app.properties?.state && `, ${app.properties.state}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="font-semibold text-foreground">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {app.score && (
                        <div>
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="font-semibold text-foreground">
                            {app.score}/100
                          </p>
                        </div>
                      )}
                      {app.employment?.income && (
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly Income</p>
                          <p className="font-semibold text-foreground">
                            ${Number(app.employment.income).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {app.expires_at && (
                        <div>
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="font-semibold text-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                            {new Date(app.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/applications/${app.id}`}>
                        <Button size="sm" data-testid={`button-view-application-${app.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      {app.property_id && (
                        <Link href={`/property/${app.property_id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-property-${app.id}`}>
                            View Property
                          </Button>
                        </Link>
                      )}
                      {!app.score && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => scoreApplication(app.id)}
                          disabled={isScoringApplication}
                          data-testid={`button-score-application-${app.id}`}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Score
                        </Button>
                      )}
                      {app.status !== 'approved' && app.status !== 'approved_pending_lease' && app.status !== 'rejected' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 border-green-600"
                            onClick={() => updateStatus({ applicationId: app.id, status: 'approved' })}
                            disabled={isUpdatingStatus}
                            data-testid={`button-approve-application-${app.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 border-red-600"
                            onClick={() => updateStatus({ 
                              applicationId: app.id, 
                              status: 'rejected',
                              options: { rejectionReason: 'Application does not meet criteria' }
                            })}
                            disabled={isUpdatingStatus}
                            data-testid={`button-reject-application-${app.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-orange-600 border-orange-600"
                            onClick={() => updateStatus({ 
                              applicationId: app.id, 
                              status: 'pending_verification',
                              options: { reason: 'Additional documents required' }
                            })}
                            disabled={isUpdatingStatus}
                            data-testid={`button-request-docs-${app.id}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Request Docs
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Requirements */}
        {activeTab === 'requirements' && (
          <div className="space-y-4 pb-12" data-testid="section-requirements">
            {!showNewRequirementForm ? (
              <Button
                onClick={() => setShowNewRequirementForm(true)}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-add-requirement"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Requirement
              </Button>
            ) : (
              <Card className="p-6 border-l-4 border-purple-500">
                <h3 className="font-bold text-lg mb-4 text-foreground">Add New Client Requirement</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Client Name"
                      value={newRequirement.contactName}
                      onChange={(e) =>
                        setNewRequirement({ ...newRequirement, contactName: e.target.value })
                      }
                      data-testid="input-client-name"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newRequirement.contactEmail}
                      onChange={(e) =>
                        setNewRequirement({ ...newRequirement, contactEmail: e.target.value })
                      }
                      data-testid="input-client-email"
                    />
                  </div>
                  <Input
                    placeholder="Phone"
                    value={newRequirement.contactPhone}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, contactPhone: e.target.value })
                    }
                    data-testid="input-client-phone"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      type="number"
                      placeholder="Min Budget"
                      value={newRequirement.budgetMin}
                      onChange={(e) =>
                        setNewRequirement({ ...newRequirement, budgetMin: Number(e.target.value) })
                      }
                      data-testid="input-budget-min"
                    />
                    <Input
                      type="number"
                      placeholder="Max Budget"
                      value={newRequirement.budgetMax}
                      onChange={(e) =>
                        setNewRequirement({ ...newRequirement, budgetMax: Number(e.target.value) })
                      }
                      data-testid="input-budget-max"
                    />
                    <Input
                      type="number"
                      placeholder="Bedrooms"
                      value={newRequirement.bedrooms}
                      onChange={(e) =>
                        setNewRequirement({ ...newRequirement, bedrooms: Number(e.target.value) })
                      }
                      data-testid="input-bedrooms"
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Bathrooms"
                    value={newRequirement.bathrooms}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, bathrooms: Number(e.target.value) })
                    }
                    data-testid="input-bathrooms"
                  />
                  <Input
                    placeholder="Preferred Locations (comma-separated)"
                    value={newRequirement.locations}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, locations: e.target.value })
                    }
                    data-testid="input-locations"
                  />
                  <Input
                    placeholder="Desired Amenities (comma-separated)"
                    value={newRequirement.amenities}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, amenities: e.target.value })
                    }
                    data-testid="input-amenities"
                  />
                  <Input
                    placeholder="Lease Term"
                    value={newRequirement.leaseTerm}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, leaseTerm: e.target.value })
                    }
                    data-testid="input-lease-term"
                  />
                  <Input
                    type="date"
                    value={newRequirement.moveInDate}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, moveInDate: e.target.value })
                    }
                    data-testid="input-move-in-date"
                  />
                  <Textarea
                    placeholder="Additional Notes"
                    value={newRequirement.additionalNotes}
                    onChange={(e) =>
                      setNewRequirement({ ...newRequirement, additionalNotes: e.target.value })
                    }
                    data-testid="textarea-notes"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddRequirement}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-save-requirement"
                    >
                      Save Requirement
                    </Button>
                    <Button
                      onClick={() => setShowNewRequirementForm(false)}
                      variant="outline"
                      data-testid="button-cancel-requirement"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {reqsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading requirements...</p>
              </Card>
            ) : requirements.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No requirements yet</p>
                <p className="text-muted-foreground text-sm mt-2">Add client requirements to match with properties</p>
              </Card>
            ) : (
              requirements.map((req) => (
                <Card key={req.id} className="p-6" data-testid={`card-requirement-${req.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground">{req.contactName}</h3>
                      <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {req.contactEmail}
                        </p>
                        {req.contactPhone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {req.contactPhone}
                          </p>
                        )}
                      </div>
                    </div>
                    <ConfirmDialog
                      title="Delete Requirement"
                      description="Are you sure you want to delete this requirement? This action cannot be undone."
                      onConfirm={() => handleDeleteRequirement(req.id)}
                      trigger={
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`button-delete-requirement-${req.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {req.budgetMin && req.budgetMax && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Budget
                        </p>
                        <p className="font-semibold text-foreground">
                          ${(req.budgetMin || 0).toLocaleString()} - ${(req.budgetMax || 0).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {req.bedrooms && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bedrooms</p>
                        <p className="font-semibold text-foreground">{req.bedrooms}+</p>
                      </div>
                    )}
                    {req.bathrooms && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bathrooms</p>
                        <p className="font-semibold text-foreground">{req.bathrooms}+</p>
                      </div>
                    )}
                    {req.moveInDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Move-In</p>
                        <p className="font-semibold text-foreground">
                          {new Date(req.moveInDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {req.locations && req.locations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2">Preferred Locations</p>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(req.locations) ? req.locations : [req.locations]).map(
                          (loc: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {loc}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {req.additionalNotes && (
                    <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                      <strong className="text-foreground">Notes:</strong> {req.additionalNotes}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Property Matching */}
        {activeTab === 'matching' && (
          <div className="space-y-6 pb-12" data-testid="section-matching">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Property Matching</h2>
                <p className="text-muted-foreground mt-1">Match client requirements with available properties</p>
              </div>
              <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                {matchedProperties.filter(m => m.matchCount > 0).length} matches found
              </Badge>
            </div>

            {propsLoading || reqsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Finding matches...</p>
              </Card>
            ) : requirements.length === 0 ? (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No client requirements yet</p>
                <p className="text-muted-foreground text-sm mt-2">Add requirements in the Requirements tab to find matches</p>
                <Button
                  onClick={() => setActiveTab('requirements')}
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  data-testid="button-go-to-requirements"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Requirements
                </Button>
              </Card>
            ) : matchedProperties.filter(m => m.matchCount > 0).length === 0 ? (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No matching properties found</p>
                <p className="text-muted-foreground text-sm mt-2">None of your {requirements.length} requirement(s) match available properties</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting requirements or wait for new listings</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {matchedProperties.filter(m => m.matchCount > 0).map((match) => (
                  <Card key={match.requirement.id} className="p-6" data-testid={`card-match-${match.requirement.id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                          <Users className="h-5 w-5 text-purple-600" />
                          {match.requirement.contactName}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{match.requirement.contactEmail}</p>
                      </div>
                      <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {match.matchCount} {match.matchCount === 1 ? 'match' : 'matches'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {match.requirement.budgetMin && match.requirement.budgetMax && (
                        <Badge variant="outline">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${match.requirement.budgetMin.toLocaleString()} - ${match.requirement.budgetMax.toLocaleString()}
                        </Badge>
                      )}
                      {match.requirement.bedrooms > 0 && (
                        <Badge variant="outline">
                          <Bed className="h-3 w-3 mr-1" />
                          {match.requirement.bedrooms}+ beds
                        </Badge>
                      )}
                      {match.requirement.bathrooms > 0 && (
                        <Badge variant="outline">
                          <Bath className="h-3 w-3 mr-1" />
                          {match.requirement.bathrooms}+ baths
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {match.matches.map((prop: any) => (
                        <div 
                          key={prop.id} 
                          className="border border-border rounded-md p-4 bg-muted/50"
                          data-testid={`match-property-${prop.id}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Home className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold text-foreground text-sm truncate">{prop.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {prop.city}, {prop.state}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Bed className="h-3 w-3" /> {prop.bedrooms}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" /> {prop.bathrooms}
                            </span>
                          </div>
                          <p className="font-bold text-purple-600 dark:text-purple-400 text-sm mb-3">
                            ${(prop.price || 0).toLocaleString()}/mo
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/property/${prop.id}`)}
                            className="w-full"
                            data-testid={`button-view-match-${prop.id}`}
                          >
                            View Property
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'leads' && (
          <div className="space-y-6 pb-12" data-testid="section-analytics">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Lead Analytics</h2>
                <p className="text-muted-foreground mt-1">Track your performance and conversion metrics</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Lead Activity Chart */}
              <Card className="p-6" data-testid="chart-weekly-leads">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Weekly Lead Activity
                </h3>
                <div className="h-64 flex items-center justify-center">
                  {stats.inquiries > 0 || stats.requirements > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyLeadData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="inquiries" fill="#8b5cf6" name="Inquiries" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="requirements" fill="#6366f1" name="Requirements" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No lead data yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Lead activity will appear here</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Conversion Rate Pie Chart */}
              <Card className="p-6" data-testid="chart-conversion">
                <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Inquiry Status Breakdown
                </h3>
                <div className="h-64 flex items-center justify-center">
                  {stats.inquiries > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={conversionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {conversionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number, name: string, props: any) => {
                            const actualVal = props.payload?.actualValue ?? 0;
                            return [actualVal, name];
                          }}
                        />
                        <Legend 
                          formatter={(value: string, entry: any) => {
                            const actualVal = entry.payload?.actualValue ?? 0;
                            return `${value}: ${actualVal}`;
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No inquiry data yet</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="p-6" data-testid="card-performance">
              <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-md text-center">
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.inquiries}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Inquiries</p>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950 rounded-md text-center">
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stats.requirements}</p>
                  <p className="text-xs text-muted-foreground mt-1">Requirements</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.respondedInquiries + stats.closedInquiries}</p>
                  <p className="text-xs text-muted-foreground mt-1">Converted</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-md text-center">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
                </div>
              </div>
            </Card>

            {/* Tips Card */}
            <Card className="p-6" data-testid="card-tips">
              <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Tips to Improve Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Respond within 24 hours</p>
                    <p className="text-xs text-muted-foreground">Quick responses improve conversion by 40%</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Use Property Matching</p>
                    <p className="text-xs text-muted-foreground">Match requirements with listings automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Follow up regularly</p>
                    <p className="text-xs text-muted-foreground">Keep clients engaged with updates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Track preferences</p>
                    <p className="text-xs text-muted-foreground">Personalize recommendations for better results</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
