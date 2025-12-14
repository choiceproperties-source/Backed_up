import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { 
  Trash2, Edit2, Plus, Home, Users, Star, FileText, MessageSquare, Shield, 
  Check, X, LogOut, LayoutDashboard, Search, BarChart3, Menu, Eye, Filter,
  CheckCircle, XCircle, Clock, Mail, Phone, Calendar, DollarSign, MapPin,
  AlertTriangle, Flag, FileCheck, Scale
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  getProperties, getAllUsers, getAllReviews, getInquiries, getApplications,
  createProperty, updateProperty, deleteProperty, deleteReview, updateUserRole,
  createUser, deleteUser, updateApplication, updateInquiryStatus,
  getSavedSearches, deleteSavedSearch,
  getManagedPersonas, createManagedPersona, updateManagedPersona, deleteManagedPersona,
  getAdminSettings, saveAdminSetting,
  getContentReports, updateContentReport,
  getDisputes, updateDispute, addDisputeMessage, getDisputeMessages,
  getDocumentVerifications, updateDocumentVerification,
  flagPropertyListing
} from '@/lib/supabase-service';
import { UserCog, Settings } from 'lucide-react';

interface Property {
  id: string; title: string; address: string; city: string; state: string;
  price: number; bedrooms: number; bathrooms: number; property_type: string;
  status: string; created_at: string; owner_id?: string; description?: string;
}

interface User {
  id: string; email: string; full_name: string; role: string; created_at: string;
}

interface Review {
  id: string; property_id: string; user_id: string; rating: number;
  comment: string; created_at: string;
  users?: { full_name: string; email: string };
  properties?: { title: string };
}

interface Inquiry {
  id: string; sender_name: string; sender_email: string; sender_phone?: string;
  message: string; status: string; created_at: string;
  property_id?: string; properties?: { title: string };
}

interface ScoreBreakdown {
  incomeScore: number;
  creditScore: number;
  rentalHistoryScore: number;
  employmentScore: number;
  documentsScore: number;
  totalScore: number;
  maxScore: number;
  factors: {
    incomeToRentRatio?: number;
    creditRating?: string;
    employmentStatus?: string;
    rentalHistoryYears?: number;
    documentsProvided?: number;
  };
}

interface Application {
  id: string; status: string; created_at: string; user_id?: string;
  property_id?: string; users?: { id: string; full_name: string; email: string };
  properties?: { title: string; price?: number }; move_in_date?: string; message?: string;
  score?: number; score_breakdown?: ScoreBreakdown; scored_at?: string;
  monthly_income?: number; employment_status?: string; credit_score_range?: string;
}

interface SavedSearch {
  id: string; user_id: string; name: string; filters: any;
  created_at: string; users?: { full_name: string; email: string };
}

interface Persona {
  id: string; email: string; full_name: string; role: string; created_at: string;
  display_email?: string; display_phone?: string; bio?: string; profile_image?: string;
  location?: string; specialties?: string[]; years_experience?: number;
  is_managed_profile: boolean; managed_by?: string;
}

interface ContentReport {
  id: string; reporter_id?: string; property_id?: string; review_id?: string;
  report_type: string; description?: string; status: string; priority: string;
  assigned_to?: string; resolution?: string; resolved_at?: string; resolved_by?: string;
  created_at: string; updated_at?: string;
  reporter?: { id: string; full_name: string; email: string };
  property?: { id: string; title: string; address: string };
  review?: { id: string; comment: string; rating: number };
  assigned?: { id: string; full_name: string };
}

interface Dispute {
  id: string; initiator_id?: string; respondent_id?: string; property_id?: string;
  application_id?: string; dispute_type: string; subject: string; description: string;
  status: string; priority: string; assigned_to?: string; resolution?: string;
  resolved_at?: string; resolved_by?: string; created_at: string; updated_at?: string;
  initiator?: { id: string; full_name: string; email: string };
  respondent?: { id: string; full_name: string; email: string };
  property?: { id: string; title: string };
  application?: { id: string; status: string };
  assigned?: { id: string; full_name: string };
}

interface DocumentVerification {
  id: string; user_id?: string; application_id?: string; file_id?: string;
  document_type: string; status: string; rejection_reason?: string; notes?: string;
  verified_at?: string; verified_by?: string; created_at: string; updated_at?: string;
  user?: { id: string; full_name: string; email: string };
  application?: { id: string; status: string };
  file?: { id: string; filename: string; original_name: string; mime_type: string };
  verifier?: { id: string; full_name: string };
}

