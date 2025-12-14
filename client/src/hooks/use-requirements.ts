import { useState, useEffect } from 'react';
import { useAuth, getAuthToken } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export interface Requirement {
  id: string;
  userId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string[];
  locations?: string[];
  amenities?: string[];
  pets?: Record<string, any>;
  leaseTerm?: string;
  moveInDate?: string;
  additionalNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export function useRequirements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch requirements for user
  useEffect(() => {
    if (!user) {
      const localReqs = JSON.parse(
        localStorage.getItem('choiceProperties_requirements') || '[]'
      );
      setRequirements(localReqs);
      return;
    }

    const fetchRequirements = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        const response = await fetch(
          `/api/requirements/user/${user.id}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch requirements');
        }

        const data = await response.json();
        // Handle standardized response format
        const reqList = data.data || data.requirements || [];
        setRequirements(reqList);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching requirements';
        setError(message);
        // Fallback to localStorage
        const localReqs = JSON.parse(
          localStorage.getItem('choiceProperties_requirements') || '[]'
        );
        setRequirements(localReqs);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, [user]);

  // Create requirement
  const createRequirement = async (
    requirementData: Omit<Requirement, 'id' | 'userId' | 'createdAt'>
  ) => {
    if (!user) {
      const localReqs = JSON.parse(
        localStorage.getItem('choiceProperties_requirements') || '[]'
      );
      const newReq: Requirement = {
        id: `req_${Date.now()}`,
        userId: 'local',
        ...requirementData,
        createdAt: new Date().toISOString(),
      };
      const updated = [...localReqs, newReq];
      localStorage.setItem('choiceProperties_requirements', JSON.stringify(updated));
      setRequirements(updated);
      toast({
        title: 'Success',
        description: 'Requirement added',
      });
      return newReq;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...requirementData,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create requirement');
      }

      const data = await response.json();
      const newReq = data.data || data;
      setRequirements([...requirements, newReq]);
      toast({
        title: 'Success',
        description: 'Requirement created',
      });
      return newReq;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating requirement';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update requirement
  const updateRequirement = async (
    requirementId: string,
    requirementData: Partial<Requirement>
  ) => {
    if (!user) {
      const updated = requirements.map((r) =>
        r.id === requirementId ? { ...r, ...requirementData, updatedAt: new Date().toISOString() } : r
      );
      localStorage.setItem('choiceProperties_requirements', JSON.stringify(updated));
      setRequirements(updated);
      toast({
        title: 'Success',
        description: 'Requirement updated',
      });
      return updated.find((r) => r.id === requirementId) || null;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(requirementData),
      });

      if (!response.ok) {
        throw new Error('Failed to update requirement');
      }

      const data = await response.json();
      const updatedReq = data.data || data;
      const updated = requirements.map((r) =>
        r.id === requirementId ? updatedReq : r
      );
      setRequirements(updated);
      toast({
        title: 'Success',
        description: 'Requirement updated',
      });
      return updatedReq;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating requirement';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete requirement
  const deleteRequirement = async (requirementId: string) => {
    if (!user) {
      const updated = requirements.filter((r) => r.id !== requirementId);
      localStorage.setItem('choiceProperties_requirements', JSON.stringify(updated));
      setRequirements(updated);
      toast({
        title: 'Success',
        description: 'Requirement deleted',
      });
      return true;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete requirement');
      }

      setRequirements(requirements.filter((r) => r.id !== requirementId));
      toast({
        title: 'Success',
        description: 'Requirement deleted',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting requirement';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    requirements,
    loading,
    error,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  };
}
