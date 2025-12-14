import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, getAuthToken } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface PropertyApplication {
  id: string;
  property_id: string;
  user_id: string;
  step: number;
  personal_info?: Record<string, any>;
  rental_history?: Record<string, any>;
  employment?: Record<string, any>;
  references?: Record<string, any>;
  disclosures?: Record<string, any>;
  documents?: Record<string, any>;
  document_status?: Record<string, any>;
  status: string;
  previous_status?: string;
  status_history?: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>;
  score?: number;
  score_breakdown?: {
    incomeScore: number;
    creditScore: number;
    rentalHistoryScore: number;
    employmentScore: number;
    documentsScore: number;
    totalScore: number;
    maxScore: number;
    flags: string[];
  };
  rejection_category?: string;
  rejection_reason?: string;
  application_fee?: number;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  properties?: {
    id: string;
    title: string;
    address: string;
    city?: string;
    state?: string;
  };
}

interface ApplicationsResponse {
  success: boolean;
  data: PropertyApplication[];
  message: string;
}

export function usePropertyApplications(propertyId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = propertyId 
    ? ['/api/applications/property', propertyId]
    : ['/api/applications/owner'];

  const { data: response, isLoading, error, refetch } = useQuery<ApplicationsResponse>({
    queryKey,
    queryFn: async () => {
      const token = await getAuthToken();
      const url = propertyId 
        ? `/api/applications/property/${propertyId}`
        : `/api/applications/owner`;
      
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      return res.json();
    },
    enabled: !!user && (user.role === 'owner' || user.role === 'agent' || user.role === 'admin' || !!propertyId),
  });

  const applications = response?.success ? response.data : [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      options,
    }: {
      applicationId: string;
      status: string;
      options?: {
        rejectionCategory?: string;
        rejectionReason?: string;
        reason?: string;
      };
    }) => {
      return apiRequest('PATCH', `/api/applications/${applicationId}/status`, {
        status,
        ...options,
      });
    },
    onSuccess: () => {
      toast({ title: 'Application status updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/applications'] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to update status',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const scoreApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return apiRequest('POST', `/api/applications/${applicationId}/score`);
    },
    onSuccess: () => {
      toast({ title: 'Application scored successfully' });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to score application',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return {
    applications,
    isLoading,
    error,
    refetch,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    scoreApplication: scoreApplicationMutation.mutate,
    isScoringApplication: scoreApplicationMutation.isPending,
  };
}

export function useOwnerApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: response, isLoading, error, refetch } = useQuery<ApplicationsResponse>({
    queryKey: ['/api/applications/owner'],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch('/api/applications/owner', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      return res.json();
    },
    enabled: !!user && (user.role === 'owner' || user.role === 'agent' || user.role === 'admin'),
  });

  const applications = response?.success ? response.data : [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      options,
    }: {
      applicationId: string;
      status: string;
      options?: {
        rejectionCategory?: string;
        rejectionReason?: string;
        reason?: string;
      };
    }) => {
      return apiRequest('PATCH', `/api/applications/${applicationId}/status`, {
        status,
        ...options,
      });
    },
    onSuccess: () => {
      toast({ title: 'Application status updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/applications/owner'] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to update status',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const scoreApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return apiRequest('POST', `/api/applications/${applicationId}/score`);
    },
    onSuccess: () => {
      toast({ title: 'Application scored successfully' });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to score application',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return {
    applications,
    isLoading,
    error,
    refetch,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    scoreApplication: scoreApplicationMutation.mutate,
    isScoringApplication: scoreApplicationMutation.isPending,
  };
}
