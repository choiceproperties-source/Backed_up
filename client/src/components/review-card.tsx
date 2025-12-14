import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewStars } from "@/components/review-stars";
import type { PropertyReview } from "@/hooks/use-property-reviews";

interface ReviewCardProps {
  review: PropertyReview;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card 
      className="transition-all duration-200 hover-elevate"
      data-testid={`card-review-${review.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0" data-testid={`avatar-review-${review.id}`}>
            <AvatarFallback className="bg-primary text-white font-semibold text-sm">
              {review.avatarInitial}
            </AvatarFallback>
          </Avatar>

          {/* Review Content */}
          <div className="flex-1 min-w-0">
            {/* Name and Date */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-semibold text-sm">
                {review.name}
              </p>
              <p className="text-xs text-muted-foreground flex-shrink-0">
                {review.date}
              </p>
            </div>

            {/* Stars */}
            <div className="mb-3" data-testid={`stars-review-${review.id}`}>
              <ReviewStars rating={review.rating} size="sm" />
            </div>

            {/* Comment */}
            <p className="text-sm leading-relaxed">
              {review.comment}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
