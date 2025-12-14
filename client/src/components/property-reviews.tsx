import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import type { Review } from '@/lib/types';

interface PropertyReviewsProps {
  propertyId: string;
  reviews: Review[];
  averageRating: number;
}

export function PropertyReviews({ propertyId, reviews, averageRating }: PropertyReviewsProps) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !comment) return;

    const allReviews = JSON.parse(localStorage.getItem('choiceProperties_reviews') || '[]');
    const newReview: Review = {
      id: `review_${Date.now()}`,
      property_id: propertyId,
      user_name: name,
      rating,
      comment,
      created_at: new Date().toISOString()
    };
    allReviews.push(newReview);
    localStorage.setItem('choiceProperties_reviews', JSON.stringify(allReviews));

    setName('');
    setRating(5);
    setComment('');
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold mb-6">Reviews & Ratings</h3>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
          <span className="text-muted-foreground">({reviews.length} reviews)</span>
        </div>

        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map(review => (
              <Card key={review.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{review.user_name}</p>
                    <div className="flex gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-6 bg-blue-50 border-2 border-primary">
        <h4 className="font-bold text-lg mb-4">Share Your Experience</h4>
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="font-semibold text-sm mb-2 block">Your Name</label>
            <Input
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-sm mb-2 block">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 cursor-pointer ${r <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-sm mb-2 block">Your Review</label>
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-primary">
            Post Review
          </Button>
        </form>
      </Card>
    </div>
  );
}
