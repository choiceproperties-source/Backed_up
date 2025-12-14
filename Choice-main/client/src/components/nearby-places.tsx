import { Card, CardContent } from "@/components/ui/card";
import { 
  UtensilsCrossed, ShoppingCart, GraduationCap, Bus
} from "lucide-react";
import type { NearbyPlacesData } from "@/hooks/use-nearby-places";

interface NearbyPlacesProps {
  places: NearbyPlacesData;
}

const categoryIcons: Record<string, typeof UtensilsCrossed> = {
  Restaurants: UtensilsCrossed,
  Groceries: ShoppingCart,
  Schools: GraduationCap,
  Transit: Bus,
};

const categoryColors: Record<string, string> = {
  Restaurants: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100",
  Groceries: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100",
  Schools: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100",
  Transit: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100",
};

export function NearbyPlaces({ places }: NearbyPlacesProps) {
  const categories = Object.keys(places);

  if (categories.length === 0) {
    return (
      <div 
        className="text-center py-8 text-gray-500 dark:text-gray-400"
        data-testid="section-nearby-places-empty"
      >
        <p>No nearby places found.</p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      data-testid="section-nearby-places-grid"
    >
      {categories.map((category) => {
        const IconComponent = categoryIcons[category] || UtensilsCrossed;
        const colorClass = categoryColors[category] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100";
        const categoryPlaces = places[category] || [];

        return (
          <Card
            key={category}
            className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-200 hover-elevate overflow-hidden"
            data-testid={`card-category-${category.toLowerCase()}`}
          >
            <CardContent className="p-4">
              {/* Category Header */}
              <div className={`flex items-center gap-2 rounded-lg p-2 mb-3 ${colorClass}`}>
                <IconComponent className="h-5 w-5" />
                <h3 className="text-sm font-semibold">{category}</h3>
              </div>

              {/* Places List */}
              <div className="space-y-2">
                {categoryPlaces.slice(0, 5).map((place, idx) => (
                  <div key={idx} data-testid={`place-${category.toLowerCase()}-${idx}`}>
                    <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight truncate">
                      {place.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {place.distance} mi
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
