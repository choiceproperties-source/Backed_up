import { useState, memo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Maximize, Heart } from "lucide-react";
import type { Property } from "@/lib/types";
import { useFavorites } from "@/hooks/use-favorites";
import { queryClient } from "@/lib/queryClient";
import placeholderExterior from "@assets/generated_images/modern_luxury_home_exterior_with_blue_sky.png";
import placeholderLiving from "@assets/generated_images/bright_modern_living_room_interior.png";
import placeholderKitchen from "@assets/generated_images/modern_kitchen_with_marble_island.png";
import placeholderBedroom from "@assets/generated_images/cozy_modern_bedroom_interior.png";

const imageMap: Record<string, string> = {
  "placeholder-exterior": placeholderExterior,
  "placeholder-living": placeholderLiving,
  "placeholder-kitchen": placeholderKitchen,
  "placeholder-bedroom": placeholderBedroom,
};

interface PropertyCardProps {
  property: Property;
  onQuickView?: (property: Property) => void;
}

export const PropertyCard = memo(function PropertyCard({ property, onQuickView }: PropertyCardProps) {
  const photos = property.propertyPhotos || [];
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || property.images[0]) : placeholderExterior;
  
  const displayImage = photos.length > 0 
    ? photos[0]?.imageUrls.thumbnail || fallbackImage
    : fallbackImage;

  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(property.id);
  };

  const prefetchDetails = () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/v2/properties', property.id],
      queryFn: async () => {
        const res = await fetch(`/api/v2/properties/${property.id}`);
        const json = await res.json();
        const propertyInfo = json?.data || json;
        return {
          property: propertyInfo,
          owner: propertyInfo?.owner || null
        };
      },
    });
  };

  // Calculate estimated total based on property details
  const monthlyPrice = parseFloat(property.price || "0");
  const estimatedUtilities = Math.round(monthlyPrice * 0.02); // Estimate utilities as 2% of rent
  const estimatedTotal = monthlyPrice + estimatedUtilities;

  return (
    <Link href={`/property/${property.id}`}>
      <Card 
        className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg border-0 shadow-sm bg-white dark:bg-gray-900 flex flex-col h-full rounded-none"
        onMouseEnter={prefetchDetails}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            // Navigation handled by Link
          }
        }}
        data-testid={`card-property-${property.id}`}
        tabIndex={0}
      >
        {/* Image Section with Overlay Badges */}
        <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-none">
          <img
            src={displayImage}
            alt={`${property.title} - ${property.property_type || 'Property'}`}
            loading="lazy"
            decoding="async"
            className="w-full aspect-video object-cover group-hover:scale-105 transition-all duration-500 ease-in-out rounded-none"
            data-testid="img-property-preview"
          />

          {/* Heart Icon - Top Left */}
          <button
            onClick={handleToggleFavorite}
            className="absolute top-3 left-3 p-2.5 rounded-none bg-white dark:bg-gray-200 shadow-lg hover:shadow-xl transition-all active:scale-90 z-10 flex items-center justify-center"
            title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
          >
            <Heart 
              className={`h-5 w-5 transition-all duration-300 ${
                isFavorited(property.id) 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-700'
              }`}
            />
          </button>

          {/* Exclusive Badge Overlay */}
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-none border-none shadow-xl">
              {property.status || 'Exclusive'}
            </Badge>
          </div>
        </div>

        {/* Info Section Below Image */}
        <div className="p-4 space-y-3 flex flex-col flex-1">
          {/* Status Badge */}
          <div>
            {(() => {
              const status = property.status?.toLowerCase().trim() || 'unknown';
              let badgeClass = '';
              let badgeText = '';

              if (status === 'available' || status === 'active') {
                badgeClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
                badgeText = 'Available Now';
              } else if (status === 'pending' || status === 'lease_starting') {
                badgeClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
                badgeText = 'Available Soon';
              } else if (status === 'rented' || status === 'leased') {
                badgeClass = 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
                badgeText = 'Off Market';
              } else if (status === 'off_market' || status === 'unavailable') {
                badgeClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
                badgeText = 'Off Market';
              } else {
                badgeClass = 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
                badgeText = status.charAt(0).toUpperCase() + status.slice(1);
              }

              return (
                <Badge 
                  className={`${badgeClass} border-0 font-bold text-xs px-2.5 py-1 hover:opacity-90 transition-opacity`}
                  data-testid="badge-status"
                >
                  {badgeText}
                </Badge>
              );
            })()}
          </div>

          {/* Address and Price Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2" title={property.address}>
                {property.address}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {property.city}, {property.state || 'GA'} {property.zip_code || ''}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-xl font-black text-gray-900 dark:text-white leading-none">
                ${property.price ? Math.round(parseFloat(property.price)).toLocaleString() : 'N/A'}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">/ mo</span>
            </div>
          </div>

          {/* Estimated Total */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">est. total</span>
            <span className="text-gray-900 dark:text-white font-bold">
              ${Math.round(estimatedTotal).toLocaleString()} / mo
              <button 
                className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 inline-flex"
                title="Includes estimated utilities"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          </div>

          {/* Quick Facts - Bottom */}
          <div className="flex items-center justify-start gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <Bed className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span>{property.bedrooms || 0} Beds</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <Bath className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span>{property.bathrooms || '0'} Baths</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <Maximize className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span>{property.square_feet ? Math.round(property.square_feet).toLocaleString() : '0'} Sqft.</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
});
