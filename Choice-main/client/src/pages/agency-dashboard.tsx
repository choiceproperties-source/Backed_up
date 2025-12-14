import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Building2, Users, DollarSign, TrendingUp, Home, Star,
  Plus, Trash2, Mail, Phone, MapPin, Shield, Loader2,
  BarChart3, FileText, Settings, UserPlus, ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AgencyStats {
  totalAgents: number;
  totalProperties: number;
  activeListings: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  totalRevenue: number;
  totalCommissions: number;
  averageAgentRating: number;
  totalSales: number;
}

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_image: string;
  bio: string;
  license_number: string;
  license_verified: boolean;
  specialties: string[];
  years_experience: number;
  total_sales: number;
  rating: string;
  review_count: number;
  location: string;
}

interface Transaction {
  id: string;
  property: { id: string; title: string; address: string; city: string; state: string };
  agent: { id: string; full_name: string; email: string };
  transaction_type: string;
  transaction_amount: string;
  commission_amount: string;
  agent_commission: string;
  agency_commission: string;
  status: string;
  closed_at: string;
  created_at: string;
}

export default function AgencyDashboard() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateAgency, setShowCreateAgency] = useState(false);
  const [agencyForm, setAgencyForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    licenseNumber: '',
    commissionRate: '3',
  });

  const { data: agencyData, isLoading: agencyLoading } = useQuery({
    queryKey: ['/api/agencies'],
    enabled: isLoggedIn,
  });

  const userAgency = (agencyData as any)?.data?.find((a: any) => a.owner_id === user?.id);

  const { data: agencyDetails } = useQuery({
    queryKey: ['/api/agencies', userAgency?.id],
    enabled: !!userAgency?.id,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/agencies', userAgency?.id, 'stats'],
    enabled: !!userAgency?.id,
  });

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['/api/agencies', userAgency?.id, 'agents'],
    enabled: !!userAgency?.id,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions'],
    enabled: !!userAgency?.id,
  });

  const stats: AgencyStats = (statsData as any)?.data || {
    totalAgents: 0,
    totalProperties: 0,
    activeListings: 0,
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    averageAgentRating: 0,
    totalSales: 0,
  };

  const agents: Agent[] = (agentsData as any)?.data || [];
  const transactions: Transaction[] = (transactionsData as any)?.data || [];

  const createAgencyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/agencies', agencyForm);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agencies'] });
      setShowCreateAgency(false);
      toast({ title: 'Agency created successfully!' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const removeAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest('DELETE', `/api/agencies/${userAgency?.id}/agents/${agentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agencies', userAgency?.id, 'agents'] });
      toast({ title: 'Agent removed from agency' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  if (user.role !== 'agent' && user.role !== 'admin' && user.role !== 'property_manager') {
    navigate('/');
    return null;
  }

  if (agencyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!userAgency && !showCreateAgency) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <Building2 className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4">Create Your Agency</h1>
            <p className="text-muted-foreground mb-6">
              You don't have an agency yet. Create one to start managing agents, 
              tracking transactions, and growing your real estate business.
            </p>
            <Button onClick={() => setShowCreateAgency(true)} data-testid="button-create-agency">
              <Plus className="h-4 w-4 mr-2" />
              Create Agency
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (showCreateAgency) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Create Your Agency</h1>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Agency Name *</label>
                <Input
                  value={agencyForm.name}
                  onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                  placeholder="e.g., Premier Realty Group"
                  data-testid="input-agency-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={agencyForm.description}
                  onChange={(e) => setAgencyForm({ ...agencyForm, description: e.target.value })}
                  placeholder="Brief description of your agency..."
                  data-testid="input-agency-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={agencyForm.email}
                    onChange={(e) => setAgencyForm({ ...agencyForm, email: e.target.value })}
                    placeholder="contact@agency.com"
                    data-testid="input-agency-email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={agencyForm.phone}
                    onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    data-testid="input-agency-phone"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={agencyForm.website}
                  onChange={(e) => setAgencyForm({ ...agencyForm, website: e.target.value })}
                  placeholder="https://www.agency.com"
                  data-testid="input-agency-website"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={agencyForm.address}
                  onChange={(e) => setAgencyForm({ ...agencyForm, address: e.target.value })}
                  placeholder="123 Main Street"
                  data-testid="input-agency-address"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={agencyForm.city}
                    onChange={(e) => setAgencyForm({ ...agencyForm, city: e.target.value })}
                    placeholder="City"
                    data-testid="input-agency-city"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Input
                    value={agencyForm.state}
                    onChange={(e) => setAgencyForm({ ...agencyForm, state: e.target.value })}
                    placeholder="State"
                    data-testid="input-agency-state"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Zip Code</label>
                  <Input
                    value={agencyForm.zipCode}
                    onChange={(e) => setAgencyForm({ ...agencyForm, zipCode: e.target.value })}
                    placeholder="12345"
                    data-testid="input-agency-zip"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">License Number</label>
                  <Input
                    value={agencyForm.licenseNumber}
                    onChange={(e) => setAgencyForm({ ...agencyForm, licenseNumber: e.target.value })}
                    placeholder="License #"
                    data-testid="input-agency-license"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Default Commission Rate (%)</label>
                  <Input
                    type="number"
                    value={agencyForm.commissionRate}
                    onChange={(e) => setAgencyForm({ ...agencyForm, commissionRate: e.target.value })}
                    placeholder="3"
                    data-testid="input-agency-commission"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateAgency(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => createAgencyMutation.mutate()}
                  disabled={!agencyForm.name || createAgencyMutation.isPending}
                  data-testid="button-submit-agency"
                >
                  {createAgencyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Agency
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Building2 className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">{userAgency?.name}</h1>
              <p className="text-white/80">Agency Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents">
              <Users className="h-4 w-4 mr-2" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <DollarSign className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                  <Badge variant="secondary">{stats.totalAgents}</Badge>
                </div>
                <h3 className="font-semibold text-lg">Total Agents</h3>
                <p className="text-sm text-muted-foreground">Active team members</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Home className="h-8 w-8 text-green-600" />
                  <Badge variant="secondary">{stats.activeListings}</Badge>
                </div>
                <h3 className="font-semibold text-lg">Active Listings</h3>
                <p className="text-sm text-muted-foreground">Properties on market</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <Badge variant="secondary">{stats.completedTransactions}</Badge>
                </div>
                <h3 className="font-semibold text-lg">Closed Deals</h3>
                <p className="text-sm text-muted-foreground">Completed transactions</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                  <Badge variant="secondary">${stats.totalRevenue.toLocaleString()}</Badge>
                </div>
                <h3 className="font-semibold text-lg">Total Revenue</h3>
                <p className="text-sm text-muted-foreground">Agency earnings</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span className="font-semibold">{stats.totalSales}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pending Transactions</span>
                    <span className="font-semibold">{stats.pendingTransactions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Agent Rating</span>
                    <span className="font-semibold flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      {stats.averageAgentRating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Commissions</span>
                    <span className="font-semibold">${stats.totalCommissions.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4">Top Agents</h3>
                {agents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No agents in your agency yet</p>
                ) : (
                  <div className="space-y-4">
                    {agents.slice(0, 5).map((agent) => (
                      <div key={agent.id} className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {agent.profile_image ? (
                            <img src={agent.profile_image} alt={agent.full_name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <Users className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{agent.full_name}</p>
                          <p className="text-sm text-muted-foreground">{agent.total_sales} sales</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm">{parseFloat(agent.rating || '0').toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Team Members</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-invite-agent">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Agent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Agent to Agency</DialogTitle>
                    <DialogDescription>
                      Enter the email of an existing agent to invite them to your agency.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input placeholder="agent@email.com" data-testid="input-invite-email" />
                    <Button className="w-full" data-testid="button-send-invite">Send Invitation</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {agentsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              </Card>
            ) : agents.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Agents Yet</h3>
                <p className="text-muted-foreground mb-4">Start building your team by inviting agents</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <Card key={agent.id} className="p-6" data-testid={`card-agent-${agent.id}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {agent.profile_image ? (
                          <img src={agent.profile_image} alt={agent.full_name} className="h-16 w-16 rounded-full object-cover" />
                        ) : (
                          <Users className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">{agent.full_name}</h3>
                          {agent.license_verified && (
                            <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < Math.round(parseFloat(agent.rating || '0')) ? 'fill-yellow-400' : ''}`}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({agent.review_count} reviews)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{agent.email}</span>
                      </div>
                      {agent.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{agent.phone}</span>
                        </div>
                      )}
                      {agent.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{agent.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
                      {agent.specialties?.slice(0, 2).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center mb-4">
                      <div>
                        <p className="text-2xl font-bold">{agent.total_sales}</p>
                        <p className="text-xs text-muted-foreground">Total Sales</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{agent.years_experience || 0}</p>
                        <p className="text-xs text-muted-foreground">Years Exp.</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-agent-${agent.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAgentMutation.mutate(agent.id)}
                        data-testid={`button-remove-agent-${agent.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <h2 className="text-2xl font-bold mb-6">Transaction History</h2>

            {transactionsLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              </Card>
            ) : transactions.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground">Transactions will appear here when deals are closed</p>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-4 font-medium">Property</th>
                        <th className="text-left p-4 font-medium">Agent</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-right p-4 font-medium">Amount</th>
                        <th className="text-right p-4 font-medium">Commission</th>
                        <th className="text-center p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-t" data-testid={`row-transaction-${tx.id}`}>
                          <td className="p-4">
                            <p className="font-medium">{tx.property?.title || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.property?.city}, {tx.property?.state}
                            </p>
                          </td>
                          <td className="p-4">{tx.agent?.full_name || 'N/A'}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize">
                              {tx.transaction_type}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            ${parseFloat(tx.transaction_amount || '0').toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            <p className="font-medium text-green-600">
                              ${parseFloat(tx.agency_commission || '0').toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Agent: ${parseFloat(tx.agent_commission || '0').toLocaleString()}
                            </p>
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              variant={tx.status === 'completed' ? 'default' : 'secondary'}
                              className="capitalize"
                            >
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(tx.closed_at || tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-6 max-w-2xl">
              <h2 className="text-2xl font-bold mb-6">Agency Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Agency Name</label>
                  <Input defaultValue={userAgency?.name} data-testid="input-settings-name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea defaultValue={userAgency?.description} data-testid="input-settings-description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input defaultValue={userAgency?.email} data-testid="input-settings-email" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input defaultValue={userAgency?.phone} data-testid="input-settings-phone" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  <Input defaultValue={userAgency?.website} data-testid="input-settings-website" />
                </div>
                <div>
                  <label className="text-sm font-medium">Default Commission Rate (%)</label>
                  <Input 
                    type="number" 
                    defaultValue={userAgency?.commission_rate || 3} 
                    data-testid="input-settings-commission"
                  />
                </div>
                <Button className="mt-4" data-testid="button-save-settings">
                  Save Changes
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
