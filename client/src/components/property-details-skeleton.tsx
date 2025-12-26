import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function PropertyDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Navbar space */}
      <div className="h-20" />

      {/* Immersive Gallery Skeleton */}
      <div className="w-full px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 aspect-[21/9] rounded-2xl overflow-hidden">
          <Skeleton className="md:col-span-2 h-full rounded-l-2xl" />
          <div className="hidden md:grid grid-rows-2 gap-4">
            <Skeleton className="h-full" />
            <Skeleton className="h-full" />
          </div>
          <div className="hidden md:grid grid-rows-2 gap-4">
            <Skeleton className="h-full rounded-tr-2xl" />
            <Skeleton className="h-full rounded-br-2xl" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-7xl py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Header Card Skeleton */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 w-2/3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </div>
                <div className="h-12 w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg" />
                <Separator />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Sections */}
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-gray-200 dark:border-gray-800">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-8 w-1/4" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 rounded-2xl overflow-hidden">
              <div className="bg-primary/10 h-32" />
              <CardContent className="p-6 space-y-6">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Separator />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
