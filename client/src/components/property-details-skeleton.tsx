import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function PropertyDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Navbar and Breadcrumb space */}
      <div className="h-24" />

      {/* Main image skeleton */}
      <div className="max-w-[1400px] mx-auto w-full p-2 md:p-4">
        <Skeleton className="w-full aspect-video rounded-lg" data-testid="skeleton-main-image" />
      </div>

      <div className="container mx-auto px-4 max-w-[1200px] py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {/* Property Overview Section */}
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" data-testid="skeleton-title" />
              <Skeleton className="h-6 w-full" data-testid="skeleton-address" />
              <Skeleton className="h-6 w-2/3" data-testid="skeleton-price" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Skeleton className="h-10 w-32" data-testid="skeleton-button-1" />
              <Skeleton className="h-10 w-28" data-testid="skeleton-button-2" />
              <Skeleton className="h-10 w-28" data-testid="skeleton-button-3" />
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            {/* Overview Section */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" data-testid="skeleton-overview-title" />
              <Skeleton className="h-20 w-full" data-testid="skeleton-overview-text" />
            </div>

            {/* Amenities Section */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" data-testid="skeleton-amenities-title" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="aspect-square rounded-lg"
                    data-testid={`skeleton-amenity-card-${i}`}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            {/* Reviews Section */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" data-testid="skeleton-reviews-title" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-800" />

            {/* Location Section */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" data-testid="skeleton-location-title" />
              <Skeleton className="w-full aspect-video rounded-lg" data-testid="skeleton-map" />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-primary p-4 text-white">
                <Skeleton className="h-6 w-1/2 bg-primary/50" />
                <Skeleton className="h-4 w-2/3 mt-2 bg-primary/50" />
              </div>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" data-testid="skeleton-sidebar-button-1" />
                <div className="flex items-center gap-2">
                  <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                  <Skeleton className="h-4 w-6" />
                  <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                </div>
                <Skeleton className="h-12 w-full" data-testid="skeleton-sidebar-button-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
