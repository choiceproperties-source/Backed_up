import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StatCardSkeleton() {
  return (
    <Card className="p-6" data-testid="skeleton-stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </Card>
  );
}

export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="skeleton-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PropertyListItemSkeleton() {
  return (
    <Card className="overflow-hidden" data-testid="skeleton-property-item">
      <div className="flex flex-col md:flex-row">
        <Skeleton className="h-48 md:h-32 md:w-48 flex-shrink-0" />
        <CardContent className="p-4 flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function ApplicationListItemSkeleton() {
  return (
    <Card className="p-4" data-testid="skeleton-application-item">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6" data-testid="skeleton-dashboard-content">
      <StatsGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PropertyListItemSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <ApplicationListItemSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LandlordDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8" data-testid="skeleton-landlord-dashboard">
      <StatsGridSkeleton count={4} />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PropertyListItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <ApplicationListItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function RenterDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8" data-testid="skeleton-renter-dashboard">
      <StatsGridSkeleton count={4} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <ApplicationListItemSkeleton key={i} />
              ))}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AgentDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8" data-testid="skeleton-agent-dashboard">
      <StatsGridSkeleton count={4} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PropertyListItemSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
