import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User, Property, UserRole, USER_ROLE_LABELS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Shield, Users, Building, History, Loader2, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/v2/admin/users'],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/v2/admin/properties'],
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: AdminAction[] }>({
    queryKey: ['/api/v2/admin/image-audit-logs'],
  });

  // Generic Autosave Mutation
  const autosaveMutation = useMutation({
    mutationFn: async ({ type, id, field, value }: { type: 'user' | 'property', id: string, field: string, value: any }) => {
      setSaving(prev => ({ ...prev, [`${type}-${id}-${field}`]: true }));
      await apiRequest('PUT', `/api/v2/admin/${type}s/${id}`, { [field]: value });
    },
    onSuccess: (_, variables) => {
      const { type, id, field } = variables;
      setSaving(prev => ({ ...prev, [`${type}-${id}-${field}`]: false }));
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/${type}s`] });
      toast({ title: 'Changes saved automatically' });
    },
    onError: (err, variables) => {
      const { type, id, field } = variables;
      setSaving(prev => ({ ...prev, [`${type}-${id}-${field}`]: false }));
      toast({ title: 'Autosave failed', description: 'Changes could not be saved to server.', variant: 'destructive' });
      // Revert logic handled by TanStack query invalidation usually, 
      // but for immediate feedback we can keep state or re-fetch
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/${type}s`] });
    }
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      await apiRequest('DELETE', `/api/v2/admin/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/properties'] });
      toast({ title: 'Property deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete property', variant: 'destructive' });
    }
  });

  const isFieldSaving = (type: string, id: string, field: string) => !!saving[`${type}-${id}-${field}`];

  if (usersLoading || propertiesLoading || logsLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Editor</h1>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-xs font-normal">
          Autosave Enabled
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
            <Building className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Actions</CardTitle>
            <History className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logsData?.logs?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management (Live Edit)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Input 
                      defaultValue={user.full_name || ''} 
                      onBlur={(e) => {
                        if (e.target.value !== user.full_name) {
                          autosaveMutation.mutate({ type: 'user', id: user.id, field: 'full_name', value: e.target.value });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      defaultValue={user.email} 
                      onBlur={(e) => {
                        if (e.target.value !== user.email) {
                          autosaveMutation.mutate({ type: 'user', id: user.id, field: 'email', value: e.target.value });
                        }
                      }}
                      className="h-8"
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
                    {isFieldSaving('user', user.id, 'role') || isFieldSaving('user', user.id, 'full_name') || isFieldSaving('user', user.id, 'email') ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Check className="w-4 h-4 text-green-500 opacity-50" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Property Directory (Live Edit)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties?.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Input 
                      defaultValue={property.title} 
                      onBlur={(e) => {
                        if (e.target.value !== property.title) {
                          autosaveMutation.mutate({ type: 'property', id: property.id, field: 'title', value: e.target.value });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      defaultValue={Number(property.price) || 0} 
                      onBlur={(e) => {
                        if (Number(e.target.value) !== Number(property.price)) {
                          autosaveMutation.mutate({ type: 'property', id: property.id, field: 'price', value: Number(e.target.value) });
                        }
                      }}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={property.status || 'available'}
                      onValueChange={(value) => autosaveMutation.mutate({ type: 'property', id: property.id, field: 'status', value })}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                        <SelectItem value="off_market">Off Market</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Delete property forever?')) {
                          deletePropertyMutation.mutate(property.id);
                        }
                      }}
                      disabled={deletePropertyMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsData?.logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.actor_role}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px]">{log.resource_type}: {log.resource_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
