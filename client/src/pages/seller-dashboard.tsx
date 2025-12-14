import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useOwnedProperties } from '@/hooks/use-owned-properties';
import { usePropertyApplications } from '@/hooks/use-property-applications';
import { usePropertyInquiries } from '@/hooks/use-property-inquiries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Home,
  FileText,
  MessageSquare,
  LogOut,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function SellerDashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('properties');
  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);
  const [newProperty, setNewProperty] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    price: 0,
    bedrooms: 1,
    bathrooms: 1,
    description: '',
  });

  // Fetch hooks
  const { properties, loading: propsLoading, createProperty, deleteProperty } = useOwnedProperties();
  const { applications, loading: appsLoading, updateStatus } = usePropertyApplications();
  const { inquiries, loading: inquiriesLoading, updateStatus: updateInquiryStatus } = usePropertyInquiries();

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  // Calculate stats
  const stats = useMemo(() => ({
    properties: properties.length,
    applications: applications.length,
    inquiries: inquiries.length,
    approvedApps: applications.filter((a: any) => a.status === 'approved').length,
    pendingApps: applications.filter((a: any) => a.status === 'pending').length,
    pendingInquiries: inquiries.filter((i: any) => i.status === 'pending').length,
  }), [properties, applications, inquiries]);

  // Handle add property
  const handleAddProperty = async () => {
    if (!newProperty.title || !newProperty.address) {
      toast({
        title: 'Error',
        description: 'Please fill in title and address',
        variant: 'destructive',
      });
      return;
    }

    const result = await createProperty({
      title: newProperty.title,
      address: newProperty.address,
      city: newProperty.city,
      state: newProperty.state,
      price: newProperty.price,
      bedrooms: newProperty.bedrooms,
      bathrooms: newProperty.bathrooms,
      description: newProperty.description,
      status: 'active',
    });

    if (result) {
      setNewProperty({ title: '', address: '', city: '', state: '', price: 0, bedrooms: 1, bathrooms: 1, description: '' });
      setShowNewPropertyForm(false);
    }
  };

  // Handle delete property
  const handleDeleteProperty = async (propertyId: string) => {
    await deleteProperty(propertyId);
  };

  // Handle approve application
  const handleApproveApplication = async (appId: string) => {
    await updateApplicationStatus(appId, 'approved');
  };

  // Handle reject application
  const handleRejectApplication = async (appId: string) => {
    await updateApplicationStatus(appId, 'rejected');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
      approved: 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
      rejected: 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
      responded: 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
      closed: 'bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800',
    };
    return colors[status] || colors.pending;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      responded: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      closed: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-12">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Property Manager Dashboard</h1>
            <p className="text-white/80 mt-2">Manage listings, applications, and inquiries</p>
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
          <Card className="p-4" data-testid="stat-properties">
            <p className="text-sm font-semibold text-muted-foreground">Active Listings</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.properties}</p>
            <Home className="h-4 w-4 text-green-500 mt-2" />
          </Card>
          <Card className="p-4" data-testid="stat-applications">
            <p className="text-sm font-semibold text-muted-foreground">Applications</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.applications}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.pendingApps} pending</p>
          </Card>
          <Card className="p-4" data-testid="stat-inquiries">
            <p className="text-sm font-semibold text-muted-foreground">Inquiries</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.inquiries}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.pendingInquiries} pending</p>
          </Card>
          <Card className="p-4" data-testid="stat-approved">
            <p className="text-sm font-semibold text-muted-foreground">Approved Apps</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.approvedApps}
            </p>
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-2" />
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 mt-12 flex-1">
        <div className="flex gap-2 mb-8 flex-wrap border-b border-border">
          {[
            { id: 'properties', label: 'My Properties', icon: Home },
            { id: 'applications', label: 'Applications', icon: FileText },
            { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-green-600 text-green-600 dark:text-green-400'
                  : 'border-b-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* My Properties */}
        {activeTab === 'properties' && (
          <div className="space-y-4 pb-12" data-testid="section-properties">
            {!showNewPropertyForm ? (
              <Button
                onClick={() => setShowNewPropertyForm(true)}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-add-property"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Property
              </Button>
            ) : (
              <Card className="p-6 border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-4 text-foreground">Add New Property</h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Property Title"
                    value={newProperty.title}
                    onChange={(e) => setNewProperty({ ...newProperty, title: e.target.value })}
                    data-testid="input-property-title"
                  />
                  <Input
                    placeholder="Address"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                    data-testid="input-property-address"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="City"
                      value={newProperty.city}
                      onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                      data-testid="input-property-city"
                    />
                    <Input
                      placeholder="State"
                      value={newProperty.state}
                      onChange={(e) => setNewProperty({ ...newProperty, state: e.target.value })}
                      data-testid="input-property-state"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      type="number"
                      placeholder="Monthly Price"
                      value={newProperty.price}
                      onChange={(e) => setNewProperty({ ...newProperty, price: Number(e.target.value) })}
                      data-testid="input-property-price"
                    />
                    <Input
                      type="number"
                      placeholder="Bedrooms"
                      value={newProperty.bedrooms}
                      onChange={(e) => setNewProperty({ ...newProperty, bedrooms: Number(e.target.value) })}
                      data-testid="input-property-bedrooms"
                    />
                    <Input
                      type="number"
                      placeholder="Bathrooms"
                      value={newProperty.bathrooms}
                      onChange={(e) => setNewProperty({ ...newProperty, bathrooms: Number(e.target.value) })}
                      data-testid="input-property-bathrooms"
                    />
                  </div>
                  <Textarea
                    placeholder="Property Description"
                    value={newProperty.description}
                    onChange={(e) => setNewProperty({ ...newProperty, description: e.target.value })}
                    data-testid="textarea-property-description"
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddProperty}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-save-property"
                    >
                      Save Property
                    </Button>
                    <Button
                      onClick={() => setShowNewPropertyForm(false)}
                      variant="outline"
                      data-testid="button-cancel-property"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {propsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading properties...</p>
              </Card>
            ) : properties.length === 0 ? (
              <Card className="p-12 text-center">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No properties yet</p>
                <p className="text-muted-foreground text-sm mt-2">Add your first property to get started</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {properties.map((property) => (
                  <Card key={property.id} className="overflow-hidden" data-testid={`card-property-${property.id}`}>
                    <div className="aspect-video bg-muted relative flex items-center justify-center">
                      <Home className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-foreground">{property.title}</h3>
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                        <MapPin className="h-4 w-4" />
                        {property.city}, {property.state}
                      </p>
                      <div className="flex gap-4 mb-4 text-sm text-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" /> {property.bedrooms} bed
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4" /> {property.bathrooms} bath
                        </span>
                      </div>
                      <p className="font-bold text-green-600 dark:text-green-400 text-lg mb-4 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {(property.price || 0).toLocaleString()}/mo
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/property/${property.id}`)}
                          data-testid={`button-view-property-${property.id}`}
                        >
                          View
                        </Button>
                        <ConfirmDialog
                          title="Delete Property"
                          description="Are you sure you want to delete this property? All applications and inquiries associated with this property will also be removed. This action cannot be undone."
                          onConfirm={() => handleDeleteProperty(property.id)}
                          trigger={
                            <Button
                              size="sm"
                              variant="ghost"
                              data-testid={`button-delete-property-${property.id}`}
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

        {/* Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-4 pb-12" data-testid="section-applications">
            {appsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading applications...</p>
              </Card>
            ) : applications.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No applications yet</p>
                <p className="text-muted-foreground text-sm mt-2">Applications from renters will appear here</p>
              </Card>
            ) : (
              applications.map((app) => (
                <Card
                  key={app.id}
                  className={`p-6 border-l-4 ${getStatusColor(app.status)}`}
                  data-testid={`card-application-${app.id}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        Application from Applicant
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">applicant@example.com</p>
                    </div>
                    <Badge className={getStatusBadge(app.status)} data-testid={`badge-status-${app.status}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Application Fee</p>
                      <p className="font-semibold text-foreground">
                        ${(app.application_fee || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-semibold text-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employment Verified</p>
                      <p className="font-semibold text-foreground">
                        {app.employment ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Documents</p>
                      <p className="font-semibold text-foreground">
                        {app.documents?.length || 0} files
                      </p>
                    </div>
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={() => handleApproveApplication(app.id)}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${app.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectApplication(app.id)}
                        data-testid={`button-reject-${app.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Inquiries */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4 pb-12" data-testid="section-inquiries">
            {inquiriesLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading inquiries...</p>
              </Card>
            ) : inquiries.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No inquiries yet</p>
                <p className="text-muted-foreground text-sm mt-2">Visitor inquiries will appear here</p>
              </Card>
            ) : (
              inquiries.map((inquiry) => (
                <Card
                  key={inquiry.id}
                  className={`p-6 border-l-4 ${getStatusColor(inquiry.status)}`}
                  data-testid={`card-inquiry-${inquiry.id}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{inquiry.senderName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{inquiry.senderEmail}</p>
                      {inquiry.senderPhone && (
                        <p className="text-sm text-muted-foreground">{inquiry.senderPhone}</p>
                      )}
                    </div>
                    <Badge className={getStatusBadge(inquiry.status)} data-testid={`badge-inquiry-status-${inquiry.status}`}>
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

                  {inquiry.status === 'pending' && (
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={() => updateInquiryStatus(inquiry.id, 'responded')}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid={`button-respond-${inquiry.id}`}
                      >
                        Mark as Responded
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInquiryStatus(inquiry.id, 'closed')}
                        data-testid={`button-close-${inquiry.id}`}
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
