/**
 * Skeleton loading state for images during slow network conditions
 * Prevents layout shifts by maintaining dimensions while loading
 */
interface ImageSkeletonProps {
  width: string;
  height: string;
  className?: string;
}

export function ImageSkeleton({ width, height, className }: ImageSkeletonProps) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-lg ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading image"
    />
  );
}
