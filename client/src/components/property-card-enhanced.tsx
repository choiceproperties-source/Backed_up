import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bed, Bath, Maximize, Heart, Share2, Image as ImageIcon, Star, Calendar, CheckCircle, Plus, Minus, Scale, PawPrint, Zap, Home, ArrowRight, Wifi, Coffee } from "lucide-react";
import type { Property, PropertyWithOwner } from "@/lib/types";
import { useFavorites } from "@/hooks/use-favorites";
import placeholderExterior from "@assets/generated_images/modern_luxury_home_exterior_with_blue_sky.png";
import placeholderLiving from "@assets/generated_images/bright_modern_living_room_interior.png";
import placeholderKitchen from "@assets/generated_images/modern_kitchen_with_marble_island.png";
import placeholderBedroom from "@assets/generated_images/cozy_modern_bedroom_interior.png";
import { toast } from "sonner";

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

interface EnhancedPropertyCardProps {
  property: PropertyWithOwner;
  onQuickView?: (property: Property) => void;
  onCompare?: (property: Property) => void;
  isInComparison?: boolean;
  showCompareButton?: boolean;
}

export function EnhancedPropertyCard({ 
  property, 
  onQuickView, 
  onCompare,
  isInComparison = false,
  showCompareButton = true 
}: EnhancedPropertyCardProps) {
  const [primaryPhoto, setPrimaryPhoto] = useState<PropertyPhoto | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || property.images[0]) : placeholderExterior;
  const mainImage = primaryPhoto?.imageUrls.thumbnail || fallbackImage;
  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();
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

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/property/${property.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCompare?.(property);
    if (isInComparison) {
      toast.info("Removed from comparison");
    } else {
      toast.success("Added to comparison");
    }
  };

  // Calculate average rating
  const averageRating = property.average_rating || (property.reviews?.length 
    ? property.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / property.reviews.length 
    : null);

  // Get owner/agent info
  const ownerName = property.owner?.full_name || "Property Owner";
  const ownerImage = property.owner?.profile_image;
  const ownerInitials = ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Determine availability status
  const isAvailable = property.status === 'active' || property.status === 'available';
  const leaseInfo = property.lease_term || "12 months";

  return (
    <Card 
      className="overflow-hidden group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 dark:hover:shadow-black/60 border-none bg-card/50 backdrop-blur-md relative"
      onClick={() => onQuickView?.(property)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-property-${property.id}`}
    >
      {/* Image with enhanced hover effects and gradient overlay */}
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
        
        {/* Gradient Overlay for better badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
        
        {/* Top Left Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[70%] z-10">
          <Badge className="bg-secondary/90 backdrop-blur-md text-primary-foreground font-black text-[10px] uppercase tracking-widest border-none shadow-2xl px-3 py-1.5">
            For Rent
          </Badge>
          <Badge className="bg-white/10 backdrop-blur-md dark:bg-card/20 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/20 px-3 py-1.5">
            {property.property_type || 'Property'}
          </Badge>
          {isAvailable && (
            <Badge className="bg-green-500/80 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-2xl border border-white/10 px-3 py-1.5 animate-pulse">
              <CheckCircle className="h-3.5 w-3.5" />
              Available
            </Badge>
          )}
        </div>
        
        {/* Key Features Badges - Top Right */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 transition-all duration-500" style={{
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateX(0)' : 'translateX(10px)'
        }}>
          {property.pets_allowed && (
            <Badge className="bg-purple-500/80 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-2xl border border-white/10 px-3 py-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              Pets
            </Badge>
          )}
          {property.utilities_included && property.utilities_included.length > 0 && (
            <Badge className="bg-amber-500/80 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-2xl border border-white/10 px-3 py-1.5">
              <Zap className="h-3.5 w-3.5" />
              Bills Incl.
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-20" onClick={(e) => e.stopPropagation()}>
          {showCompareButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleCompare}
                  className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-2xl border border-white/20 ${
                    isInComparison 
                      ? 'bg-primary text-white scale-110' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  data-testid="button-compare-card"
                >
                  <Scale className="h-4.5 w-4.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/90 text-white border-none font-bold">
                {isInComparison ? "Remove Comparison" : "Add to Compare"}
              </TooltipContent>
            </Tooltip>
          )}
          <button 
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl"
            title="Share property"
            data-testid="button-share-card"
          >
            <Share2 className="h-4.5 w-4.5" />
          </button>
          <button 
            onClick={handleToggleFavorite}
            className="p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl"
            title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
          >
            {isFavorited(property.id) ? (
              <Heart className="h-4.5 w-4.5 fill-red-500 text-red-500 transition-all duration-300" />
            ) : (
              <Heart className="h-4.5 w-4.5 transition-all duration-300" />
            )}
          </button>
        </div>

        {/* Rating Badge - Bottom Left */}
        {averageRating && (
          <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black border border-white/20 shadow-2xl z-10">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {averageRating.toFixed(1)}
            {property.reviews?.length && (
              <span className="text-white/60 font-bold ml-0.5">({property.reviews.length})</span>
            )}
          </div>
        )}

        {/* Lease Term Badge - Bottom Right */}
        <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black border border-white/20 shadow-2xl z-10">
          <Calendar className="h-3.5 w-3.5" />
          {leaseInfo}
        </div>
      </div>

      <CardContent className="p-6">
        {/* Price Line - High Impact */}
        <div className="flex items-baseline gap-1.5 mb-5">
          <span className="text-3xl font-black tracking-tighter text-primary">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
          <span className="text-muted-foreground text-[11px] font-black uppercase tracking-widest">per month</span>
        </div>

        {/* Owner/Agent Info Card - Modern Glassmorphism variant */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-muted/30 rounded-2xl border border-border/20 backdrop-blur-sm group-hover:bg-muted/50 transition-colors duration-500">
          <Avatar className="h-10 w-10 ring-4 ring-secondary/10 shadow-xl">
            {ownerImage ? (
              <AvatarImage src={ownerImage} alt={ownerName} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-xs bg-secondary/10 text-secondary font-black">
              {ownerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-foreground uppercase tracking-widest mb-1">Verified Host</p>
            <p className="text-sm font-bold text-foreground truncate">
              {ownerName}
            </p>
          </div>
          <div className="bg-secondary/10 px-2 py-1 rounded-lg">
             <CheckCircle className="h-4 w-4 text-secondary" />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bed className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Beds</span>
            </div>
            <p className="text-lg font-black">{property.bedrooms || 0}</p>
          </div>
          <div className="flex flex-col gap-1 border-x border-border/50 px-6">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bath className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Baths</span>
            </div>
            <p className="text-lg font-black">{property.bathrooms || 0}</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Maximize className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Area</span>
            </div>
            <p className="text-lg font-black">{property.square_feet ? Math.round(property.square_feet / 100) / 10 : '0'}k <span className="text-xs font-bold text-muted-foreground">sf</span></p>
          </div>
        </div>

        {/* Call to Action */}
        <Link href={`/property/${property.id}`}>
          <Button 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover-elevate active-elevate-2 transition-all duration-300 group/btn overflow-hidden relative"
            data-testid="button-view-property"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              View Property Details
              <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1.5 transition-transform duration-500" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-white/10 to-secondary/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
