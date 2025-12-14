import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export interface PropertyInquiry {
  id: string;
  agentId?: string;
  propertyId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message?: string;
  inquiryType?: string;
  status: 'pending' | 'responded' | 'closed';
  createdAt: string;
  updatedAt?: string;
}

export function usePropertyInquiries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch inquiries for owner's properties
  useEffect(() => {
    if (!user || user.role !== 'owner') {
      const localInqs = JSON.parse(
        localStorage.getItem('choiceProperties_ownerInquiries') || '[]'
      );
      setInquiries(localInqs);
      return;
    }

    const fetchInquiries = async () => {
      setLoading(true);
      setError(null);
      try {
        // For owner, we fetch inquiries for their properties
        // This assumes an endpoint exists or we can adapt the agent inquiries endpoint
        const response = await fetch(
          `/api/inquiries/property/${user.id}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch inquiries');
        }

        const data = await response.json();
        // Handle standardized response format
        const inquiryList = data.data || data.inquiries || [];
        setInquiries(inquiryList);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching inquiries';
        setError(message);
        // Fallback to localStorage
        const localInqs = JSON.parse(
          localStorage.getItem('choiceProperties_ownerInquiries') || '[]'
        );
        setInquiries(localInqs);
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, [user]);

  // Update inquiry status
  const updateInquiryStatus = async (
    inquiryId: string,
    status: 'pending' | 'responded' | 'closed'
  ) => {
    if (!user) {
      const updated = inquiries.map((i) =>
        i.id === inquiryId ? { ...i, status, updatedAt: new Date().toISOString() } : i
      );
      localStorage.setItem('choiceProperties_ownerInquiries', JSON.stringify(updated));
      setInquiries(updated);
      toast({
        title: 'Success',
        description: `Inquiry marked as ${status}`,
      });
      return updated.find((i) => i.id === inquiryId) || null;
    }

    try {
      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update inquiry');
      }

      const data = await response.json();
      const updatedInq = data.data || data;
      const updated = inquiries.map((i) =>
        i.id === inquiryId ? updatedInq : i
      );
      setInquiries(updated);
      toast({
        title: 'Success',
        description: `Inquiry marked as ${status}`,
      });
      return updatedInq;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating inquiry';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    inquiries,
    loading,
    error,
    updateInquiryStatus,
  };
}
