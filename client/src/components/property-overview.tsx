import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Home } from "lucide-react";
import type { Property } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";

interface PropertyOverviewProps {
  property: Property;
}

export function PropertyOverview({ property }: PropertyOverviewProps) {
  const bedrooms = property.bedrooms || 0;
  const bathrooms = Math.round(parseDecimal(property.bathrooms));
  const sqft = property.square_feet || 0;

  return (
    <Card className="border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800 transition-all duration-200">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(property.price)}
                </span>
                <span className="text-lg text-gray-600 dark:text-gray-400">/mo</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Monthly Rent</p>
            </div>

            <div>
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <address className="not-italic">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {property.address}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {property.city}, {property.state} {property.zip_code}
                  </p>
                </address>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 text-sm">
                <Home className="h-3 w-3 mr-1" />
                {bedrooms} Beds
              </Badge>
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 text-sm">
                {bathrooms} Baths
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100 text-sm">
                {sqft ? sqft.toLocaleString() : 'N/A'} sqft
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
                data-testid="badge-status"
              >
                {property.status || 'Active'}
              </Badge>
              <Badge 
                variant="outline" 
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
                data-testid="badge-property-type"
              >
                {property.property_type || 'Not specified'}
              </Badge>
              {property.furnished && (
                <Badge 
                  variant="secondary" 
                  className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-100 text-sm"
                  data-testid="badge-furnished"
                >
                  Furnished
                </Badge>
              )}
              {property.pets_allowed && (
                <Badge 
                  variant="secondary" 
                  className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-100 text-sm"
                  data-testid="badge-pets-allowed"
                >
                  Pets Allowed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
