import { useState } from "react";
import type { PropertyReview } from "@/hooks/use-property-reviews";

export interface ReviewSubmissionData {
  name: string;
  rating: number;
  comment: string;
}

export function useSubmitReview() {
  const [submittedReviews, setSubmittedReviews] = useState<PropertyReview[]>([]);

  const submitReview = (data: ReviewSubmissionData) => {
    const newReview: PropertyReview = {
      id: `submitted-${Date.now()}`,
      name: data.name,
      rating: data.rating,
      comment: data.comment,
      date: "Just now",
      avatarInitial: data.name.charAt(0).toUpperCase(),
    };

    setSubmittedReviews((prev) => [newReview, ...prev]);
    return newReview;
  };

  return {
    submittedReviews,
    submitReview,
  };
}
