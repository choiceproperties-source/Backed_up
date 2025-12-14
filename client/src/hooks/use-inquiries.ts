import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth-context';
import type { Inquiry } from '@/lib/types';

export function useInquiries() {
  const { user } = useAuth();

  // Fetch agent's inquiries
  const { data: agentInquiries = [], isLoading } = useQuery<Inquiry[]>({
    queryKey: ['/api/inquiries/agent', user?.id],
    enabled: !!user?.id && user?.role === 'agent',
    select: (res: any) => res?.data ?? [],
  });

  // Submit inquiry mutation
  const submitInquiryMutation = useMutation({
    mutationFn: async (inquiryData: Record<string, any>) => {
      const response = await apiRequest('POST', '/api/inquiries', inquiryData);
      return response.json();
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/inquiries/agent', user.id] });
      }
    },
  });

  return {
    agentInquiries,
    submitInquiry: submitInquiryMutation.mutate,
    submitInquiryAsync: submitInquiryMutation.mutateAsync,
    isSubmitting: submitInquiryMutation.isPending,
    isLoading,
    error: submitInquiryMutation.error,
  };
}
