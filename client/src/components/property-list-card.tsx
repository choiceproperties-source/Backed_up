import { memo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Maximize, Heart, MapPin, Calendar, Image as ImageIcon } from "lucide-react";
import type { Property } from "@/lib/types";
import { useFavorites } from "@/hooks/use-favorites";
import placeholderExterior from "@assets/generated_images/modern_luxury_home_exterior_with_blue_sky.png";

interface PropertyListCardProps {
  property: Property;
  onQuickView?: (property: Property) => void;
}

export const PropertyListCard = memo(function PropertyListCard({ property, onQuickView }: PropertyListCardProps) {
  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();
  
  const photos = property.propertyPhotos || [];
  const photoCount = photos.length;
  const mainImage = photos[0]?.imageUrls.thumbnail || (property.images?.[0] || placeholderExterior);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(property.id);
  };

  const price = typeof property.price === 'string' ? parseInt(property.price) : property.price;

  return (
    <Card 
      className="overflow-hidden group cursor-pointer transition-all duration-200 hover:shadow-lg"
      onClick={() => onQuickView?.(property)}
      data-testid={`list-card-property-${property.id}`}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-64 h-48 sm:h-auto sm:min-h-[180px] flex-shrink-0 overflow-hidden">
          <Link href={`/property/${property.id}`} data-testid={`link-property-image-${property.id}`}>
            <span className="block w-full h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={mainImage}
                alt={property.title}
                loading="lazy"
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                data-testid="img-property-list-preview"
              />
            </span>
          </Link>
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className="bg-secondary text-primary-foreground font-bold text-xs" data-testid="badge-for-rent">
              For Rent
            </Badge>
            {photoCount > 0 && (
              <Badge className="bg-black/60 text-white text-xs flex items-center gap-1" data-testid={`badge-photo-count-${property.id}`}>
                <ImageIcon className="h-3 w-3" />
                {photoCount}
              </Badge>
            )}
          </div>
          <button
            onClick={handleToggleFavorite}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/90 dark:bg-card shadow-md transition-colors hover:bg-white dark:hover:bg-muted"
            aria-label={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid="button-toggle-favorite"
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${isFavorited(property.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <Link href={`/property/${property.id}`} data-testid={`link-property-title-${property.id}`}>
                  <h3 
                    className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-1"
                    onClick={(e) => e.stopPropagation()}
                    data-testid="text-property-title"
                  >
                    {property.title}
                  </h3>
                </Link>
                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                  <span className="line-clamp-1" data-testid="text-property-address">
                    {property.address}{property.city ? `, ${property.city}` : ''}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-primary" data-testid="text-property-price">
                  ${(price || 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
            </div>

            <p className="text-muted-foreground text-sm line-clamp-2 mb-3" data-testid="text-property-description">
              {property.description || "Beautiful property available for rent. Contact us for more details."}
            </p>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-primary" />
                <span data-testid="text-bedrooms">{property.bedrooms || 0} Beds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-primary" />
                <span data-testid="text-bathrooms">{property.bathrooms || 0} Baths</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Maximize className="h-4 w-4 text-primary" />
                <span data-testid="text-sqft">{(property.square_feet || 0).toLocaleString()} sqft</span>
              </div>
              {property.property_type && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-property-type">
                  {property.property_type}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Available Now</span>
              </div>
            </div>
            <Link href={`/property/${property.id}`} data-testid={`link-view-details-${property.id}`}>
              <Button 
                size="sm" 
                onClick={(e) => e.stopPropagation()}
                data-testid="button-view-details"
              >
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
});
