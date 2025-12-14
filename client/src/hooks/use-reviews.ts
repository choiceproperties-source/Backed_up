import { useState, useEffect } from 'react';
import { getReviews, createReview } from '@/lib/supabase-service';
import type { Review } from '@/lib/types';

export function useReviews(propertyId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const rev = await getReviews(propertyId);
        setReviews(rev);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchReviews();
    }
  }, [propertyId]);

  const addReview = async (review: Omit<Review, 'id'>) => {
    try {
      const newReview = await createReview(review);
      if (newReview) {
        setReviews([...reviews, newReview]);
      }
      return newReview;
    } catch (err) {
      return null;
    }
  };

  return { reviews, addReview, loading };
}
