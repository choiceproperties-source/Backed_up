import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bed, Bath, Maximize, Heart, CheckCircle2, Share2, Image as ImageIcon, Home, ArrowRight } from "lucide-react";
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
      className="overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 dark:hover:shadow-black/60 border-none bg-card/50 backdrop-blur-sm"
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
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
              data-testid="img-property-preview"
            />
          </span>
        </Link>
        
        {/* Dark wash gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        {/* Badges with smooth animation */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 transition-all duration-500" style={{
          opacity: isHovered ? 1 : 0.9,
          transform: isHovered ? 'translateY(0)' : 'translateY(2px)'
        }}>
          <Badge className="bg-secondary/90 backdrop-blur-md text-primary-foreground font-bold text-[10px] uppercase tracking-widest border-none shadow-xl px-2.5 py-1" data-testid="badge-for-rent">
            For Rent
          </Badge>
          <Badge className="bg-white/10 backdrop-blur-md dark:bg-card/20 text-white font-bold text-[10px] uppercase tracking-widest shadow-xl border border-white/20 px-2.5 py-1" data-testid="badge-property-type">
            {property.property_type || 'Property'}
          </Badge>
        </div>

        {/* Action buttons with enhanced visibility */}
        <div className="absolute top-4 right-4 flex gap-2 z-10 transition-all duration-500" onClick={(e) => e.stopPropagation()} style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(10px)'
        }}>
          <button 
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl hover-elevate"
            title={copied ? "Copied!" : "Share property"}
            data-testid="button-share-card"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToggleFavorite}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl hover-elevate"
            title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
          >
            {isFavorited(property.id) ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500 transition-all duration-300" />
            ) : (
              <Heart className="h-4 w-4 transition-all duration-300" />
            )}
          </button>
        </div>

        {/* Price Tag Overlay - Bottom Left */}
        <div className="absolute bottom-4 left-4 flex items-baseline gap-1 text-white z-10 [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">
          <span className="text-2xl font-black tracking-tight">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
          <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">/ mo</span>
        </div>
      </div>

      <CardContent className="p-5">
        {/* Host Info & Stats */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-secondary/20 shadow-inner">
              <AvatarFallback className="bg-secondary/10 text-secondary text-xs font-black">
                VH
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[11px] font-black text-foreground uppercase tracking-wider leading-none mb-1">Verified Host</p>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-secondary" />
                <p className="text-[10px] text-muted-foreground font-bold">Identity Confirmed</p>
              </div>
            </div>
          </div>
          
          {photoCount > 0 && (
            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-black text-foreground">{photoCount}</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-5 p-3 rounded-2xl bg-muted/30 border border-border/20">
            <div className="flex flex-col items-center gap-1 border-r border-border/50">
                <Bed className="h-4 w-4 text-secondary/70" />
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs font-black">{property.bedrooms || 0}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Beds</span>
                </div>
            </div>
            <div className="flex flex-col items-center gap-1 border-r border-border/50">
                <Bath className="h-4 w-4 text-secondary/70" />
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs font-black">{property.bathrooms || 0}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Baths</span>
                </div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <Maximize className="h-4 w-4 text-secondary/70" />
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs font-black">{property.square_feet ? Math.round(property.square_feet / 100) / 10 : '0'}k</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Sqft</span>
                </div>
            </div>
        </div>

        {/* Address & Quick View */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
              <Home className="h-3 w-3 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-widest truncate">Location</p>
            </div>
            <p className="text-sm font-bold text-foreground truncate capitalize" data-testid="text-property-address">
              {property.address.toLowerCase()}, {property.city?.toLowerCase() || 'N/A'}, {property.state?.toUpperCase() || ''}
            </p>
          </div>
          <Link href={`/property/${property.id}`}>
            <button className="h-10 w-10 rounded-full bg-secondary text-primary-foreground flex items-center justify-center shadow-xl hover-elevate active-elevate-2 transition-all">
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
