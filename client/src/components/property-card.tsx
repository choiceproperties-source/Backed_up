import { useState, useEffect } from "react";
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

interface PropertyPhoto {
  id: string;
  category: string;
  isPrivate: boolean;
  imageUrls: {
    thumbnail: string;
    gallery: string;
    original: string;
  };
}

interface PropertyCardProps {
  property: Property;
  onQuickView?: (property: Property) => void;
}

export function PropertyCard({ property, onQuickView }: PropertyCardProps) {
  const [primaryPhoto, setPrimaryPhoto] = useState<PropertyPhoto | null>(null);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || property.images[0]) : placeholderExterior;
  
  const displayImage = photos.length > 0 
    ? photos[0]?.imageUrls.thumbnail || fallbackImage
    : primaryPhoto?.imageUrls.thumbnail || fallbackImage;

  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/images/property/${property.id}`);
        if (response.ok) {
          const result = await response.json();
          const photosData = result.data || [];
          setPhotos(photosData);
          const primary = photosData[0] || null;
          if (primary) {
            setPrimaryPhoto(primary);
          }
        }
      } catch (err) {
        console.error("Error fetching photos:", err);
      }
    };

    fetchPhotos();
  }, [property.id]);

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
    <Card 
      className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg border-0 shadow-sm bg-white dark:bg-gray-900 flex flex-col h-full"
      onClick={() => onQuickView?.(property)}
      onMouseEnter={prefetchDetails}
      data-testid={`card-property-${property.id}`}
    >
      {/* Top Section - Info */}
      <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-800">
        {/* Status Badge */}
        <div>
          <Badge 
            className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-0 font-bold text-xs px-2.5 py-1 hover:bg-green-100 dark:hover:bg-green-900/30"
            data-testid="badge-status"
          >
            {property.status === 'available' ? 'Available Now' : property.status === 'pending' ? 'Lease Starting' : 'Rented'}
          </Badge>
        </div>

        {/* Address and Price Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={property.address}>
              {property.address}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {property.city}, {property.state || 'GA'}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-lg font-black text-gray-900 dark:text-white leading-none">
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

        {/* Quick Facts */}
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

      {/* Bottom Section - Image with Heart */}
      <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Link href={`/property/${property.id}`}>
          <span className="block w-full h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={displayImage}
              alt={`${property.title} - ${property.property_type || 'Property'}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-in-out rounded-b-2xl"
              data-testid="img-property-preview"
            />
          </span>
        </Link>

        {/* Heart Icon - Top Left */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-3 left-3 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all active:scale-90 z-10 flex items-center justify-center"
          title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
          data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
        >
          <Heart 
            className={`h-5 w-5 transition-all duration-300 ${
              isFavorited(property.id) 
                ? 'fill-red-500 text-red-500' 
                : 'text-gray-700 dark:text-gray-300'
            }`}
          />
        </button>
      </div>
    </Card>
  );
}
