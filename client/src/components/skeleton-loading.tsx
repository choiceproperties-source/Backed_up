export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[1.6/1] bg-muted dark:bg-slate-700 rounded-t-lg"></div>
      <div className="p-4 space-y-3">
        <div className="h-6 bg-muted dark:bg-slate-700 rounded w-1/3"></div>
        <div className="h-4 bg-muted dark:bg-slate-700 rounded w-2/3"></div>
        <div className="h-4 bg-muted dark:bg-slate-700 rounded w-1/2"></div>
      </div>
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-10 bg-muted dark:bg-slate-700 rounded"></div>
        </div>
      ))}
    </div>
  );
}
