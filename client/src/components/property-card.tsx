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
      className="overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 dark:hover:shadow-black/60 border-none bg-card/40 backdrop-blur-md flex flex-col h-full"
      onClick={() => onQuickView?.(property)}
      onMouseEnter={() => {
        setIsHovered(true);
        prefetchDetails();
      }}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-property-${property.id}`}
    >
      {/* Image with enhanced hover effects */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
        
        {/* Badges with smooth animation */}
        <div className="absolute top-5 left-5 flex flex-col gap-2 transition-all duration-500" style={{
          opacity: isHovered ? 1 : 0.9,
          transform: isHovered ? 'translateY(0)' : 'translateY(2px)'
        }}>
          <Badge className="bg-secondary/90 backdrop-blur-md text-primary-foreground font-black text-[10px] uppercase tracking-widest border-none shadow-xl px-3 py-1.5 w-fit" data-testid="badge-for-rent">
            For Rent
          </Badge>
          <Badge className="bg-white/10 backdrop-blur-md dark:bg-card/20 text-white font-black text-[10px] uppercase tracking-widest shadow-xl border border-white/20 px-3 py-1.5 w-fit" data-testid="badge-property-type">
            {property.property_type || 'Property'}
          </Badge>
        </div>

        {/* Action buttons with enhanced visibility */}
        <div className="absolute top-5 right-5 flex flex-col gap-3 z-10 transition-all duration-500" onClick={(e) => e.stopPropagation()} style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(10px)'
        }}>
          <button 
            onClick={handleShare}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl hover-elevate"
            title={copied ? "Copied!" : "Share property"}
            data-testid="button-share-card"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToggleFavorite}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl hover-elevate"
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
        <div className="absolute bottom-6 left-6 flex flex-col gap-0.5 text-white z-10 drop-shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Starting at</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tighter">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
            <span className="text-white/80 text-[11px] font-black uppercase tracking-widest">/ mo</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6 flex flex-col flex-1 justify-between">
        <div>
          {/* Host Info */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-10 w-10 ring-4 ring-secondary/10 shadow-2xl">
              <AvatarFallback className="bg-secondary/10 text-secondary text-xs font-black">
                VH
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[11px] font-black text-foreground uppercase tracking-widest leading-none mb-1.5">Verified Host</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">Identity Confirmed</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Home className="h-3.5 w-3.5 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Primary Location</p>
            </div>
            <p className="text-base font-black text-foreground leading-snug" data-testid="text-property-address">
              {property.address}
            </p>
            <p className="text-xs text-muted-foreground font-bold mt-1">
              {property.city}, {property.state}
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6 p-4 rounded-2xl bg-muted/30 border border-border/20 mb-6">
              <div className="flex flex-col gap-1.5 flex-1 items-center border-r border-border/50">
                  <Bed className="h-4.5 w-4.5 text-secondary/70" />
                  <p className="text-sm font-black">{property.bedrooms || 0} <span className="text-[10px] text-muted-foreground uppercase font-black ml-0.5">Bds</span></p>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 items-center border-r border-border/50">
                  <Bath className="h-4.5 w-4.5 text-secondary/70" />
                  <p className="text-sm font-black">{property.bathrooms || 0} <span className="text-[10px] text-muted-foreground uppercase font-black ml-0.5">Ba</span></p>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 items-center">
                  <Maximize className="h-4.5 w-4.5 text-secondary/70" />
                  <p className="text-sm font-black">{property.square_feet ? Math.round(property.square_feet / 100) / 10 : '0'}k <span className="text-[10px] text-muted-foreground uppercase font-black ml-0.5">Sf</span></p>
              </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
          {photoCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-black uppercase tracking-widest">{photoCount} Photos</span>
            </div>
          )}
          <button className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl hover-elevate active-elevate-2 transition-all ml-auto">
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
