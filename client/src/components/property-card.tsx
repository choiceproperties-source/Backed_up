import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bed, Bath, Maximize, Heart, CheckCircle2, Share2, Image as ImageIcon } from "lucide-react";
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
  const [photoCount, setPhotoCount] = useState(0);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || property.images[0]) : placeholderExterior;
  const mainImage = primaryPhoto?.imageUrls.thumbnail || fallbackImage;
  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/images/property/${property.id}`);
        if (response.ok) {
          const result = await response.json();
          const photos = result.data || [];
          setPhotoCount(photos.length);
          
          const primary = photos[0] || null;
          if (primary) {
            setPrimaryPhoto(primary);
          }
        } else {
          setPhotoCount(0);
        }
      } catch (err) {
        setPhotoCount(0);
      } finally {
        setIsLoadingPhotos(false);
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
    // Prefetch property details
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
    
    // Prefetch photos in parallel
    queryClient.prefetchQuery({
      queryKey: ['/api/v2/images/property', property.id],
      queryFn: async () => {
        const res = await fetch(`/api/v2/images/property/${property.id}`);
        const json = await res.json();
        return json?.data ?? [];
      },
    });

    // Prefetch reviews for faster display
    queryClient.prefetchQuery({
      queryKey: ['/api/v2/reviews/property', property.id],
      queryFn: async () => {
        const res = await fetch(`/api/v2/reviews/property/${property.id}`);
        const json = await res.json();
        return json?.data ?? [];
      },
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/property/${property.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card 
      className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:shadow-2xl dark:hover:shadow-black/50"
      onClick={() => onQuickView?.(property)}
      onMouseEnter={() => {
        setIsHovered(true);
        prefetchDetails();
      }}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-property-${property.id}`}
    >
      {/* Image with enhanced hover effects */}
      <div className="relative aspect-[1.6/1] overflow-hidden bg-muted">
        <Link href={`/property/${property.id}`}>
          <span className="block w-full h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={mainImage}
              alt={property.title}
              loading="lazy"
              decoding="async"
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 ease-out"
              data-testid="img-property-preview"
            />
          </span>
        </Link>
        
        {/* Dark wash gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        
        {/* Badges with smooth animation */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 transition-all duration-300" style={{
          opacity: isHovered ? 0.9 : 1,
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
        }}>
          <Badge className="bg-secondary text-primary-foreground font-bold text-[10px] uppercase tracking-wider border border-secondary shadow-md" data-testid="badge-for-rent">
            For Rent
          </Badge>
          <Badge className="bg-white/90 dark:bg-card text-primary font-bold text-[10px] uppercase tracking-wider shadow-sm" data-testid="badge-property-type">
            {property.property_type || 'Property'}
          </Badge>
          {photoCount > 0 && (
            <Badge className="bg-blue-500/90 text-white font-bold text-[10px] flex items-center gap-1 shadow-md" data-testid="badge-photo-count">
              <ImageIcon className="h-3 w-3" />
              {photoCount}
            </Badge>
          )}
        </div>

        {/* Action buttons with enhanced visibility */}
        <div className="absolute top-3 right-3 flex gap-2 z-10 transition-all duration-300" onClick={(e) => e.stopPropagation()} style={{
          opacity: isHovered ? 1 : 0.8,
        }}>
          <button 
            onClick={handleShare}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition-all text-white shadow-lg hover-elevate"
            title={copied ? "Copied!" : "Share property"}
            data-testid="button-share-card"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToggleFavorite}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition-all text-white shadow-lg hover-elevate"
            title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
          >
            {isFavorited(property.id) ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500 transition-all duration-200" />
            ) : (
              <Heart className="h-4 w-4 transition-all duration-200" />
            )}
          </button>
        </div>
      </div>

      <CardContent className="p-4 pb-3">
        {/* Price and Host Info */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
            <span className="text-muted-foreground text-xs font-medium">/mo</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-foreground leading-tight">Verified Host</p>
              <p className="text-[9px] text-muted-foreground leading-tight">Fast Response</p>
            </div>
            <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-secondary/20 text-secondary text-[10px] font-bold">
                VH
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Stats Line */}
        <div className="flex items-center gap-3 text-sm mb-3 font-medium border-b border-border/50 pb-3">
            <div className="flex items-center gap-1">
                <Bed className="h-4 w-4 text-secondary" />
                <span className="font-bold">{property.bedrooms || 0}</span>
                <span className="font-normal text-muted-foreground text-xs">bds</span>
            </div>
            <div className="w-px h-3 bg-border"></div>
            <div className="flex items-center gap-1">
                <Bath className="h-4 w-4 text-secondary" />
                <span className="font-bold">{property.bathrooms || 0}</span>
                <span className="font-normal text-muted-foreground text-xs">ba</span>
            </div>
            <div className="w-px h-3 bg-border"></div>
            <div className="flex items-center gap-1">
                <Maximize className="h-4 w-4 text-secondary" />
                <span className="font-bold">{property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</span>
                <span className="font-normal text-muted-foreground text-xs">sqft</span>
            </div>
        </div>

        {/* Address */}
        <div className="text-sm text-muted-foreground truncate flex items-center gap-1" data-testid="text-property-address">
            <span className="w-1 h-1 rounded-full bg-secondary shrink-0" />
            {property.address}, {property.city || 'N/A'}, {property.state || ''}
        </div>
      </CardContent>
    </Card>
  );
}
