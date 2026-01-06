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

interface PropertyCardProps {
  property: Property;
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

        <CardContent className="p-4 flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors text-slate-900 dark:text-white" data-testid={`text-title-${property.id}`}>
              {property.title}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-slate-500 dark:text-slate-400 text-sm" data-testid={`text-address-${property.id}`}>
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{property.address}, {property.city}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center gap-0.5" data-testid={`stats-beds-${property.id}`}>
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Bed className="w-4 h-4 text-primary" />
                <span>{property.bedrooms || 0}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Beds</span>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="flex flex-col items-center gap-0.5" data-testid={`stats-baths-${property.id}`}>
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Bath className="w-4 h-4 text-primary" />
                <span>{property.bathrooms || '0'}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Baths</span>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="flex flex-col items-center gap-0.5" data-testid={`stats-sqft-${property.id}`}>
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <Maximize className="w-4 h-4 text-primary" />
                <span>{property.square_feet ? Math.round(property.square_feet).toLocaleString() : '0'}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sq Ft</span>
            </div>
          </div>

          {/* Optional Badges (Pets, Furnished) */}
          <div className="flex gap-2">
            {property.pets_allowed && (
              <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 border-slate-200 text-slate-600 dark:text-slate-400">
                <Dog className="w-3 h-3 mr-1" /> Pets OK
              </Badge>
            )}
            {property.furnished && (
              <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 border-slate-200 text-slate-600 dark:text-slate-400">
                <Armchair className="w-3 h-3 mr-1" /> Furnished
              </Badge>
            )}
          </div>

          {property.application_fee && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded">
              <span className="font-medium">Application Fee</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">${Number(property.application_fee)}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 font-bold text-[10px] uppercase tracking-wider h-9 border-slate-200 hover:bg-slate-50 no-default-active-elevate"
            onClick={handleShare}
            data-testid={`button-share-${property.id}`}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share
          </Button>
          <Button 
            className="flex-[1.5] font-bold text-[10px] uppercase tracking-wider h-9 shadow-md shadow-primary/10 active-elevate-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLocation(`/property/${property.id}/apply`);
            }}
            data-testid={`button-apply-${property.id}`}
          >
            Apply Now
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
});
