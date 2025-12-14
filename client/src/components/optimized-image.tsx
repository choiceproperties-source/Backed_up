import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

/**
 * OptimizedImage component with lazy loading and blur-up effect
 * Uses low-res thumbnail while loading full image
 */
export function OptimizedImage({
  src,
  alt,
  thumbnail,
  width,
  height,
  className,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset state on src change
    setIsLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => setError(true);

  return (
    <div
      className={cn('relative bg-muted overflow-hidden', className)}
      style={{ width, height }}
      data-testid="container-optimized-image"
    >
      {/* Blurred thumbnail placeholder - shown while loading */}
      {thumbnail && !isLoaded && (
        <img
          src={thumbnail}
          alt={`${alt} (loading)`}
          className="absolute inset-0 w-full h-full blur-sm"
          style={{ objectFit }}
          aria-hidden="true"
          data-testid="img-thumbnail"
        />
      )}

      {/* Main image - with lazy loading */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{ objectFit }}
        data-testid="img-optimized"
      />

      {/* Error state */}
      {error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm"
          data-testid="text-error"
        >
          Image failed to load
        </div>
      )}
    </div>
  );
}
