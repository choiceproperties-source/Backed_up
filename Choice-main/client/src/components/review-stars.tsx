import { Star } from "lucide-react";

interface ReviewStarsProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  data_testid?: string;
}

export function ReviewStars({ rating, size = "md", data_testid }: ReviewStarsProps) {
  const sizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const sizeClass = sizes[size];

  return (
    <div 
      className="flex gap-0.5"
      data-testid={data_testid || "review-stars"}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );
}
