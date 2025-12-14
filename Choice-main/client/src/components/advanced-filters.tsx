import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface AdvancedFiltersProps {
  petFriendly: boolean;
  onPetFriendlyChange: (value: boolean) => void;
  furnished: boolean;
  onFurnishedChange: (value: boolean) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
}

const AMENITIES = ['Pool', 'Gym', 'Parking', 'Laundry', 'Dishwasher', 'A/C', 'Fireplace', 'Garden'];

export function AdvancedFilters({
  petFriendly,
  onPetFriendlyChange,
  furnished,
  onFurnishedChange,
  selectedAmenities,
  onAmenitiesChange
}: AdvancedFiltersProps) {
  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const updated = checked
      ? [...selectedAmenities, amenity]
      : selectedAmenities.filter(a => a !== amenity);
    onAmenitiesChange(updated);
  };

  // Calculate total filters applied
  const totalFiltersApplied = (petFriendly ? 1 : 0) + (furnished ? 1 : 0) + selectedAmenities.length;

  return (
    <Card className="p-6 space-y-6 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 transition-all duration-300" data-testid="card-advanced-filters">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">More Options</h3>
        {totalFiltersApplied > 0 && (
          <Badge className="bg-primary text-white dark:bg-blue-600 animate-pulse" data-testid={`badge-filters-count-${totalFiltersApplied}`}>
            {totalFiltersApplied} applied
          </Badge>
        )}
      </div>

      <div className="space-y-3 transition-all duration-300">
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox 
            checked={petFriendly} 
            onCheckedChange={() => onPetFriendlyChange(!petFriendly)}
            data-testid="checkbox-pet-friendly"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors duration-200">
            Pet Friendly
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox 
            checked={furnished} 
            onCheckedChange={() => onFurnishedChange(!furnished)}
            data-testid="checkbox-furnished"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors duration-200">
            Furnished
          </span>
        </label>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white flex items-center justify-between">
          Amenities
          {selectedAmenities.length > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-amenities-count">
              {selectedAmenities.length}
            </Badge>
          )}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {AMENITIES.map((amenity, idx) => {
            const isChecked = selectedAmenities.includes(amenity);
            return (
              <label 
                key={amenity} 
                className={`flex items-center gap-2 cursor-pointer p-2 rounded-md transition-all duration-200 ${
                  isChecked 
                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-primary dark:border-blue-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleAmenityChange(amenity, !!checked)}
                  data-testid={`checkbox-amenity-${amenity.replace(/\s+/g, '-').toLowerCase()}`}
                />
                <span className={`text-sm font-medium transition-colors duration-200 ${
                  isChecked 
                    ? 'text-primary dark:text-blue-400 font-semibold' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {amenity}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
