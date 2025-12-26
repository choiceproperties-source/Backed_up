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
  const [isHovered, setIsHovered] = useState(false);
  const [primaryPhoto, setPrimaryPhoto] = useState<PropertyPhoto | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || property.images[0]) : placeholderExterior;
  
  // Interactive mini-gallery logic
  const displayImage = photos.length > 0 && isHovered 
    ? photos[currentImageIndex]?.imageUrls.thumbnail || fallbackImage
    : primaryPhoto?.imageUrls.thumbnail || fallbackImage;

  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHovered && photos.length > 1) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % Math.min(photos.length, 5));
      }, 1500);
    } else {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, photos.length]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/images/property/${property.id}`);
        if (response.ok) {
          const result = await response.json();
          const photosData = result.data || [];
          setPhotos(photosData);
          setPhotoCount(photosData.length);
          
          const primary = photosData[0] || null;
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
      className="overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 dark:hover:shadow-black/60 border border-transparent hover:border-white/20 bg-card/50 backdrop-blur-md relative flex flex-col h-full"
      onClick={() => onQuickView?.(property)}
      onMouseEnter={() => {
        setIsHovered(true);
        prefetchDetails();
      }}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-property-${property.id}`}
    >
      {/* Visual Glint Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none z-20" />

      {/* Image Section - Maintain 16:9 ratio */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <Link href={`/property/${property.id}`}>
          <span className="block w-full h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={displayImage}
              alt={`${property.title} - ${property.property_type || 'Property'}`}
              loading="lazy"
              decoding="async"
              className="object-cover w-full h-full group-hover:scale-105 transition-all duration-700 ease-in-out"
              data-testid="img-property-preview"
            />
          </span>
        </Link>
        
        {/* Interactive Gallery Progress Dots */}
        {isHovered && photos.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 z-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {photos.slice(0, 5).map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
              />
            ))}
          </div>
        )}
        
        {/* Dark wash gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 transition-all duration-500">
          <Badge className="bg-primary/90 backdrop-blur-md text-primary-foreground font-black text-[10px] uppercase tracking-widest border-none shadow-lg px-2 py-1" data-testid="badge-status">
            {property.status === 'available' ? 'Available' : property.status === 'pending' ? 'Pending' : 'Rented'}
          </Badge>
          {photoCount > 1 && (
            <Badge className="bg-black/40 backdrop-blur-md text-white font-bold text-[10px] shadow-lg border border-white/10 px-2 py-1 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {photoCount}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2 z-10 transition-all duration-500" onClick={(e) => e.stopPropagation()} style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(-10px)'
        }}>
          <button 
            onClick={handleShare}
            className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-xl"
            title={copied ? "Copied!" : "Share property"}
            data-testid="button-share-card"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={handleToggleFavorite}
            className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-xl"
            title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
          >
            <Heart className={`h-3.5 w-3.5 transition-all duration-300 ${isFavorited(property.id) ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        {/* Price Tag Overlay - High Visibility */}
        <div className="absolute bottom-3 left-3 flex items-baseline gap-1 text-white z-10 [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)]">
          <span className="text-2xl font-black tracking-tighter">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">/mo</span>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Title & Type */}
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">{property.property_type || 'Property'}</p>
          <h3 className="text-base font-bold text-foreground truncate" title={property.title}>
            {property.title}
          </h3>
        </div>

        {/* Stats Row - Icon based, single row */}
        <div className="flex items-center gap-4 py-2 border-y border-border/40">
          <div className="flex items-center gap-1.5" title="Bedrooms">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">{property.bedrooms || 0}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Bathrooms">
            <Bath className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">{property.bathrooms || 0}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Square Feet">
            <Maximize className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">{property.square_feet ? Math.round(property.square_feet).toLocaleString() : '0'} <span className="text-[10px] text-muted-foreground uppercase font-black">sf</span></span>
          </div>
        </div>

        {/* Address */}
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Home className="h-3 w-3 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Location</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground truncate capitalize mt-1">
            {property.address.toLowerCase()}, {property.city?.toLowerCase() || 'N/A'}
          </p>
        </div>

        {/* CTA Section */}
        <Link href={`/property/${property.id}`}>
          <button 
            className="w-full h-11 bg-secondary hover:bg-secondary/90 text-primary-foreground font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg hover-elevate active-elevate-2 transition-all flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
            data-testid="button-view-details"
          >
            View Details
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}
