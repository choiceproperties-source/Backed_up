import { useState, memo } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bed, 
  Bath, 
  Maximize, 
  Heart, 
  Share2, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  Dog,
  Armchair
} from "lucide-react";
import type { Property } from "@/lib/types";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import placeholderExterior from "@assets/generated_images/modern_luxury_home_exterior_with_blue_sky.png";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PropertyCardProps {
  property: Property & {
    poster?: {
      name: string;
      avatar: string | null;
      role_label: string;
    };
  };
  onShare?: (property: Property) => void;
}

export const PropertyCard = memo(function PropertyCard({ property, onShare }: PropertyCardProps) {
  const [_, setLocation] = useLocation();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [isHovered, setIsHovered] = useState(false);

  const mainImage = property.images?.[0] || placeholderExterior;
  const isAvailable = property.listing_status === 'available' || property.status === 'active';
  const favorited = isFavorited(property.id);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(property.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare(property);
    } else if (navigator.share) {
      navigator.share({
        title: property.title,
        text: property.description || '',
        url: window.location.origin + `/property/${property.id}`
      }).catch(() => {});
    }
  };

  return (
    <Card 
      className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-card hover-elevate rounded-md flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-property-${property.id}`}
    >
      <Link href={`/property/${property.id}`} className="flex flex-col h-full">
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={mainImage}
            alt={property.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
            data-testid={`img-property-main-${property.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge 
              className={cn(
                "font-bold shadow-sm uppercase text-[10px] tracking-wider border-none px-2",
                isAvailable ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
              )}
              data-testid={`status-listing-${property.id}`}
            >
              {isAvailable ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available Now</span>
              ) : (
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Off Market</span>
              )}
            </Badge>
            {property.property_type && (
              <Badge variant="secondary" className="bg-white/90 text-slate-900 hover:bg-white text-[10px] uppercase font-bold tracking-wider" data-testid={`text-type-${property.id}`}>
                {property.property_type}
              </Badge>
            )}
          </div>

          {/* Price Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div className="text-white" data-testid={`text-price-${property.id}`}>
              <span className="text-2xl font-black">${property.price ? Math.round(parseFloat(property.price)).toLocaleString() : 'N/A'}</span>
              <span className="text-sm font-medium opacity-90"> /mo</span>
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 active-elevate-2",
                favorited && "text-red-500 bg-white/90 hover:bg-white"
              )}
              onClick={handleToggleFavorite}
              data-testid={`button-favorite-${property.id}`}
            >
              <Heart className={cn("w-5 h-5", favorited && "fill-current")} />
            </Button>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors text-slate-900 dark:text-white" data-testid={`text-title-${property.id}`}>
                {property.title}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-slate-500 dark:text-slate-400 text-sm" data-testid={`text-address-${property.id}`}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{property.city}, {property.state || 'GA'}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-1.5" data-testid={`stats-beds-${property.id}`}>
                <Bed className="w-4 h-4 text-slate-400" />
                <span>{property.bedrooms || 0}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid={`stats-baths-${property.id}`}>
                <Bath className="w-4 h-4 text-slate-400" />
                <span>{property.bathrooms || '0'}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid={`stats-sqft-${property.id}`}>
                <Maximize className="w-4 h-4 text-slate-400" />
                <span>{property.square_feet ? Math.round(property.square_feet).toLocaleString() : '0'}</span>
              </div>
            </div>

            {/* Optional Badges (Pets, Furnished) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {property.pets_allowed && (
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold py-0 h-5 border-slate-200 bg-slate-50/50 text-slate-600 dark:text-slate-400">
                  <Dog className="w-3 h-3 mr-1" /> Pets
                </Badge>
              )}
              {property.furnished && (
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold py-0 h-5 border-slate-200 bg-slate-50/50 text-slate-600 dark:text-slate-400">
                  <Armchair className="w-3 h-3 mr-1" /> Furnished
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        {/* Removed Footer to keep card minimal and click-driven */}
      </Link>
      
      {/* Absolute positioned actions for subtle interaction without cluttering flow */}
      <div className="absolute bottom-4 right-4 flex gap-2">
         <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full flex-shrink-0 transition-all opacity-0 group-hover:opacity-100"
            onClick={handleShare}
            title="Share listing"
            data-testid={`button-share-${property.id}`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>
      </div>
    </Card>
  );
});
