import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User, Property, USER_ROLE_LABELS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Shield, Users, Building, History, Loader2, Check, Filter, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface AdminAction {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  details?: any;
}

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/v2/admin/users'],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<any[]>({
    queryKey: ['/api/v2/admin/properties'],
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: AdminAction[] }>({
    queryKey: ['/api/v2/admin/image-audit-logs'],
  });

  const autosaveMutation = useMutation({
    mutationFn: async ({ type, id, field, value }: { type: 'user' | 'property', id: string, field: string, value: any }) => {
      setSaving(prev => ({ ...prev, [`${type}-${id}-${field}`]: true }));
      const fieldMapping: Record<string, string> = {
        'fullName': 'fullName',
        'full_name': 'fullName',
        'listingAgentId': 'listingAgentId',
        'listing_agent_id': 'listingAgentId'
      };
      const apiField = fieldMapping[field] || field;
      await apiRequest('PUT', `/api/v2/admin/${type}s/${id}`, { [apiField]: value });
    },
    onSuccess: (_, variables) => {
      const { type, id, field } = variables;
      setSaving(prev => ({ ...prev, [`${type}-${id}-${field}`]: false }));
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/${type}s`] });
      toast({ title: 'Changes saved' });
    },
    onError: (_, variables) => {
      const { type, id, field } = variables;
      setSaving(prev => ({ ...prev, [`${type}-${id}-${field}`]: false }));
      toast({ title: 'Autosave failed', variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/${type}s`] });
    }
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ propertyId, approve }: { propertyId: string, approve: boolean }) => {
      setSaving(prev => ({ ...prev, [`approval-${propertyId}`]: true }));
      await apiRequest('POST', `/api/v2/admin/properties/${propertyId}/approval`, { approve });
    },
    onSuccess: (_, variables) => {
      setSaving(prev => ({ ...prev, [`approval-${variables.propertyId}`]: false }));
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/properties'] });
      toast({ title: variables.approve ? 'Property approved' : 'Property returned to pending' });
    },
    onError: (_, variables) => {
      setSaving(prev => ({ ...prev, [`approval-${variables.propertyId}`]: false }));
      toast({ title: 'Approval failed', variant: 'destructive' });
    }
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      await apiRequest('DELETE', `/api/v2/admin/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/properties'] });
      toast({ title: 'Property deleted' });
    },
    onError: () => toast({ title: 'Deletion failed', variant: 'destructive' })
  });

  const filteredUsers = useMemo(() => {
    return users?.filter(u => {
      const name = (u as any).fullName || (u as any).full_name || '';
      const matchesSearch = !searchTerm || 
        name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const agents = useMemo(() => users?.filter(u => u.role === 'agent' || u.role === 'property_manager') || [], [users]);

  const isSaving = (type: string, id: string, field: string) => !!saving[`${type}-${id}-${field}`];

  if (usersLoading || propertiesLoading || logsLoading) {
    return <div className="p-8 space-y-8"><Skeleton className="h-12 w-64" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        </div>
        <Badge variant="outline" className="px-3 py-1 flex gap-2 items-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Live Autosave
        </Badge>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
          <TabsTrigger value="users" className="flex gap-2"><Users className="w-4 h-4" /> Users</TabsTrigger>
          <TabsTrigger value="properties" className="flex gap-2"><Building className="w-4 h-4" /> Properties</TabsTrigger>
          <TabsTrigger value="logs" className="flex gap-2"><History className="w-4 h-4" /> System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex gap-4 items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(USER_ROLE_LABELS).map(([role, label]) => (
                  <SelectItem key={role} value={role}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Information</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const name = (user as any).fullName || (user as any).full_name || '';
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="space-y-1">
                        <Input 
                          defaultValue={name} 
                          onBlur={(e) => e.target.value !== name && autosaveMutation.mutate({ type: 'user', id: user.id, field: 'fullName', value: e.target.value })}
                          className="h-8 font-medium"
                        />
                        <Input 
                          defaultValue={user.email} 
                          onBlur={(e) => e.target.value !== user.email && autosaveMutation.mutate({ type: 'user', id: user.id, field: 'email', value: e.target.value })}
                          className="h-7 text-xs text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={user.role || 'renter'}
                          onValueChange={(value) => autosaveMutation.mutate({ type: 'user', id: user.id, field: 'role', value })}
                        >
                          <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(USER_ROLE_LABELS).map(([role, label]) => (
                              <SelectItem key={role} value={role}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isSaving('user', user.id, 'role') || isSaving('user', user.id, 'fullName') ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : <Check className="w-4 h-4 text-green-500 opacity-40" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Details</TableHead>
                  <TableHead>Status & Agent</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="space-y-1">
                      <Input 
                        defaultValue={p.title} 
                        onBlur={(e) => e.target.value !== p.title && autosaveMutation.mutate({ type: 'property', id: p.id, field: 'title', value: e.target.value })}
                        className="h-8 font-medium"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input 
                          type="number"
                          defaultValue={Number(p.price) || 0} 
                          onBlur={(e) => Number(e.target.value) !== Number(p.price) && autosaveMutation.mutate({ type: 'property', id: p.id, field: 'price', value: Number(e.target.value) })}
                          className="h-7 w-24 text-xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="space-y-2">
                      <Select
                        defaultValue={p.listingStatus || 'draft'}
                        onValueChange={(value) => autosaveMutation.mutate({ type: 'property', id: p.id, field: 'listingStatus', value })}
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        defaultValue={p.listingAgentId || ''}
                        onValueChange={(value) => autosaveMutation.mutate({ type: 'property', id: p.id, field: 'listingAgentId', value })}
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue placeholder="Assign Agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {agents.map(a => {
                            const agentName = (a as any).fullName || (a as any).full_name || '';
                            return <SelectItem key={a.id} value={a.id}>{agentName}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={p.listingStatus === 'available' ? 'outline' : 'secondary'}
                        size="sm"
                        className={`h-8 gap-2 ${p.listingStatus === 'available' ? 'text-green-600 border-green-200 bg-green-50' : ''}`}
                        onClick={() => approvalMutation.mutate({ propertyId: p.id, approve: p.listingStatus !== 'available' })}
                        disabled={saving[`approval-${p.id}`]}
                      >
                        {saving[`approval-${p.id}`] ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                          p.listingStatus === 'available' ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                        {p.listingStatus === 'available' ? 'Approved' : 'Pending'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm('Delete?') && deletePropertyMutation.mutate(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData?.logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] uppercase">{log.action}</Badge></TableCell>
                    <TableCell className="font-mono text-[10px]">{log.resource_type}: {log.resource_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
