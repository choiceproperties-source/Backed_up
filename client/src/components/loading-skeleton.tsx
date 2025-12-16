import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoadingSkeletonProps {
  variant?: "spinner" | "card" | "list" | "table" | "form" | "page";
  count?: number;
  message?: string;
}

export function LoadingSkeleton({
  variant = "spinner",
  count = 3,
  message = "Loading...",
}: LoadingSkeletonProps) {
  if (variant === "spinner") {
    return (
      <div 
        className="flex flex-col items-center justify-center py-12 gap-3" 
        role="status" 
        aria-label={message}
        data-testid="loading-spinner"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">{message}</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
        role="status" 
        aria-label={message}
        data-testid="loading-cards"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-[1.6/1]" />
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div 
        className="space-y-3" 
        role="status" 
        aria-label={message}
        data-testid="loading-list"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div 
        className="border rounded-lg overflow-hidden" 
        role="status" 
        aria-label={message}
        data-testid="loading-table"
      >
        <div className="bg-muted/50 p-4 flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 border-t flex gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <Card data-testid="loading-form" role="status" aria-label={message}>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (variant === "page") {
    return (
      <div 
        className="min-h-[50vh] flex items-center justify-center" 
        role="status" 
        aria-label={message}
        data-testid="loading-page"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">{message}</span>
        </div>
      </div>
    );
  }

  return null;
}

export function PageLoadingSkeleton({ message = "Loading..." }: { message?: string }) {
  return <LoadingSkeleton variant="page" message={message} />;
}

export function CardLoadingSkeleton({ count = 6 }: { count?: number }) {
  return <LoadingSkeleton variant="card" count={count} />;
}

export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return <LoadingSkeleton variant="list" count={count} />;
}

export function TableLoadingSkeleton({ count = 5 }: { count?: number }) {
  return <LoadingSkeleton variant="table" count={count} />;
}
