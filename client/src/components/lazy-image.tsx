import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: "square" | "video" | "auto";
  srcSet?: string;
  sizes?: string;
  fetchPriority?: "high" | "low" | "auto";
}

export function LazyImage({
  src,
  alt,
  fallback = "/placeholder.svg",
  aspectRatio = "auto",
  className,
  srcSet,
  sizes,
  fetchPriority = "auto",
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!divRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.01,
      }
    );

    observer.observe(divRef.current);

    return () => observer.disconnect();
  }, []);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  };

  return (
    <div
      ref={divRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectClasses[aspectRatio],
        className
      )}
    >
      {isInView && (
        <img
          ref={imgRef}
          src={hasError ? fallback : src}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority={fetchPriority}
          srcSet={srcSet}
          sizes={sizes}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
