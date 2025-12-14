import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getFavorites, addFavorite, removeFavorite } from '@/lib/supabase-service';
import { useToast } from '@/hooks/use-toast';

interface FavoritesContextType {
  favorites: string[];
  loading: boolean;
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorited: (id: string) => boolean;
  refetch: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setLoading(true);
    try {
      const fav = await getFavorites(user.id);
      setFavorites(fav);
    } catch (err) {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (!user) {
      toast({
        title: 'Sign in Required',
        description: 'Please sign in to save favorites',
        variant: 'destructive',
      });
      return;
    }

    const wasAdding = !favorites.includes(propertyId);
    
    setFavorites(prev => 
      wasAdding 
        ? [...prev, propertyId]
        : prev.filter(id => id !== propertyId)
    );

    try {
      if (wasAdding) {
        await addFavorite(user.id, propertyId);
      } else {
        await removeFavorite(user.id, propertyId);
      }
    } catch (err) {
      setFavorites(prev => 
        wasAdding 
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      );
      toast({
        title: 'Error',
        description: 'Failed to update favorites. Please try again.',
        variant: 'destructive',
      });
    }
  }, [user, favorites, toast]);

  const isFavorited = useCallback((id: string) => favorites.includes(id), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, loading, toggleFavorite, isFavorited, refetch: fetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    return {
      favorites: [] as string[],
      loading: false,
      toggleFavorite: async () => {},
      isFavorited: () => false,
      refetch: async () => {},
    };
  }
  return context;
}
