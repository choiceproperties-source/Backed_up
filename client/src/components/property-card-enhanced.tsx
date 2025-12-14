import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bed, Bath, Maximize, Heart, Share2, Image as ImageIcon, Star, Calendar, CheckCircle, Plus, Minus, Scale } from "lucide-react";
import type { Property, PropertyWithOwner } from "@/lib/types";
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
  const [isFavorited, setIsFavorited] = useState(false);
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

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem("choiceProperties_favorites") || "[]") as string[];
    setIsFavorited(favorites.includes(property.id));
  }, [property.id]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const favorites = JSON.parse(localStorage.getItem("choiceProperties_favorites") || "[]") as string[];
    
    if (isFavorited) {
      const updated = favorites.filter(id => id !== property.id);
      localStorage.setItem("choiceProperties_favorites", JSON.stringify(updated));
      toast.success("Removed from favorites");
    } else {
      favorites.push(property.id);
      localStorage.setItem("choiceProperties_favorites", JSON.stringify(favorites));
      toast.success("Added to favorites");
    }
    
    setIsFavorited(!isFavorited);
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
        
        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[70%]">
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
            <Badge className="bg-green-500/90 text-white font-bold text-xs flex items-center gap-1 shadow-md">
              <CheckCircle className="h-3 w-3" />
              Available
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
            onClick={toggleFavorite}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition-all text-white shadow-lg"
            title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            data-testid={isFavorited ? "button-unsave-card" : "button-save-card"}
          >
            {isFavorited ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Rating Badge - Bottom Left */}
        {averageRating && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {averageRating.toFixed(1)}
            {property.reviews?.length && (
              <span className="text-gray-300 ml-1">({property.reviews.length})</span>
            )}
          </div>
        )}

        {/* Lease Term Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-medium">
          <Calendar className="h-3 w-3" />
          {leaseInfo}
        </div>
      </div>

      <CardContent className="p-4 pb-3">
        {/* Price Line */}
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-bold">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
          <span className="text-muted-foreground text-sm">/mo</span>
        </div>

        {/* Stats Line */}
        <div className="flex items-center gap-3 text-sm mb-2 font-medium">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4 text-primary" />
            <span className="font-bold">{property.bedrooms || 0}</span>
            <span className="font-normal text-muted-foreground">bds</span>
          </div>
          <div className="w-px h-3 bg-border"></div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4 text-primary" />
            <span className="font-bold">{property.bathrooms || 0}</span>
            <span className="font-normal text-muted-foreground">ba</span>
          </div>
          <div className="w-px h-3 bg-border"></div>
          <div className="flex items-center gap-1">
            <Maximize className="h-4 w-4 text-primary" />
            <span className="font-bold">{property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}</span>
            <span className="font-normal text-muted-foreground">sqft</span>
          </div>
        </div>

        {/* Address */}
        <div className="text-sm text-muted-foreground truncate mb-3" data-testid="text-property-address">
          {property.address}, {property.city || 'N/A'}, {property.state || ''}
        </div>

        {/* Owner/Agent Info */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Avatar className="h-7 w-7">
            {ownerImage ? (
              <AvatarImage src={ownerImage} alt={ownerName} />
            ) : null}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {ownerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {ownerName}
            </p>
            <p className="text-xs text-muted-foreground">Property Manager</p>
          </div>
          {property.owner?.phone && (
            <a 
              href={`tel:${property.owner.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline"
            >
              Contact
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
