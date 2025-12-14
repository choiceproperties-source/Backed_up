import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StarRatingInput } from "@/components/star-rating-input";
import { useToast } from "@/hooks/use-toast";
import type { ReviewSubmissionData } from "@/hooks/use-submit-review";

interface ReviewFormProps {
  onSubmit: (data: ReviewSubmissionData) => void;
}

export function ReviewForm({ onSubmit }: ReviewFormProps) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const wordCount = comment.trim().split(/\s+/).length;
  const isValid = name.trim().length > 0 && rating > 0 && wordCount >= 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      name: name.trim(),
      rating,
      comment: comment.trim(),
    });

    setName("");
    setRating(0);
    setComment("");

    toast({
      title: "Review submitted!",
      description: "Thank you for your feedback.",
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="form-review" className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Name
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sarah M."
          data-testid="input-review-name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Rating
        </label>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Comment (minimum 8 words)
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this property..."
          rows={4}
          data-testid="input-review-comment"
          className="resize-none"
        />
        <p className={`text-xs mt-1 ${wordCount < 8 ? "text-muted-foreground" : "text-green-600 dark:text-green-400"}`}>
          {wordCount} words
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!isValid}
          className="flex-1"
          data-testid="button-submit-review"
        >
          Submit Review
        </Button>
      </div>
    </form>
  );
}
