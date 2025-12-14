import { useState } from "react";
import { ReviewStars } from "@/components/review-stars";
import { ReviewCard } from "@/components/review-card";
import { ReviewForm } from "@/components/review-form";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PropertyReviewsData } from "@/hooks/use-property-reviews";
import { useSubmitReview } from "@/hooks/use-submit-review";

interface ReviewsSectionProps {
  data: PropertyReviewsData;
}

export function ReviewsSection({ data }: ReviewsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { submitReview, submittedReviews } = useSubmitReview();

  // Combine submitted and mock reviews
  const allReviews = [...submittedReviews, ...data.reviews];
  const totalCount = allReviews.length;
  const avgRating = totalCount > 0 
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount
    : 0;

  if (data.totalReviews === 0 && submittedReviews.length === 0) {
    return (
      <div data-testid="section-reviews" className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reviews & Ratings
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No reviews available for this property.</p>
        </div>
        <div>
          <Button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            variant="outline"
            className="w-full justify-between"
            data-testid="button-write-review-toggle"
          >
            <span>Write a Review</span>
            {isFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {isFormOpen && (
            <div className="mt-4">
              <ReviewForm onSubmit={submitReview} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="section-reviews" className="space-y-8">
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Reviews & Ratings
      </h2>

      {/* Rating Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl font-bold text-gray-900 dark:text-white">
            {avgRating.toFixed(1)}
          </span>
          <div data-testid="rating-summary-stars">
            <ReviewStars rating={Math.round(avgRating)} size="md" />
          </div>
        </div>

        <div className="text-gray-700 dark:text-gray-300">
          <p className="text-sm">
            Based on <span className="font-semibold">{totalCount}</span> reviews
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Verified tenant reviews
          </p>
        </div>
      </div>

      {/* Write a Review Section */}
      <div>
        <Button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          variant="outline"
          className="w-full justify-between"
          data-testid="button-write-review-toggle"
        >
          <span>Write a Review</span>
          {isFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {isFormOpen && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <ReviewForm onSubmit={submitReview} />
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div 
        className="space-y-4"
        data-testid="reviews-list"
      >
        {allReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
