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
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || placeholderExterior) : placeholderExterior;
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
      className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:shadow-2xl dark:hover:shadow-black/50 relative"
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
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 ease-out"
              data-testid="img-property-preview"
            />
          </span>
        </Link>
        
        {/* Gradient Overlay for better badge readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none" />
        
        {/* Top Left Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
          <Badge className="bg-secondary text-primary-foreground font-bold text-xs uppercase tracking-wider border border-secondary shadow-md">
            For Rent
          </Badge>
          <Badge className="bg-white/90 dark:bg-card text-primary font-bold text-xs uppercase tracking-wider shadow-sm">
            {property.property_type || 'Property'}
          </Badge>
          {photoCount > 0 && (
            <Badge className="bg-blue-500/90 text-white font-bold text-xs flex items-center gap-1 shadow-md">
              <ImageIcon className="h-3 w-3" />
              {photoCount}
            </Badge>
          )}
          {isAvailable && (
            <Badge className="bg-green-500/90 text-white font-bold text-xs flex items-center gap-1 shadow-md animate-pulse">
              <CheckCircle className="h-3 w-3" />
              Available
            </Badge>
          )}
        </div>
        
        {/* Key Features Badges - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          {property.pets_allowed && (
            <Badge className="bg-purple-500/90 text-white font-bold text-xs flex items-center gap-1 shadow-md">
              <PawPrint className="h-3 w-3" />
              Pet-Friendly
            </Badge>
          )}
          {property.utilities_included && property.utilities_included.length > 0 && (
            <Badge className="bg-amber-500/90 text-white font-bold text-xs flex items-center gap-1 shadow-md">
              <Zap className="h-3 w-3" />
              Utilities Incl.
            </Badge>
          )}
          {property.furnished && (
            <Badge className="bg-indigo-500/90 text-white font-bold text-xs flex items-center gap-1 shadow-md">
              <Home className="h-3 w-3" />
              Furnished
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          {showCompareButton && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleCompare}
                  className={`p-2 rounded-full transition-all shadow-lg ${
                    isInComparison 
                      ? 'bg-primary text-white' 
                      : 'bg-black/40 hover:bg-black/60 text-white'
                  }`}
                  data-testid="button-compare-card"
                >
                  <Scale className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isInComparison ? "Remove from comparison" : "Add to comparison"}
              </TooltipContent>
            </Tooltip>
          )}
          <button 
            onClick={handleShare}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition-all text-white shadow-lg"
            title="Share property"
            data-testid="button-share-card"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button 
            onClick={handleToggleFavorite}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition-all text-white shadow-lg"
            title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
          >
            {isFavorited(property.id) ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Amenities Row - Bottom Center */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 px-2">
            {property.amenities.slice(0, 4).map((amenity, idx) => {
              const getAmenityIcon = (name: string) => {
                const lower = name.toLowerCase();
                if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="h-3 w-3" />;
                if (lower.includes('pool')) return <Coffee className="h-3 w-3" />;
                if (lower.includes('gym') || lower.includes('fitness')) return <Zap className="h-3 w-3" />;
                return <CheckCircle className="h-3 w-3" />;
              };
              return (
                <Badge key={idx} className="bg-white/80 dark:bg-slate-800/80 text-xs backdrop-blur-sm shadow-md text-foreground font-medium">
                  {getAmenityIcon(amenity)}
                  <span className="hidden sm:inline ml-1">{amenity}</span>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Rating Badge - Bottom Left */}
        {averageRating && (
          <div className="absolute bottom-3 left-3 bg-black/80 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold backdrop-blur-sm shadow-lg">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {averageRating.toFixed(1)}
            {property.reviews?.length && (
              <span className="text-gray-300 ml-1">({property.reviews.length})</span>
            )}
          </div>
        )}

        {/* Lease Term Badge - Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-black/80 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-medium backdrop-blur-sm shadow-lg">
          <Calendar className="h-3 w-3" />
          {leaseInfo}
        </div>
      </div>

      <CardContent className="p-4 pb-2">
        {/* Price Line - Premium Display */}
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-bold text-primary">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
          <span className="text-muted-foreground text-sm font-medium">/month</span>
        </div>

        {/* Stats Line */}
        <div className="flex items-center gap-3 text-sm mb-3 font-medium">
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
        <div className="text-sm text-muted-foreground truncate mb-3" data-testid="text-property-address">
          {property.address}, {property.city || 'N/A'}, {property.state || ''}
        </div>

        {/* Owner/Agent Info Card */}
        <div className="flex items-center gap-2 mb-3 p-2.5 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/10">
          <Avatar className="h-8 w-8 ring-2 ring-secondary/30">
            {ownerImage ? (
              <AvatarImage src={ownerImage} alt={ownerName} />
            ) : null}
            <AvatarFallback className="text-xs bg-secondary/20 text-secondary font-bold">
              {ownerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">
              {ownerName}
            </p>
            <p className="text-xs text-muted-foreground">Verified Host</p>
          </div>
          {averageRating && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold">{averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Quick Apply CTA Button */}
        <Link href={`/property/${property.id}`}>
          <Button 
            className="w-full bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary/80 text-primary-foreground font-bold gap-2 group transition-all duration-300"
            data-testid="button-view-property"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
