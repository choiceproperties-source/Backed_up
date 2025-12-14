export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg animate-pulse">
      <div className="aspect-[1.6/1] bg-muted" />

      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function PropertyCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
      <div className="h-8 bg-muted rounded w-1/2 mb-2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 p-4 border-b animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded flex-1" />
      ))}
    </div>
  );
}
