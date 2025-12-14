import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getFavorites, addFavorite, removeFavorite } from '@/lib/supabase-service';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavorites(JSON.parse(localStorage.getItem('choiceProperties_favorites') || '[]'));
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const fav = await getFavorites(user.id);
        setFavorites(fav);
      } catch (err) {
        setFavorites(JSON.parse(localStorage.getItem('choiceProperties_favorites') || '[]'));
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const toggleFavorite = async (propertyId: string) => {
    if (!user) {
      const localFavorites = JSON.parse(localStorage.getItem('choiceProperties_favorites') || '[]');
      if (localFavorites.includes(propertyId)) {
        const updated = localFavorites.filter((id: string) => id !== propertyId);
        localStorage.setItem('choiceProperties_favorites', JSON.stringify(updated));
        setFavorites(updated);
      } else {
        const updated = [...localFavorites, propertyId];
        localStorage.setItem('choiceProperties_favorites', JSON.stringify(updated));
        setFavorites(updated);
      }
      return;
    }

    if (favorites.includes(propertyId)) {
      await removeFavorite(user.id, propertyId);
      setFavorites(favorites.filter(id => id !== propertyId));
    } else {
      await addFavorite(user.id, propertyId);
      setFavorites([...favorites, propertyId]);
    }
  };

  return { favorites, toggleFavorite, loading, isFavorited: (id: string) => favorites.includes(id) };
}