export default function Admin() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [adminSettings, setAdminSettings] = useState<Record<string, string>>({});
  const [contentReports, setContentReports] = useState<ContentReport[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [documentVerifications, setDocumentVerifications] = useState<DocumentVerification[]>([]);

  // Modal states
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showEditProperty, setShowEditProperty] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [showInquiryDetails, setShowInquiryDetails] = useState(false);
  const [showSearchDetails, setShowSearchDetails] = useState(false);
  const [showAddPersona, setShowAddPersona] = useState(false);
  const [showEditPersona, setShowEditPersona] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [newPersona, setNewPersona] = useState({ fullName: '', email: '', displayEmail: '', displayPhone: '', role: 'agent', bio: '', location: '' });
  const [editPersonaData, setEditPersonaData] = useState<Partial<Persona>>({});

  // Delete confirmation states
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // Selected items for editing/viewing
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(null);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentVerification | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [showDisputeDetails, setShowDisputeDetails] = useState(false);
  const [showDocumentDetails, setShowDocumentDetails] = useState(false);
  const [moderationTab, setModerationTab] = useState<'reports' | 'disputes' | 'documents'>('reports');

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState({ status: 'all', city: '', minPrice: '', maxPrice: '' });
  const [applicationFilter, setApplicationFilter] = useState('all');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationSort, setApplicationSort] = useState('newest');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [inquiryFilter, setInquiryFilter] = useState('all');

  // Form states
  const [newProperty, setNewProperty] = useState({
    title: '', price: '', address: '', city: '', state: '',
    bedrooms: '', bathrooms: '', property_type: 'house', description: '',
  });
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'user' });
  const [editPropertyData, setEditPropertyData] = useState<Partial<Property>>({});
  const [editUserData, setEditUserData] = useState<Partial<User>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [props, usersData, reviewsData, inqsData, appsData, searchesData, personasData, settingsData, reportsData, disputesData, docsData] = await Promise.all([
        getProperties(), getAllUsers(), getAllReviews(), getInquiries(), getApplications(), getSavedSearches(),
        getManagedPersonas(), getAdminSettings(), getContentReports(), getDisputes(), getDocumentVerifications()
      ]);
      setProperties(props as any[]);
      setUsers(usersData);
      setReviews(reviewsData);
      setInquiries(inqsData || []);
      setApplications(appsData || []);
      setSavedSearches(searchesData || []);
      setPersonas(personasData || []);
      setAdminSettings(settingsData || {});
      setContentReports(reportsData || []);
      setDisputes(disputesData || []);
      setDocumentVerifications(docsData || []);
    } catch (error) {
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to access the admin panel.</p>
          <p className="text-sm text-muted-foreground mb-6">Admin access requires the 'admin' role.</p>
          <Link href="/">
            <Button className="w-full" data-testid="button-go-home">Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Stats calculations
  const scoredApplications = applications.filter(a => a.score !== undefined && a.score !== null);
  const highScoreApplications = scoredApplications.filter(a => (a.score || 0) >= 70);
  const pendingHighScore = applications.filter(a => a.status === 'pending' && (a.score || 0) >= 70);
  const underReviewApplications = applications.filter(a => a.status === 'under_review');
  
  const stats = {
    totalProperties: properties.length,
    activeProperties: properties.filter(p => p.status === 'active').length,
    totalUsers: users.length,
    renters: users.filter(u => u.role === 'renter' || u.role === 'user').length,
    owners: users.filter(u => u.role === 'owner').length,
    agents: users.filter(u => u.role === 'agent').length,
    admins: users.filter(u => u.role === 'admin').length,
    totalReviews: reviews.length,
    avgRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0',
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === 'pending').length,
    underReviewApplications: underReviewApplications.length,
    approvedApplications: applications.filter(a => a.status === 'approved').length,
    rejectedApplications: applications.filter(a => a.status === 'rejected').length,
    scoredApplications: scoredApplications.length,
    avgScore: scoredApplications.length > 0 ? Math.round(scoredApplications.reduce((sum, a) => sum + (a.score || 0), 0) / scoredApplications.length) : 0,
    highScoreCount: highScoreApplications.length,
    pendingHighScoreCount: pendingHighScore.length,
    totalInquiries: inquiries.length,
    pendingInquiries: inquiries.filter(i => i.status === 'pending').length,
    totalSavedSearches: savedSearches.length,
  };

  // Filtered data
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      if (propertyFilter.status !== 'all' && p.status !== propertyFilter.status) return false;
      if (propertyFilter.city && !p.city?.toLowerCase().includes(propertyFilter.city.toLowerCase())) return false;
      if (propertyFilter.minPrice && p.price < parseFloat(propertyFilter.minPrice)) return false;
      if (propertyFilter.maxPrice && p.price > parseFloat(propertyFilter.maxPrice)) return false;
      return true;
    });
  }, [properties, propertyFilter]);

  const filteredApplications = useMemo(() => {
    let filtered = applications;
    
    // Filter by status
    if (applicationFilter !== 'all') {
      filtered = filtered.filter(a => a.status === applicationFilter);
    }
    
    // Filter by search term (applicant name or property title)
    if (applicationSearch.trim()) {
      const search = applicationSearch.toLowerCase().trim();
      filtered = filtered.filter(a => 
        a.users?.full_name?.toLowerCase().includes(search) ||
        a.properties?.title?.toLowerCase().includes(search) ||
        a.id.toLowerCase().includes(search)
      );
    }
    
    // Sort applications
    return [...filtered].sort((a, b) => {
      switch (applicationSort) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [applications, applicationFilter, applicationSearch, applicationSort]);

  const filteredUsers = useMemo(() => {
    if (userRoleFilter === 'all') return users;
    return users.filter(u => u.role === userRoleFilter);
  }, [users, userRoleFilter]);

  const filteredInquiries = useMemo(() => {
    if (inquiryFilter === 'all') return inquiries;
    return inquiries.filter(i => i.status === inquiryFilter);
  }, [inquiries, inquiryFilter]);

  // Chart data
  const userRoleData = [
    { name: 'Renters', value: stats.renters, fill: 'hsl(var(--primary))' },
    { name: 'Owners', value: stats.owners, fill: 'hsl(var(--chart-2))' },
    { name: 'Agents', value: stats.agents, fill: 'hsl(var(--chart-3))' },
    { name: 'Admins', value: stats.admins, fill: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  const applicationStatusData = [
    { name: 'Pending', value: stats.pendingApplications, fill: 'hsl(45 93% 47%)' },
    { name: 'Approved', value: stats.approvedApplications, fill: 'hsl(142 76% 36%)' },
    { name: 'Rejected', value: stats.rejectedApplications, fill: 'hsl(0 84% 60%)' },
  ].filter(d => d.value > 0);

  // Applications per property
  const applicationsPerProperty = useMemo(() => {
    const countMap: Record<string, number> = {};
    applications.forEach(app => {
      const propId = app.property_id || 'Unknown';
      countMap[propId] = (countMap[propId] || 0) + 1;
    });
    return properties.slice(0, 10).map(p => ({
      name: p.title?.substring(0, 15) || 'Unknown',
      applications: countMap[p.id] || 0
    }));
  }, [applications, properties]);

  // Inquiries over time (last 7 days)
  const inquiriesOverTime = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = inquiries.filter(inq => inq.created_at?.startsWith(dateStr)).length;
      days.push({ date: date.toLocaleDateString('en-US', { weekday: 'short' }), count });
    }
    return days;
  }, [inquiries]);

  // Handlers
  const handleCreateProperty = async () => {
    if (!user?.id || !newProperty.title || !newProperty.address) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    
    const propertyData = {
      owner_id: user.id,
      title: newProperty.title,
      description: newProperty.description,
      address: newProperty.address,
      city: newProperty.city,
      state: newProperty.state,
      price: parseFloat(newProperty.price) || 0,
      bedrooms: parseInt(newProperty.bedrooms) || 0,
      bathrooms: parseFloat(newProperty.bathrooms) || 0,
      property_type: newProperty.property_type,
      status: 'active',
    };

    const result = await createProperty(propertyData as any);
    if (result) {
      toast({ title: 'Property created successfully' });
      setShowAddProperty(false);
      setNewProperty({ title: '', price: '', address: '', city: '', state: '', bedrooms: '', bathrooms: '', property_type: 'house', description: '' });
      loadData();
    } else {
      toast({ title: 'Failed to create property', variant: 'destructive' });
    }
  };

  const handleUpdateProperty = async () => {
    if (!selectedProperty?.id) return;
    // Filter out undefined/null values to avoid Supabase constraint violations
    const cleanedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(editPropertyData)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanedData[key] = value;
      }
    }
    if (Object.keys(cleanedData).length === 0) {
      toast({ title: 'No changes to update', variant: 'destructive' });
      return;
    }
    const result = await updateProperty(selectedProperty.id, cleanedData);
    if (result) {
      toast({ title: 'Property updated successfully' });
      setShowEditProperty(false);
      setSelectedProperty(null);
      setEditPropertyData({});
      loadData();
    } else {
      toast({ title: 'Failed to update property', variant: 'destructive' });
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const result = await deleteProperty(id);
    if (result) {
      toast({ title: 'Property deleted' });
      setDeleteConfirm(null);
      loadData();
    } else {
      toast({ title: 'Failed to delete property', variant: 'destructive' });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    const result = await createUser(newUser);
    if (result) {
      toast({ title: 'User created successfully' });
      setShowAddUser(false);
      setNewUser({ email: '', full_name: '', role: 'user' });
      loadData();
    } else {
      toast({ title: 'Failed to create user', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    const result = await deleteUser(id);
    if (result) {
      toast({ title: 'User deleted' });
      setDeleteConfirm(null);
      loadData();
    } else {
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    const result = await updateUserRole(userId, newRole);
    if (result) {
      toast({ title: `User role updated to ${newRole}` });
      loadData();
    } else {
      toast({ title: 'Failed to update user role', variant: 'destructive' });
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: string) => {
    const result = await updateApplication(appId, { status });
    if (result) {
      toast({ title: `Application ${status}` });
      setShowApplicationDetails(false);
      loadData();
    } else {
      toast({ title: 'Failed to update application', variant: 'destructive' });
    }
  };

  const handleUpdateInquiryStatus = async (inqId: string, status: string) => {
    const result = await updateInquiryStatus(inqId, status);
    if (result) {
      toast({ title: `Inquiry ${status}` });
      setShowInquiryDetails(false);
      loadData();
    } else {
      toast({ title: 'Failed to update inquiry', variant: 'destructive' });
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    const result = await deleteSavedSearch(id);
    if (result) {
      toast({ title: 'Saved search deleted' });
      setDeleteConfirm(null);
      loadData();
    } else {
      toast({ title: 'Failed to delete saved search', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/');
    } catch (error) {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
    { id: 'saved-searches', label: 'Saved Searches', icon: Search },
    { id: 'personas', label: 'Personas', icon: UserCog },
    { id: 'moderation', label: 'Moderation', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-background border-b sticky top-0 z-40">
        <div className="flex items-center justify-between gap-2 p-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="button-sidebar-toggle">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Admin Panel</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 bg-card border-r fixed lg:static top-16 lg:top-0 left-0 right-0 lg:h-screen overflow-y-auto z-30`}>
        <div className="p-6 space-y-8">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin
            </h1>
          </div>

          <nav className="space-y-2">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    activeSection === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <hr />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.full_name?.[0]?.toUpperCase() || 'A'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid="text-admin-name">{user?.full_name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleLogout} data-testid="button-logout-sidebar">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <div className="hidden lg:block bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 sticky top-0 z-10">
          <div className="px-8 flex justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold capitalize" data-testid="text-section-title">
                {navigationItems.find(n => n.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p className="text-primary-foreground/80 text-sm">Manage your platform</p>
            </div>
            <Badge className="bg-primary-foreground/20">
              <Shield className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {loading && <p className="text-muted-foreground" data-testid="text-loading">Loading data...</p>}

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Home className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Properties</p>
                        <p className="text-2xl font-bold" data-testid="stat-properties">{stats.totalProperties}</p>
                        <p className="text-xs text-muted-foreground">{stats.activeProperties} active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Users</p>
                        <p className="text-2xl font-bold" data-testid="stat-users">{stats.totalUsers}</p>
                        <p className="text-xs text-muted-foreground">{stats.agents} agents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Applications</p>
                        <p className="text-2xl font-bold" data-testid="stat-applications">{stats.totalApplications}</p>
                        <p className="text-xs text-muted-foreground">{stats.pendingApplications} pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Inquiries</p>
                        <p className="text-2xl font-bold" data-testid="stat-inquiries">{stats.totalInquiries}</p>
                        <p className="text-xs text-muted-foreground">{stats.pendingInquiries} pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={userRoleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {userRoleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Application Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={applicationStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {applicationStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Application Scoring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Scored Applications</span>
                        <span className="font-bold" data-testid="stat-scored">{stats.scoredApplications}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average Score</span>
                        <Badge variant={stats.avgScore >= 70 ? 'default' : 'secondary'} data-testid="stat-avg-score">
                          {stats.avgScore}/100
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">High Score (70+)</span>
                        <span className="font-bold text-green-600" data-testid="stat-high-score">{stats.highScoreCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Under Review</span>
                        <span className="font-bold text-blue-600" data-testid="stat-under-review">{stats.underReviewApplications}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {pendingHighScore.length > 0 && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Quick Actions: High-Scoring Pending Applications
                    </CardTitle>
                    <CardDescription>
                      These applications have a score of 70 or higher and are awaiting review
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {pendingHighScore.slice(0, 5).map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`quick-action-${app.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{app.users?.full_name || 'Applicant'}</span>
                              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Score: {app.score}/100
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {app.properties?.title || 'Property'} - Applied {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedApplication(app); setShowApplicationDetails(true); }}
                              data-testid={`quick-view-${app.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateApplicationStatus(app.id, 'approved')}
                              data-testid={`quick-approve-${app.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest applications and inquiries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {[...applications.slice(0, 3).map(a => ({ type: 'application', data: a, date: new Date(a.created_at) })),
                      ...inquiries.slice(0, 3).map(i => ({ type: 'inquiry', data: i, date: new Date(i.created_at) }))]
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .slice(0, 5)
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          {item.type === 'application' ? (
                            <FileText className="h-4 w-4 text-green-600" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-yellow-600" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.type === 'application' 
                                ? `New application for ${(item.data as Application).properties?.title || 'property'}`
                                : `Inquiry from ${(item.data as Inquiry).sender_name}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.date.toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {item.type === 'application' ? (item.data as Application).status : (item.data as Inquiry).status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Section */}
          {activeSection === 'users' && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">All Users ({filteredUsers.length})</h3>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">{stats.renters} renters</Badge>
                    <Badge variant="secondary">{stats.owners} owners</Badge>
                    <Badge variant="secondary">{stats.agents} agents</Badge>
                    <Badge variant="secondary">{stats.admins} admins</Badge>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-32" data-testid="filter-user-role">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="renter">Renter</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddUser(true)} size="sm" data-testid="button-add-user">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Joined</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t" data-testid={`row-user-${u.id}`}>
                        <td className="px-4 py-3 font-medium">{u.full_name || 'N/A'}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={u.role === 'admin' ? 'default' : u.role === 'agent' ? 'secondary' : 'outline'}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Select value={u.role} onValueChange={(newRole) => handleUpdateUserRole(u.id, newRole)}>
                              <SelectTrigger className="w-24 h-8" data-testid={`select-role-${u.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="renter">Renter</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteConfirm({ type: 'user', id: u.id, name: u.full_name || u.email })}
                              data-testid={`button-delete-user-${u.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && <p className="text-muted-foreground text-center py-8">No users found</p>}
              </div>
            </div>
          )}

          {/* Properties Section */}
          {activeSection === 'properties' && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h3 className="text-xl font-semibold">All Properties ({filteredProperties.length})</h3>
                <Button onClick={() => setShowAddProperty(true)} size="sm" data-testid="button-add-property">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>

              {/* Filters */}
              <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={propertyFilter.status} onValueChange={(v) => setPropertyFilter({ ...propertyFilter, status: v })}>
                      <SelectTrigger className="w-32" data-testid="filter-property-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      placeholder="Filter by city"
                      value={propertyFilter.city}
                      onChange={(e) => setPropertyFilter({ ...propertyFilter, city: e.target.value })}
                      className="w-40"
                      data-testid="filter-property-city"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min Price</Label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={propertyFilter.minPrice}
                      onChange={(e) => setPropertyFilter({ ...propertyFilter, minPrice: e.target.value })}
                      className="w-28"
                      data-testid="filter-property-min-price"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Price</Label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={propertyFilter.maxPrice}
                      onChange={(e) => setPropertyFilter({ ...propertyFilter, maxPrice: e.target.value })}
                      className="w-28"
                      data-testid="filter-property-max-price"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPropertyFilter({ status: 'all', city: '', minPrice: '', maxPrice: '' })}
                    data-testid="button-clear-filters"
                  >
                    Clear
                  </Button>
                </div>
              </Card>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredProperties.map(prop => (
                  <Card key={prop.id} className="p-4" data-testid={`card-property-${prop.id}`}>
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{prop.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {prop.address}, {prop.city}
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap items-center">
                          <Badge variant="secondary">{prop.property_type}</Badge>
                          <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>{prop.status}</Badge>
                          <span className="text-sm font-medium text-primary">${prop.price?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { setSelectedProperty(prop); setShowPropertyDetails(true); }}
                          data-testid={`button-view-property-${prop.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { setSelectedProperty(prop); setEditPropertyData(prop); setShowEditProperty(true); }}
                          data-testid={`button-edit-property-${prop.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteConfirm({ type: 'property', id: prop.id, name: prop.title })}
                          data-testid={`button-delete-property-${prop.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredProperties.length === 0 && (
                  <Card className="p-8 text-center">
                    <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No properties found</p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Applications Section */}
          {activeSection === 'applications' && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-semibold">All Applications ({filteredApplications.length})</h3>
                  <div className="flex gap-2 text-xs flex-wrap">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      {stats.pendingApplications} pending
                    </Badge>
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {stats.approvedApplications} approved
                    </Badge>
                    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {stats.rejectedApplications} rejected
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    placeholder="Search by name or property..."
                    value={applicationSearch}
                    onChange={(e) => setApplicationSearch(e.target.value)}
                    className="w-48"
                    data-testid="input-application-search"
                  />
                  <Select value={applicationFilter} onValueChange={setApplicationFilter}>
                    <SelectTrigger className="w-40" data-testid="filter-application-status">
                      <Filter className="h-4 w-4 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="approved_pending_lease">Approved - Pending Lease</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={applicationSort} onValueChange={setApplicationSort}>
                    <SelectTrigger className="w-32" data-testid="sort-applications">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredApplications.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No applications found</p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredApplications.map((app) => (
                    <Card key={app.id} className="p-4" data-testid={`card-application-${app.id}`}>
                      <div className="flex justify-between items-center gap-4 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">Application #{app.id.slice(0, 8)}</p>
                            {app.score !== undefined && app.score !== null && (
                              <Badge 
                                variant="outline" 
                                className={app.score >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : app.score >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                                data-testid={`score-badge-${app.id}`}
                              >
                                Score: {app.score}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(app.created_at).toLocaleDateString()}
                            {app.users?.full_name && <span className="ml-2">by {app.users.full_name}</span>}
                          </p>
                          {app.properties?.title && (
                            <p className="text-sm text-muted-foreground mt-1">Property: {app.properties.title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                            className={app.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : app.status === 'under_review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                          >
                            {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {app.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                            {app.status === 'under_review' && <Eye className="h-3 w-3 mr-1" />}
                            {app.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedApplication(app); setShowApplicationDetails(true); }}
                            data-testid={`button-view-application-${app.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inquiries Section */}
          {activeSection === 'inquiries' && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">All Inquiries ({filteredInquiries.length})</h3>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {stats.pendingInquiries} pending
                  </Badge>
                </div>
                <Select value={inquiryFilter} onValueChange={setInquiryFilter}>
                  <SelectTrigger className="w-36" data-testid="filter-inquiry-status">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredInquiries.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No inquiries found</p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredInquiries.map((inq) => (
                    <Card key={inq.id} className="p-4" data-testid={`card-inquiry-${inq.id}`}>
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex-1">
                          <p className="font-medium">{inq.sender_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {inq.sender_email}
                          </p>
                          {inq.sender_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {inq.sender_phone}
                            </p>
                          )}
                          <p className="text-sm mt-2 line-clamp-2">{inq.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{new Date(inq.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={inq.status === 'closed' ? 'default' : inq.status === 'responded' ? 'secondary' : 'outline'}
                            className={inq.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                          >
                            {inq.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedInquiry(inq); setShowInquiryDetails(true); }}
                            data-testid={`button-view-inquiry-${inq.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
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
          {activeSection === 'saved-searches' && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">Saved Searches ({savedSearches.length})</h3>
              </div>

              {savedSearches.length === 0 ? (
                <Card className="p-8 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No saved searches yet</p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {savedSearches.map((search) => (
                    <Card key={search.id} className="p-4" data-testid={`card-search-${search.id}`}>
                      <div className="flex justify-between items-center gap-4 flex-wrap">
                        <div className="flex-1">
                          <p className="font-medium">{search.name || 'Unnamed Search'}</p>
                          <p className="text-sm text-muted-foreground">{search.users?.full_name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(search.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedSearch(search); setShowSearchDetails(true); }}
                            data-testid={`button-view-search-${search.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Filters
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeleteConfirm({ type: 'search', id: search.id, name: search.name || 'this search' })}
                            data-testid={`button-delete-search-${search.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Moderation Section */}
          {activeSection === 'moderation' && !loading && (
            <div className="space-y-6">
              {/* Moderation Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <Flag className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Content Reports</p>
                        <p className="text-2xl font-bold" data-testid="stat-reports">{contentReports.length}</p>
                        <p className="text-xs text-muted-foreground">{contentReports.filter(r => r.status === 'pending').length} pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Scale className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Disputes</p>
                        <p className="text-2xl font-bold" data-testid="stat-disputes">{disputes.length}</p>
                        <p className="text-xs text-muted-foreground">{disputes.filter(d => d.status === 'open').length} open</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <FileCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Doc Verifications</p>
                        <p className="text-2xl font-bold" data-testid="stat-verifications">{documentVerifications.length}</p>
                        <p className="text-xs text-muted-foreground">{documentVerifications.filter(d => d.status === 'pending').length} pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Moderation Tabs */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={moderationTab === 'reports' ? 'default' : 'outline'}
                  onClick={() => setModerationTab('reports')}
                  data-testid="tab-reports"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Flagged Content ({contentReports.length})
                </Button>
                <Button
                  variant={moderationTab === 'disputes' ? 'default' : 'outline'}
                  onClick={() => setModerationTab('disputes')}
                  data-testid="tab-disputes"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  Disputes ({disputes.length})
                </Button>
                <Button
                  variant={moderationTab === 'documents' ? 'default' : 'outline'}
                  onClick={() => setModerationTab('documents')}
                  data-testid="tab-documents"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Document Verification ({documentVerifications.length})
                </Button>
              </div>

              {/* Content Reports Tab */}
              {moderationTab === 'reports' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Content Reports</CardTitle>
                    <CardDescription>Review flagged listings and reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contentReports.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No content reports</p>
                    ) : (
                      <div className="space-y-3">
                        {contentReports.map((report) => (
                          <div key={report.id} className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg" data-testid={`report-${report.id}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={report.status === 'pending' ? 'destructive' : report.status === 'reviewed' ? 'secondary' : 'outline'}>
                                  {report.status}
                                </Badge>
                                <Badge variant="outline">{report.report_type}</Badge>
                                <Badge variant="outline">{report.priority}</Badge>
                              </div>
                              <p className="font-medium mt-2">{report.property?.title || report.review?.comment?.substring(0, 50) || 'Unknown content'}</p>
                              <p className="text-sm text-muted-foreground mt-1">{report.description || 'No description'}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Reported by: {report.reporter?.full_name || 'Unknown'} on {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedReport(report); setShowReportDetails(true); }}
                              data-testid={`button-view-report-${report.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Disputes Tab */}
              {moderationTab === 'disputes' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Disputes</CardTitle>
                    <CardDescription>Manage user disputes and conflicts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {disputes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No disputes</p>
                    ) : (
                      <div className="space-y-3">
                        {disputes.map((dispute) => (
                          <div key={dispute.id} className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg" data-testid={`dispute-${dispute.id}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={dispute.status === 'open' ? 'destructive' : dispute.status === 'in_progress' ? 'secondary' : 'outline'}>
                                  {dispute.status}
                                </Badge>
                                <Badge variant="outline">{dispute.dispute_type}</Badge>
                                <Badge variant="outline">{dispute.priority}</Badge>
                              </div>
                              <p className="font-medium mt-2">{dispute.subject}</p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{dispute.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {dispute.initiator?.full_name || 'Unknown'} vs {dispute.respondent?.full_name || 'Unknown'} | {new Date(dispute.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedDispute(dispute); setShowDisputeDetails(true); }}
                              data-testid={`button-view-dispute-${dispute.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Document Verification Tab */}
              {moderationTab === 'documents' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Document Verification</CardTitle>
                    <CardDescription>Verify user-submitted documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documentVerifications.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No documents pending verification</p>
                    ) : (
                      <div className="space-y-3">
                        {documentVerifications.map((doc) => (
                          <div key={doc.id} className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg" data-testid={`document-${doc.id}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={doc.status === 'pending' ? 'secondary' : doc.status === 'verified' ? 'default' : 'destructive'}>
                                  {doc.status}
                                </Badge>
                                <Badge variant="outline">{doc.document_type}</Badge>
                              </div>
                              <p className="font-medium mt-2">{doc.file?.original_name || doc.file?.filename || 'Unknown file'}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                User: {doc.user?.full_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Submitted: {new Date(doc.created_at).toLocaleDateString()}
                                {doc.verified_at && ` | Verified: ${new Date(doc.verified_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedDocument(doc); setShowDocumentDetails(true); }}
                              data-testid={`button-view-document-${doc.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Users</p>
                    <p className="text-3xl font-bold" data-testid="analytics-users">{stats.totalUsers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Properties</p>
                    <p className="text-3xl font-bold" data-testid="analytics-properties">{stats.totalProperties}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Applications</p>
                    <p className="text-3xl font-bold" data-testid="analytics-applications">{stats.totalApplications}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Inquiries</p>
                    <p className="text-3xl font-bold" data-testid="analytics-inquiries">{stats.totalInquiries}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Applications per Property</CardTitle>
                    <CardDescription>Top 10 properties by application count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={applicationsPerProperty}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="applications" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Users by Role</CardTitle>
                    <CardDescription>Distribution of user roles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={userRoleData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                          {userRoleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inquiries Over Time</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={inquiriesOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Add Property Modal */}
      <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>Create a new property listing</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={newProperty.title} onChange={(e) => setNewProperty({ ...newProperty, title: e.target.value })} data-testid="input-property-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input type="number" value={newProperty.price} onChange={(e) => setNewProperty({ ...newProperty, price: e.target.value })} data-testid="input-property-price" />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={newProperty.property_type} onValueChange={(v) => setNewProperty({ ...newProperty, property_type: v })}>
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input value={newProperty.address} onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })} data-testid="input-property-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={newProperty.city} onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })} data-testid="input-property-city" />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input value={newProperty.state} onChange={(e) => setNewProperty({ ...newProperty, state: e.target.value })} data-testid="input-property-state" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Bedrooms</Label>
                <Input type="number" value={newProperty.bedrooms} onChange={(e) => setNewProperty({ ...newProperty, bedrooms: e.target.value })} data-testid="input-property-bedrooms" />
              </div>
              <div className="grid gap-2">
                <Label>Bathrooms</Label>
                <Input type="number" value={newProperty.bathrooms} onChange={(e) => setNewProperty({ ...newProperty, bathrooms: e.target.value })} data-testid="input-property-bathrooms" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={newProperty.description} onChange={(e) => setNewProperty({ ...newProperty, description: e.target.value })} data-testid="input-property-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProperty(false)}>Cancel</Button>
            <Button onClick={handleCreateProperty} data-testid="button-save-property">Create Property</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Property Modal */}
      <Dialog open={showEditProperty} onOpenChange={setShowEditProperty}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>Update property details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editPropertyData.title || ''} onChange={(e) => setEditPropertyData({ ...editPropertyData, title: e.target.value })} data-testid="input-edit-property-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input type="number" value={editPropertyData.price || ''} onChange={(e) => setEditPropertyData({ ...editPropertyData, price: parseFloat(e.target.value) })} data-testid="input-edit-property-price" />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editPropertyData.status || 'active'} onValueChange={(v) => setEditPropertyData({ ...editPropertyData, status: v })}>
                  <SelectTrigger data-testid="select-edit-property-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input value={editPropertyData.address || ''} onChange={(e) => setEditPropertyData({ ...editPropertyData, address: e.target.value })} data-testid="input-edit-property-address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input value={editPropertyData.city || ''} onChange={(e) => setEditPropertyData({ ...editPropertyData, city: e.target.value })} data-testid="input-edit-property-city" />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input value={editPropertyData.state || ''} onChange={(e) => setEditPropertyData({ ...editPropertyData, state: e.target.value })} data-testid="input-edit-property-state" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProperty(false)}>Cancel</Button>
            <Button onClick={handleUpdateProperty} data-testid="button-update-property">Update Property</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Property Details Modal */}
      <Dialog open={showPropertyDetails} onOpenChange={setShowPropertyDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProperty?.title}</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">${selectedProperty.price?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedProperty.status === 'active' ? 'default' : 'secondary'}>{selectedProperty.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedProperty.property_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-medium">{selectedProperty.bedrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-medium">{selectedProperty.bathrooms}</p>
                </div>
              </div>
              {selectedProperty.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedProperty.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} data-testid="input-user-name" />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} data-testid="input-user-email" />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="renter">Renter</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} data-testid="button-save-user">Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Details Modal */}
      <Dialog open={showApplicationDetails} onOpenChange={setShowApplicationDetails}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Application ID</p>
                  <p className="font-medium font-mono text-xs">{selectedApplication.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={selectedApplication.status === 'approved' ? 'default' : selectedApplication.status === 'rejected' ? 'destructive' : 'secondary'}
                    className={selectedApplication.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : selectedApplication.status === 'under_review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                    data-testid="badge-application-status"
                  >
                    {selectedApplication.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Applicant</p>
                  <p className="font-medium">{selectedApplication.users?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium text-sm">{new Date(selectedApplication.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedApplication.properties && (
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{selectedApplication.properties.title}</p>
                  {selectedApplication.properties.price && (
                    <p className="text-sm text-muted-foreground">${selectedApplication.properties.price.toLocaleString()}/mo</p>
                  )}
                </div>
              )}

              {/* Scoring Section */}
              {selectedApplication.score !== undefined && selectedApplication.score !== null && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">Application Score</p>
                    <Badge 
                      variant={selectedApplication.score >= 70 ? 'default' : selectedApplication.score >= 50 ? 'secondary' : 'destructive'}
                      className={selectedApplication.score >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                      data-testid="badge-application-score"
                    >
                      {selectedApplication.score}/100
                    </Badge>
                  </div>
                  
                  {selectedApplication.score_breakdown && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Income (25 pts)</span>
                        <span className="font-medium">{selectedApplication.score_breakdown.incomeScore || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Credit (25 pts)</span>
                        <span className="font-medium">{selectedApplication.score_breakdown.creditScore || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rental History (20 pts)</span>
                        <span className="font-medium">{selectedApplication.score_breakdown.rentalHistoryScore || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Employment (15 pts)</span>
                        <span className="font-medium">{selectedApplication.score_breakdown.employmentScore || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Documents (15 pts)</span>
                        <span className="font-medium">{selectedApplication.score_breakdown.documentsScore || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Score Factors */}
                  {selectedApplication.score_breakdown?.factors && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Key Factors</p>
                      {selectedApplication.score_breakdown.factors.incomeToRentRatio && (
                        <p className="text-xs">Income-to-Rent Ratio: {selectedApplication.score_breakdown.factors.incomeToRentRatio.toFixed(1)}x</p>
                      )}
                      {selectedApplication.score_breakdown.factors.creditRating && (
                        <p className="text-xs">Credit: {selectedApplication.score_breakdown.factors.creditRating}</p>
                      )}
                      {selectedApplication.score_breakdown.factors.employmentStatus && (
                        <p className="text-xs">Employment: {selectedApplication.score_breakdown.factors.employmentStatus}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedApplication.message && (
                <div>
                  <p className="text-sm text-muted-foreground">Message</p>
                  <p className="text-sm">{selectedApplication.message}</p>
                </div>
              )}
              
              {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'approved')} className="flex-1" data-testid="button-approve-application">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'rejected')} className="flex-1" data-testid="button-reject-application">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inquiry Details Modal */}
      <Dialog open={showInquiryDetails} onOpenChange={setShowInquiryDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-medium">{selectedInquiry.sender_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{selectedInquiry.sender_email}</p>
              </div>
              {selectedInquiry.sender_phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedInquiry.sender_phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Message</p>
                <p className="text-sm whitespace-pre-wrap">{selectedInquiry.message}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="font-medium">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{selectedInquiry.status}</Badge>
              </div>
              {selectedInquiry.status !== 'closed' && (
                <div className="flex gap-2 pt-4">
                  {selectedInquiry.status === 'pending' && (
                    <Button onClick={() => handleUpdateInquiryStatus(selectedInquiry.id, 'responded')} className="flex-1" data-testid="button-respond-inquiry">
                      <Check className="h-4 w-4 mr-2" />
                      Mark Responded
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => handleUpdateInquiryStatus(selectedInquiry.id, 'closed')} className="flex-1" data-testid="button-close-inquiry">
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Saved Search Details Modal */}
      <Dialog open={showSearchDetails} onOpenChange={setShowSearchDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Saved Search Filters</DialogTitle>
          </DialogHeader>
          {selectedSearch && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Search Name</p>
                <p className="font-medium">{selectedSearch.name || 'Unnamed'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p className="font-medium">{selectedSearch.users?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filters Applied</p>
                {selectedSearch.filters ? (
                  <div className="bg-muted p-3 rounded-md mt-2">
                    <pre className="text-xs overflow-auto">{JSON.stringify(selectedSearch.filters, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No filters saved</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(selectedSearch.created_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.type === 'property') handleDeleteProperty(deleteConfirm.id);
                else if (deleteConfirm?.type === 'user') handleDeleteUser(deleteConfirm.id);
                else if (deleteConfirm?.type === 'search') handleDeleteSavedSearch(deleteConfirm.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
