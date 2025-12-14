import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/auth-context';
import type { Review } from '@/lib/types';

export interface PropertyReview {
  id: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
  avatarInitial: string;
}

export interface PropertyReviewsData {
  averageRating: number;
  totalReviews: number;
  reviews: PropertyReview[];
}

export function usePropertyReviews(propertyId?: string): PropertyReviewsData {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setReviews([]);
      return;
    }

    const fetchReviews = async () => {
      setLoading(true);
      try {
        const token = await getAuthToken();
        const response = await fetch(`/api/reviews/property/${propertyId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        const reviewList = data.data || [];
        setReviews(reviewList);
      } catch (err) {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [propertyId]);

  // Calculate average rating and transform for display
  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
    : 0;

  const transformedReviews: PropertyReview[] = reviews.map((review) => ({
    id: review.id,
    name: review.users?.full_name || 'Anonymous',
    rating: review.rating || 0,
    date: review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Unknown',
    comment: review.comment || '',
    avatarInitial: (review.users?.full_name?.charAt(0) || 'A').toUpperCase(),
  }));

  return {
    averageRating,
    totalReviews: reviews.length,
    reviews: transformedReviews,
  };
}
