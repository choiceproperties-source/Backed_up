import { useState, useEffect } from 'react';
import { useAuth, getAuthToken } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: {
    city?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved searches
  useEffect(() => {
    if (!user) {
      setSearches([]);
      return;
    }

    const fetchSearches = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        const response = await fetch(
          `/api/saved-searches/user/${user.id}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch saved searches');
        }

        const data = await response.json();
        // Handle standardized response format
        const searchList = data.data || data.searches || [];
        setSearches(searchList);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching searches';
        setError(message);
        setSearches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearches();
  }, [user]);

  // Create search
  const createSearch = async (name: string, filters: SavedSearch['filters']) => {
    if (!user) {
      toast({
        title: 'Sign in Required',
        description: 'Please sign in to save searches',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          userId: user.id,
          name,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save search');
      }

      const data = await response.json();
      const newSearch = data.data || data;
      setSearches([...searches, newSearch]);
      toast({
        title: 'Success',
        description: 'Search saved successfully',
      });
      return newSearch;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error saving search';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete search
  const deleteSearch = async (searchId: string) => {
    if (!user) {
      toast({
        title: 'Sign in Required',
        description: 'Please sign in to delete searches',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete search');
      }

      setSearches(searches.filter((s) => s.id !== searchId));
      toast({
        title: 'Success',
        description: 'Search deleted',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting search';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Update search
  const updateSearch = async (
    searchId: string,
    name: string,
    filters: SavedSearch['filters']
  ) => {
    if (!user) {
      const updated = searches.map((s) =>
        s.id === searchId ? { ...s, name, filters, updatedAt: new Date().toISOString() } : s
      );
      localStorage.setItem('choiceProperties_savedSearches', JSON.stringify(updated));
      setSearches(updated);
      toast({
        title: 'Success',
        description: 'Search updated',
      });
      return updated.find((s) => s.id === searchId) || null;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ name, filters }),
      });

      if (!response.ok) {
        throw new Error('Failed to update search');
      }

      const data = await response.json();
      const updatedSearch = data.data || data;
      const updated = searches.map((s) =>
        s.id === searchId ? updatedSearch : s
      );
      setSearches(updated);
      toast({
        title: 'Success',
        description: 'Search updated',
      });
      return updatedSearch;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating search';
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
    searches,
    loading,
    error,
    createSearch,
    deleteSearch,
    updateSearch,
  };
}
