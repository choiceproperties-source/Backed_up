import { useState, useEffect, memo } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bed, Bath, Maximize, Heart, Share2, Image as ImageIcon, Star, Calendar, CheckCircle, Plus, Minus, Scale, PawPrint, Zap, Home, ArrowRight, Wifi, Coffee } from "lucide-react";
import type { Property, PropertyWithOwner, PropertyPhoto } from "@/lib/types";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/lib/auth-context";
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

interface EnhancedPropertyCardProps {
  property: PropertyWithOwner;
  onQuickView?: (property: Property) => void;
  onCompare?: (property: Property) => void;
  isInComparison?: boolean;
  showCompareButton?: boolean;
}

export const EnhancedPropertyCard = memo(function EnhancedPropertyCard({ 
  property, 
  onQuickView, 
  onCompare,
  isInComparison = false,
  showCompareButton = true 
}: EnhancedPropertyCardProps) {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const photos = property.propertyPhotos || [];
  const photoCount = photos.length;
  const primaryPhoto = photos[0] || null;
  const fallbackImage = property.images?.[0] ? (imageMap[property.images[0]] || property.images[0]) : placeholderExterior;
  
  // Interactive mini-gallery logic
  const displayImage = photos.length > 0 && isHovered 
    ? photos[currentImageIndex]?.imageUrls.thumbnail || fallbackImage
    : primaryPhoto?.imageUrls.thumbnail || fallbackImage;

  const { toggleFavorite: toggleFav, isFavorited } = useFavorites();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHovered && photos.length > 1) {
      interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % Math.min(photos.length, 5));
      }, 1200);
    } else {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, photos.length]);

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

  // Determine availability status
  const isOwner = user && (property.owner_id === user.id);
  const isOffMarket = (property.status === 'off_market' || property.listing_status === 'off_market') && !isOwner;

  // Get owner/agent info
  const ownerName = property.owner?.full_name || "Property Owner";
  const ownerImage = property.owner?.profile_image;
  const ownerInitials = ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const displayOwnerName = isOwner ? (user?.full_name || ownerName) : ownerName;
  const displayOwnerImage = isOwner ? (user?.profile_image || ownerImage) : ownerImage;
  const displayOwnerInitials = isOwner ? (user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || ownerInitials) : ownerInitials;
  
  const availableFromDate = property.available_from ? new Date(property.available_from) : null;
  const isFutureAvailable = !isOffMarket && availableFromDate && availableFromDate > new Date();
  const isComingSoon = !isOffMarket && isFutureAvailable;
  
  const isAvailable = !isOffMarket && !isComingSoon && (property.status === 'active' || property.status === 'available');
  const leaseInfo = property.lease_term || "12 months";
  
  let availabilityText = 'Available Now';
  let availabilitySubtext = '';
  
  if (isOffMarket) {
    availabilityText = 'Off Market';
    availabilitySubtext = 'This property is not currently available';
  } else if (isComingSoon && availableFromDate) {
    availabilityText = 'Coming Soon';
    availabilitySubtext = `Available from ${availableFromDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  return (
    <Link href={isOffMarket ? "#" : `/property/${property.id}`} onClick={e => isOffMarket && e.preventDefault()}>
      <Card 
        className={`overflow-hidden group cursor-pointer transition-all duration-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-3 dark:hover:shadow-black/60 border border-white/5 hover:border-white/20 bg-card/40 backdrop-blur-xl relative flex flex-col h-full ${isOffMarket ? 'opacity-75 grayscale-[0.3] cursor-not-allowed hover:shadow-none hover:-translate-y-0' : ''}`}
        onMouseEnter={() => !isOffMarket && setIsHovered(true)}
        onMouseLeave={() => !isOffMarket && setIsHovered(false)}
        onKeyDown={(e) => {
          if (!isOffMarket && (e.key === 'Enter' || e.key === ' ')) {
            // Navigation handled by Link
          }
        }}
        data-testid={`card-property-${property.id}`}
        tabIndex={isOffMarket ? -1 : 0}
      >
        {/* Visual Glint Effect */}
        {!isOffMarket && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500 pointer-events-none z-20" />
        )}

        {/* Image Section - Strict 16:9 ratio */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={`${property.title} - ${property.property_type || 'Property'}`}
            loading="lazy"
            decoding="async"
            className={`object-cover w-full h-full ${!isOffMarket ? 'group-hover:scale-105 transition-all duration-700 ease-in-out' : ''}`}
            data-testid="img-property-preview"
          />
          
          {/* Interactive Gallery Progress Dots */}
          {!isOffMarket && isHovered && photos.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 animate-in fade-in slide-in-from-bottom-3 duration-700">
              {photos.slice(0, 5).map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-500 shadow-xl ${i === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
          
          {/* Gradient Overlay for better badge readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 max-w-[70%] z-10">
            <div className="flex flex-wrap gap-2">
              <Badge className={`${isOffMarket ? 'bg-zinc-800 text-white border-zinc-700' : isComingSoon ? 'bg-amber-500/90' : 'bg-primary/90'} backdrop-blur-md text-primary-foreground font-black text-[10px] uppercase tracking-widest border-none shadow-2xl px-3 py-1.5`}>
                {availabilityText}
              </Badge>
              {property.application_fee && !isOffMarket && (
                <Badge className="bg-emerald-500/90 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest border-none shadow-2xl px-3 py-1.5">
                  Fee: ${parseFloat(property.application_fee).toFixed(0)}
                </Badge>
              )}
              {!isOffMarket && (
                <Badge className="bg-white/10 backdrop-blur-md dark:bg-card/20 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white/20 px-3 py-1.5">
                  {property.property_type || 'Property'}
                </Badge>
              )}
              {!isOffMarket && photoCount > 1 && (
                <Badge className="bg-black/40 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-2xl border border-white/10 px-3 py-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {photoCount}
                </Badge>
              )}
            </div>
            {availabilitySubtext && (
              <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded w-fit">
                {availabilitySubtext}
              </p>
            )}
          </div>
          
          {/* Features Badges - Top Right */}
          {!isOffMarket && (
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 transition-all duration-500" style={{
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateY(0)' : 'translateY(-10px)'
            }}>
              {property.pets_allowed && (
                <Badge className="bg-purple-500/80 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-2xl border border-white/10 px-3 py-1.5">
                  <PawPrint className="h-3.5 w-3.5" />
                  Pets
                </Badge>
              )}
              {(property.utilities_included && property.utilities_included.length > 0) && (
                <Badge className="bg-amber-500/80 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-2xl border border-white/10 px-3 py-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Bills Incl.
                </Badge>
              )}
            </div>
          )}

          {/* Owner Info - Floating Avatar with Listed By info */}
          <div className="absolute bottom-3 right-3 z-20">
            <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 group-hover:border-primary/30 transition-all duration-500">
              <Avatar className="h-10 w-10 border-2 border-white/20 shadow-lg group-hover:border-primary/50 transition-colors duration-500">
                <AvatarImage src={displayOwnerImage || undefined} alt={displayOwnerName} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {displayOwnerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none mb-1">Listed By</p>
                <p className="text-sm font-bold text-white leading-none tracking-tight group-hover:text-primary transition-colors duration-500">
                  {displayOwnerName}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!isOffMarket && !isComingSoon && (
            <div className="absolute top-3 right-3 flex gap-2 z-20" onClick={(e) => e.stopPropagation()}>
              {showCompareButton && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={handleCompare}
                      className={`p-2 rounded-full backdrop-blur-md transition-all shadow-2xl border border-white/20 ${
                        isInComparison 
                          ? 'bg-primary text-white scale-110' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      data-testid="button-compare-card"
                    >
                      <Scale className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/90 text-white border-none font-bold">
                    {isInComparison ? "Remove Comparison" : "Add to Compare"}
                  </TooltipContent>
                </Tooltip>
              )}
              <button 
                onClick={handleShare}
                className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl"
                title="Share property"
                data-testid="button-share-card"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button 
                onClick={handleToggleFavorite}
                className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-90 transition-all text-white border border-white/20 shadow-2xl"
                title={isFavorited(property.id) ? "Remove from favorites" : "Add to favorites"}
                data-testid={isFavorited(property.id) ? "button-unsave-card" : "button-save-card"}
              >
                <Heart className={`h-4 w-4 transition-all duration-300 ${isFavorited(property.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>
          )}

          {/* Price Line - Bottom Left Over Image */}
          {!isOffMarket && (
            <div className={`absolute bottom-3 left-3 flex items-baseline gap-1.5 text-white z-10 [text-shadow:_0_2px_8px_rgba(0,0,0,0.8)] ${isComingSoon ? 'opacity-80 scale-95 origin-bottom-left' : ''}`}>
              <span className="text-3xl font-black tracking-tighter">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
              <span className="text-white/80 text-[11px] font-black uppercase tracking-widest">/mo</span>
            </div>
          )}
        </div>

        <CardContent className="p-6 flex flex-col flex-1 gap-4">
          {/* Title & Type */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">{property.city}, {property.state}</p>
            <h3 className="text-lg font-bold text-foreground truncate leading-tight" title={property.title}>
              {property.title}
            </h3>
            {property.application_fee && !isOffMarket && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                App Fee: ${parseFloat(property.application_fee).toFixed(0)}
              </p>
            )}
          </div>

          {/* Quick Stats Grid - Single Row */}
          {!isOffMarket && (
            <div className="flex items-center gap-6 py-3 border-y border-border/40">
              <div className="flex items-center gap-2" title="Bedrooms">
                <Bed className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-base font-black">{property.bedrooms || 0}</span>
              </div>
              <div className="flex items-center gap-2 border-x border-border/50 px-6" title="Bathrooms">
                <Bath className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-base font-black">{property.bathrooms || 0}</span>
              </div>
              <div className="flex items-center gap-2" title="Square Feet">
                <Maximize className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="text-base font-black">
                  {property.square_feet ? Math.round(property.square_feet).toLocaleString() : '0'} 
                  <span className="text-[10px] text-muted-foreground uppercase font-black ml-1">sf</span>
                </span>
              </div>
            </div>
          )}

          {/* Location & Rating */}
          <div className="flex items-start justify-between gap-4 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Home className="h-3 w-3 shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest">Location</p>
              </div>
              <p className="text-sm font-medium text-muted-foreground truncate capitalize">
                {property.address.toLowerCase()}, {property.city?.toLowerCase() || 'N/A'}
              </p>
            </div>
            {averageRating && !isOffMarket && (
              <div className="bg-secondary/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
                <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                <span className="text-xs font-black">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          {!isOffMarket && !isComingSoon ? (
            <Button 
              className="w-full h-12 bg-secondary hover:bg-secondary/90 text-primary-foreground font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl hover-elevate active-elevate-2 transition-all group/btn"
              data-testid="button-view-property"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView?.(property);
              }}
            >
              View Details
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          ) : isComingSoon ? (
            <Button 
              className="w-full h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-all"
              data-testid="button-view-property-coming-soon"
              onClick={(e) => {
                // View details is allowed for Coming Soon
              }}
            >
              View Details
            </Button>
          ) : (
            <Button 
              disabled
              className="w-full h-12 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl cursor-not-allowed"
            >
              Currently Unavailable
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});
