import { Star } from "lucide-react";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <div className="flex gap-2" data-testid="star-rating-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onChange(star);
            }
          }}
          className="p-1 rounded transition-transform duration-200 hover:scale-110 active:scale-95"
          data-testid={`star-input-${star}`}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className={`h-8 w-8 ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            } transition-colors duration-200`}
          />
        </button>
      ))}
    </div>
  );
}
