import { useState, useEffect } from 'react';
import { useAuth, getAuthToken } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export interface OwnedProperty {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  propertyType?: string;
  images?: string[];
  status?: string;
  furnished?: boolean;
  petsAllowed?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export function useOwnedProperties() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<OwnedProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch owned properties
  useEffect(() => {
    if (!user) {
      const localProps = JSON.parse(
        localStorage.getItem('choiceProperties_ownedProperties') || '[]'
      );
      setProperties(localProps);
      return;
    }

    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        const response = await fetch(
          `/api/v2/properties?ownerId=${user.id}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch properties');
        }

        const data = await response.json();
        // Handle standardized response format: { success: true, data: { properties: [...] } }
        const responseData = data?.data;
        const propertyList = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.properties || []);
        setProperties(propertyList);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching properties';
        setError(message);
        // Fallback to localStorage
        const localProps = JSON.parse(
          localStorage.getItem('choiceProperties_ownedProperties') || '[]'
        );
        setProperties(localProps);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user]);

  // Create property
  const createProperty = async (propertyData: Omit<OwnedProperty, 'id' | 'createdAt' | 'ownerId'>) => {
    if (!user) {
      const localProps = JSON.parse(
        localStorage.getItem('choiceProperties_ownedProperties') || '[]'
      );
      const newProperty: OwnedProperty = {
        id: `prop_${Date.now()}`,
        ownerId: 'local',
        ...propertyData,
        createdAt: new Date().toISOString(),
      };
      const updated = [...localProps, newProperty];
      localStorage.setItem('choiceProperties_ownedProperties', JSON.stringify(updated));
      setProperties(updated);
      toast({
        title: 'Success',
        description: 'Property added',
      });
      return newProperty;
    }

    try {
      const token = await getAuthToken();
      // PRIORITY 1 FIX: Normalize numeric fields to strings for decimal validation
      const normalizedData = {
        ...propertyData,
        ownerId: user.id,
        // Convert numeric values to strings for decimal fields in backend
        price: propertyData.price !== undefined ? String(propertyData.price) : undefined,
        bathrooms: propertyData.bathrooms !== undefined ? String(propertyData.bathrooms) : undefined,
      };
      
      const response = await fetch('/api/v2/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(normalizedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create property');
      }

      const data = await response.json();
      const newProperty = data.data || data;
      setProperties([...properties, newProperty]);
      toast({
        title: 'Success',
        description: 'Property created successfully',
      });
      return newProperty;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating property';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update property
  const updateProperty = async (
    propertyId: string,
    propertyData: Partial<OwnedProperty>
  ) => {
    if (!user) {
      const updated = properties.map((p) =>
        p.id === propertyId ? { ...p, ...propertyData, updatedAt: new Date().toISOString() } : p
      );
      localStorage.setItem('choiceProperties_ownedProperties', JSON.stringify(updated));
      setProperties(updated);
      toast({
        title: 'Success',
        description: 'Property updated',
      });
      return updated.find((p) => p.id === propertyId) || null;
    }

    try {
      const token = await getAuthToken();
      // PRIORITY 1 FIX: Normalize numeric fields to strings for decimal validation
      const normalizedData: any = { ...propertyData };
      if (propertyData.price !== undefined) {
        normalizedData.price = String(propertyData.price);
      }
      if (propertyData.bathrooms !== undefined) {
        normalizedData.bathrooms = String(propertyData.bathrooms);
      }

      const response = await fetch(`/api/v2/properties/${propertyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(normalizedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error('You do not have permission to edit this property');
        }
        throw new Error(errorData.error || 'Failed to update property');
      }

      const data = await response.json();
      const updatedProperty = data.data || data;
      const updated = properties.map((p) =>
        p.id === propertyId ? updatedProperty : p
      );
      setProperties(updated);
      toast({
        title: 'Success',
        description: 'Property updated',
      });
      return updatedProperty;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating property';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete property
  const deleteProperty = async (propertyId: string) => {
    if (!user) {
      const updated = properties.filter((p) => p.id !== propertyId);
      localStorage.setItem('choiceProperties_ownedProperties', JSON.stringify(updated));
      setProperties(updated);
      toast({
        title: 'Success',
        description: 'Property deleted',
      });
      return true;
    }

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v2/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      setProperties(properties.filter((p) => p.id !== propertyId));
      toast({
        title: 'Success',
        description: 'Property deleted',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting property';
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
    properties,
    loading,
    error,
    createProperty,
    updateProperty,
    deleteProperty,
  };
}
