import { Card, CardContent } from "@/components/ui/card";
import { 
  Armchair, Wind, Flame, Dog, Package, Zap, Lock, Trees, type LucideIcon
} from "lucide-react";

interface AmenitiesGridProps {
  amenities?: string[];
}

// Map of amenity names to their icons and properties
const amenityMap: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  "Parking": { icon: Package, label: "Parking", color: "text-blue-600 dark:text-blue-400" },
  "Air Conditioning": { icon: Wind, label: "Air Conditioning", color: "text-cyan-600 dark:text-cyan-400" },
  "AC": { icon: Wind, label: "Air Conditioning", color: "text-cyan-600 dark:text-cyan-400" },
  "Heating": { icon: Flame, label: "Heating", color: "text-orange-600 dark:text-orange-400" },
  "Pet Friendly": { icon: Dog, label: "Pet Friendly", color: "text-amber-600 dark:text-amber-400" },
  "Pets Allowed": { icon: Dog, label: "Pet Friendly", color: "text-amber-600 dark:text-amber-400" },
  "Furnished": { icon: Armchair, label: "Furnished", color: "text-yellow-600 dark:text-yellow-400" },
  "Balcony": { icon: Trees, label: "Balcony", color: "text-green-600 dark:text-green-400" },
  "In-Unit Laundry": { icon: Zap, label: "In-Unit Laundry", color: "text-purple-600 dark:text-purple-400" },
  "Laundry": { icon: Zap, label: "In-Unit Laundry", color: "text-purple-600 dark:text-purple-400" },
  "Security System": { icon: Lock, label: "Security System", color: "text-red-600 dark:text-red-400" },
  "Security": { icon: Lock, label: "Security System", color: "text-red-600 dark:text-red-400" },
};

export function AmenitiesGrid({ amenities = [] }: AmenitiesGridProps) {
  if (!amenities || amenities.length === 0) {
    return (
      <div 
        className="text-center py-8 text-gray-500 dark:text-gray-400"
        data-testid="section-amenities-empty"
      >
        <p>No amenities information available.</p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      data-testid="section-amenities-grid"
    >
      {amenities.map((amenity, index) => {
        const amenityInfo = amenityMap[amenity] || {
          icon: Package,
          label: amenity,
          color: "text-gray-600 dark:text-gray-400"
        };
        
        const IconComponent = amenityInfo.icon;

        return (
          <Card
            key={`${amenity}-${index}`}
            className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-200 hover-elevate"
            data-testid={`card-amenity-${amenity.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 transition-colors duration-200`}>
                <IconComponent className={`h-6 w-6 ${amenityInfo.color}`} />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                {amenityInfo.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
