import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Property, Review, Owner } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { PropertyManagement } from "@/components/property-management";
import { AddressVerification } from "@/components/address-verification";
import { 
  Share2, Heart, Mail, Phone, Star, MapPin, Bed, Bath, Maximize, 
  Calendar, Home, PawPrint, Sofa, ChevronDown, ChevronUp, X,
  ChevronLeft, ChevronRight, Grid3X3, Building2, Settings, ImageIcon, DollarSign,
  PhoneCall, MessageCircle, Shield, CheckCircle2, Clock, Eye, Video, Users, AlertCircle,
  ZoomIn
} from "lucide-react";
import { CredibilityBar } from "@/components/trust-badges";
import { useFavorites } from "@/hooks/use-favorites";
import { CostCalculator } from "@/components/cost-calculator";
import { EnhancedTrustBadges, TrustBadgeInline } from "@/components/enhanced-trust-badges";
import { StickyActionBar } from "@/components/sticky-action-bar";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";
import { AmenitiesGrid } from "@/components/amenities-grid";
import { InteractiveMap } from "@/components/interactive-map";
import { NearbyPlaces } from "@/components/nearby-places";
import NotFound from "@/pages/not-found";
import { AgentContactDialog } from "@/components/agent-contact-dialog";
import { useEffect } from "react";
import { updateMetaTags, getPropertyStructuredData, addStructuredData, removeStructuredData } from "@/lib/seo";
import { PropertyDetailsSkeleton } from "@/components/property-details-skeleton";

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

// Room labels for better navigation
const getRoomLabel = (index: number, category?: string): string => {
  const roomLabels: Record<string, string> = {
    exterior: "Exterior",
    living: "Living Room",
    kitchen: "Kitchen",
    bedroom: "Bedroom",
    bathroom: "Bathroom",
    "master-bedroom": "Master Bedroom",
    dining: "Dining",
    office: "Office",
    laundry: "Laundry Room",
  };
  
  if (category && roomLabels[category.toLowerCase()]) {
    return roomLabels[category.toLowerCase()];
  }
  
  // Fallback to generic labels based on position
  const genericLabels = ["Exterior", "Living Room", "Kitchen", "Master Bedroom", "Bedroom", "Bathroom", "Laundry", "Dining", "Office"];
  return genericLabels[index % genericLabels.length];
};

export default function PropertyDetails() {
  const [match, params] = useRoute("/property/:id");
  const id = params?.id;
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    facts: true,
    amenities: false,
    location: false,
    management: false,
  });

  const { data: propertyData, isLoading } = useQuery<{ property: Property; owner: Owner | null }>({
    queryKey: ['/api/v2/properties', id],
    enabled: !!id && !!match,
    queryFn: async () => {
      const res = await fetch(`/api/v2/properties/${id}`);
      const json = await res.json();
      const propertyInfo = json?.data || json;
      return {
        property: propertyInfo,
        owner: propertyInfo?.owner || null
      };
    },
  });

  const property = propertyData?.property;
  const owner = propertyData?.owner;

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['/api/v2/reviews/property', id],
    enabled: !!id,
    select: (res: any) => res?.data ?? [],
  });

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

  const { data: photosData } = useQuery<PropertyPhoto[]>({
    queryKey: ['/api/v2/images/property', id],
    enabled: !!id,
    select: (res: any) => res?.data ?? [],
  });

  const lat = property?.latitude ? parseFloat(String(property.latitude)) : 34.0522;
  const lng = property?.longitude ? parseFloat(String(property.longitude)) : -118.2437;
  const nearbyPlaces = useNearbyPlaces(lat, lng);

  const bedrooms = property?.bedrooms || 0;
  const bathrooms = property ? Math.round(parseDecimal(property.bathrooms)) : 0;
  const sqft = property?.square_feet || 0;
  
  useEffect(() => {
    if (property) {
      updateMetaTags({
        title: `${property.title} - ${bedrooms}bd, ${bathrooms}ba in ${property.city}`,
        description: `${property.title} - ${formatPrice(property.price)}/month. ${bedrooms} bedrooms, ${bathrooms} bathrooms, ${sqft} sqft.`,
        image: "https://choiceproperties.com/og-image.png",
        url: `https://choiceproperties.com/property/${property.id}`,
        type: "property"
      });
      addStructuredData(getPropertyStructuredData(property), 'property');
    }
    return () => { removeStructuredData('property'); };
  }, [property, bedrooms, bathrooms, sqft]);

  // Calculate images early so we can use them in the keyboard navigation hook
  const allImages = property && photosData && photosData.length > 0
    ? photosData.map(photo => photo.imageUrls.gallery)
    : property && (property.images || []).length > 0 
      ? property.images!.map(img => imageMap[img] || img)
      : [placeholderExterior, placeholderLiving, placeholderKitchen, placeholderBedroom];

  // Keyboard navigation and touch swipe support - must be before conditional returns
  useEffect(() => {
    if (!showFullGallery) return;

    let touchStartX = 0;
    let touchEndX = 0;
    const imageCount = allImages.length;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFullGallery(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev + 1) % imageCount);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          setCurrentImageIndex((prev) => (prev + 1) % imageCount);
        } else {
          setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.overflow = 'unset';
    };
  }, [showFullGallery, allImages.length]);

  // All hooks called above - now safe to have conditional returns
  if (!match) {
    return <NotFound />;
  }

  if (isLoading || !property) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 animate-in fade-in duration-500">
          <PropertyDetailsSkeleton />
        </div>
        <Footer />
      </div>
    );
  }


  // Use low-resolution thumbnails for the thumbnail strip
  const allThumbnails = photosData && photosData.length > 0
    ? photosData.map(photo => photo.imageUrls.thumbnail)
    : allImages;
  
  const position: [number, number] = [lat, lng];

  const averageRating = reviews && reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  
  // Get room label for current image
  const currentRoomLabel = photosData?.[currentImageIndex]?.category 
    ? getRoomLabel(currentImageIndex, photosData[currentImageIndex]?.category)
    : getRoomLabel(currentImageIndex);

  // Preload adjacent images when modal is open
  const getPrevImageIndex = () => (currentImageIndex - 1 + allImages.length) % allImages.length;
  const getNextImageIndex = () => (currentImageIndex + 1) % allImages.length;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Navbar />

      {/* Image Preload Links - Hidden, improves navigation performance */}
      {showFullGallery && (
        <>
          <link rel="preload" as="image" href={allImages[getNextImageIndex()]} />
          <link rel="preload" as="image" href={allImages[getPrevImageIndex()]} />
        </>
      )}

      {/* Fullscreen Gallery Modal */}
      {showFullGallery && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo gallery for ${property.title}`}
          data-testid="gallery-modal"
        >
          <div className="flex justify-between items-center p-4 border-b border-white/20 bg-gradient-to-b from-black/80 to-black/40">
            <div className="flex flex-col gap-1">
              <span className="text-white text-sm font-medium text-gray-300">
                {currentRoomLabel}
              </span>
              <span className="text-white text-lg font-bold">
                {currentImageIndex + 1} of {allImages.length}
              </span>
              <span className="text-white text-xs text-gray-400 hidden md:block">
                Press ← → or ESC to close
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowFullGallery(false)}
              data-testid="button-close-gallery"
              aria-label="Close gallery"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center relative group">
            {/* Left Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/30 h-14 w-14 transition-all hover:scale-110 hidden md:flex"
              onClick={prevImage}
              data-testid="button-prev-image"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-10 w-10" />
            </Button>
            
            {/* Main Image */}
            <img
              key={currentImageIndex}
              src={allImages[currentImageIndex]}
              alt={`${property.title} - Photo ${currentImageIndex + 1}`}
              className="max-h-[80vh] max-w-[90vw] object-contain animate-in fade-in duration-300"
            />
            
            {/* Right Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/30 h-14 w-14 transition-all hover:scale-110 hidden md:flex"
              onClick={nextImage}
              data-testid="button-next-image"
              aria-label="Next image"
            >
              <ChevronRight className="h-10 w-10" />
            </Button>
            
            {/* Mobile Swipe Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:hidden">
              <span className="text-white text-xs bg-black/60 px-3 py-2 rounded-full">
                Swipe to navigate
              </span>
            </div>
          </div>
          
          {/* Enhanced Thumbnail Bar */}
          <div className="bg-gradient-to-t from-black/80 to-black/40 p-4">
            <div className="flex gap-3 overflow-x-auto justify-center pb-2">
              {allThumbnails.map((thumbnailUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden transition-all cursor-pointer transform relative ${
                    idx === currentImageIndex 
                      ? "ring-2 ring-white scale-100 opacity-100" 
                      : "opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                  data-testid={`thumbnail-${idx}`}
                  aria-label={`View photo ${idx + 1}`}
                  aria-current={idx === currentImageIndex ? "true" : "false"}
                >
                  <img src={thumbnailUrl} alt={`Thumbnail ${idx + 1}`} className="w-24 h-16 object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium Hero Gallery with Gradient Overlay */}
      <div className="w-full bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Gallery Grid */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-1 h-[500px] cursor-pointer" onClick={() => setShowFullGallery(true)}>
            <div className="col-span-2 row-span-2 relative group overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 rounded-tl-3xl">
              <img
                src={allImages[0]}
                alt={property.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                data-testid="hero-image-primary"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-black/20 group-hover:from-black/50 transition-all duration-300" />
              {/* Price Badge on Primary Image */}
              <div className="absolute bottom-4 left-4 bg-gradient-to-r from-primary to-primary/80 text-white px-6 py-3 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
                  <span className="text-sm font-semibold opacity-90">/month</span>
                </div>
              </div>
              {/* Status Badge */}
              <Badge className="absolute top-4 left-4 bg-green-500 hover:bg-green-600 text-white border-0 font-bold text-xs uppercase tracking-wider px-3 py-1.5">
                Available Now
              </Badge>
              {allImages.length > 0 && (
                <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm backdrop-blur-sm">
                  <ZoomIn className="h-4 w-4" />
                  {allImages.length} photos
                </div>
              )}
            </div>
            
            {/* Secondary Images with Enhanced Styling */}
            {allImages.slice(1, 5).map((img, idx) => (
              <div key={idx} className={`relative group overflow-hidden bg-gray-200 dark:bg-gray-800 ${idx === 0 ? 'rounded-tr-3xl' : idx === 3 ? 'rounded-br-3xl' : ''}`}>
                <img
                  src={img}
                  alt={`${property.title} - ${idx + 2}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                {idx === 3 && allImages.length > 5 && (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-white font-black text-3xl">+{allImages.length - 5}</span>
                      <p className="text-white text-sm font-semibold mt-1">more photos</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* View All Button */}
            <button
              className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-sm hover:shadow-3xl hover:scale-105 transition-all duration-300 text-gray-900 dark:text-white"
              onClick={(e) => { e.stopPropagation(); setShowFullGallery(true); }}
              data-testid="button-view-all-photos"
            >
              <Grid3X3 className="h-5 w-5" />
              View all photos
            </button>
          </div>

          {/* Mobile Gallery */}
          <div className="md:hidden relative h-80 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 cursor-pointer" onClick={() => setShowFullGallery(true)}>
            <img
              src={allImages[currentImageIndex]}
              alt={property.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              data-testid="hero-image-mobile"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Mobile Price Badge */}
            <div className="absolute bottom-12 left-4 right-4 bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-3 rounded-2xl shadow-lg">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
                <span className="text-xs font-semibold opacity-90">/month</span>
              </div>
            </div>
            
            <Badge className="absolute top-4 left-4 bg-green-500 hover:bg-green-600 text-white border-0 font-bold text-xs uppercase tracking-wider">
              Available
            </Badge>
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-2xl flex items-center gap-1.5 font-bold text-xs">
              <ZoomIn className="h-3 w-3" />
              {allImages.length}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <span className="bg-black/70 text-white px-3 py-1 rounded-xl text-xs font-bold">
                {currentImageIndex + 1}/{allImages.length}
              </span>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="bg-black/70 text-white h-8 w-8 hover:bg-black/90" onClick={(e) => { e.stopPropagation(); prevImage(); }} data-testid="button-mobile-prev">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="ghost" className="bg-black/70 text-white h-8 w-8 hover:bg-black/90" onClick={(e) => { e.stopPropagation(); nextImage(); }} data-testid="button-mobile-next">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Facts Row - Horizontal Scroll on Mobile */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="overflow-x-auto md:overflow-visible -mx-4 md:mx-0">
            <div className="flex gap-4 md:gap-6 px-4 md:px-0 py-4 min-w-max md:min-w-0 md:grid md:grid-cols-4">
              {/* Bedrooms */}
              <div className="flex items-center gap-3 flex-shrink-0 md:flex-shrink">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                  <Bed className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Bedrooms</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{bedrooms}</p>
                </div>
              </div>
              
              {/* Bathrooms */}
              <div className="flex items-center gap-3 flex-shrink-0 md:flex-shrink">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
                  <Bath className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Bathrooms</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{bathrooms}</p>
                </div>
              </div>
              
              {/* Square Feet */}
              <div className="flex items-center gap-3 flex-shrink-0 md:flex-shrink">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
                  <Maximize className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Square Feet</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sqft.toLocaleString()}</p>
                </div>
              </div>
              
              {/* Property Type */}
              <div className="flex items-center gap-3 flex-shrink-0 md:flex-shrink">
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-xl">
                  <Home className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">Type</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{property.property_type || 'Home'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Unified Property Header Card */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-5">
                {/* Compelling Headline */}
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight" data-testid="property-headline">
                    {property.title || `Spacious ${bedrooms}-Bedroom ${property.property_type || 'Home'}`}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-base font-medium">{property.address}, {property.city}, {property.state} {property.zip_code}</span>
                  </div>
                </div>

                {/* Rating & Response Stats */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`h-4 w-4 ${i <= Math.round(averageRating || 4.8) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{(averageRating || 4.8).toFixed(1)}</span>
                    <span className="text-gray-500 dark:text-gray-400">({reviews?.length || 0})</span>
                  </div>
                  <Separator orientation="vertical" className="h-5" />
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Responds within 2 hours</span>
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Premium Features Tags */}
                <div className="flex flex-wrap gap-2">
                  {property.furnished && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">
                      <Sofa className="h-3 w-3 mr-1" />
                      Furnished
                    </Badge>
                  )}
                  {property.pets_allowed && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-0">
                      <PawPrint className="h-3 w-3 mr-1" />
                      Pets Allowed
                    </Badge>
                  )}
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 font-bold">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>

                {/* Action Buttons - Desktop */}
                <div className="hidden md:flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    onClick={() => toggleFavorite(property.id)}
                    variant={isFavorited(property.id) ? "default" : "outline"}
                    className="flex items-center gap-2"
                    data-testid="button-save"
                  >
                    <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
                    {isFavorited(property.id) ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    onClick={() => navigator.share?.({ title: property.title, url: window.location.href })}
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="button-share"
                  >
                    <Share2 className="h-5 w-5" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Overview Section */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <button
                  onClick={() => toggleSection('overview')}
                  className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                  data-testid="section-overview-toggle"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">About This Property</h2>
                  {expandedSections.overview ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
                {expandedSections.overview && (
                  <div className="mt-4 space-y-4 pl-3 pr-3">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
                      {property.description || `Welcome to this beautiful ${bedrooms}-bedroom, ${bathrooms}-bathroom ${property.property_type || 'home'} in the heart of ${property.city}. ${property.furnished ? 'This fully furnished property is move-in ready and includes all essential furniture.' : ''} ${sqft > 2000 ? `With ${sqft.toLocaleString()} square feet of living space, there is plenty of room for comfortable living.` : ''} ${property.pets_allowed ? 'Pets are welcome in this home.' : ''}`}
                    </p>
                    {nearbyPlaces && Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 uppercase tracking-wider">Neighborhood Highlights</h3>
                        <div className="flex flex-wrap gap-2">
                          {nearbyPlaces.slice(0, 6).map((place: { name: string; distance: string }, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs font-medium">
                              {place.name} • {place.distance}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facts & Features Section with Premium Grid */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
              <button
                onClick={() => toggleSection('facts')}
                className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                data-testid="section-facts-toggle"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Facts & Features</h2>
                {expandedSections.facts ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
              </button>
              {expandedSections.facts && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Property Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Bedrooms</span>
                        <span className="font-bold text-gray-900 dark:text-white text-lg">{bedrooms}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Bathrooms</span>
                        <span className="font-bold text-gray-900 dark:text-white text-lg">{bathrooms}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Square Feet</span>
                        <span className="font-bold text-gray-900 dark:text-white text-lg">{sqft.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Furnished</span>
                        <span className="font-bold text-gray-900 dark:text-white">{property.furnished ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Rental Terms</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Property Type</span>
                        <span className="font-bold text-gray-900 dark:text-white capitalize">{property.property_type || 'Apartment'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Lease Term</span>
                        <span className="font-bold text-gray-900 dark:text-white">{property.lease_term || '12 months'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Pets Allowed</span>
                        <span className="font-bold text-gray-900 dark:text-white">{property.pets_allowed ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Available</span>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 font-bold">Now</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Amenities Section */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <button
                  onClick={() => toggleSection('amenities')}
                  className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                  data-testid="section-amenities-toggle"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Amenities</h2>
                  {expandedSections.amenities ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
                {expandedSections.amenities && (
                  <div className="mt-6">
                    <AmenitiesGrid amenities={property.amenities as string[] | undefined} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            {reviews && reviews.length > 0 && (
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reviews</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">({reviews.length})</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i <= (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{review.title || 'Review'}</p>
                        {review.comment && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Section */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <button
                  onClick={() => toggleSection('location')}
                  className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                  data-testid="section-location-toggle"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Location</h2>
                  {expandedSections.location ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
                {expandedSections.location && (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                      <InteractiveMap 
                        center={position} 
                        title={property.title} 
                        address={property.address}
                        nearbyPlaces={nearbyPlaces}
                        showControls={true}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Nearby Places</h3>
                      <NearbyPlaces places={nearbyPlaces} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Management Section - Only visible to owners/agents */}
            {user && (user.id === (property as any).owner_id || user.id === (property as any).listing_agent_id || user.role === 'admin') && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                  <AddressVerification
                    propertyId={property.id}
                    address={property.address}
                    city={property.city || ""}
                    state={property.state || ""}
                    zipCode={property.zip_code || undefined}
                    isVerified={(property as any).address_verified || false}
                    onVerified={(coords) => {
                      // Address verified, coordinates updated
                    }}
                  />
                </div>

                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <button
                      onClick={() => toggleSection('management')}
                      className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                      data-testid="section-management-toggle"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Property Management</h2>
                      </div>
                      {expandedSections.management ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    {expandedSections.management && (
                      <div className="mt-4">
                        <PropertyManagement 
                          property={property as any} 
                          onUpdate={() => {
                            // Refetch property data after updates
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Column - Premium Action Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-4">
              {/* Primary CTA Card */}
              <Card className="shadow-xl border-0 overflow-hidden bg-gradient-to-br from-primary to-primary/90 hover-elevate transition-all duration-300 rounded-2xl">
                <CardContent className="p-6 text-white space-y-5">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-90">Monthly Rent</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-black">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
                      <span className="text-base font-semibold opacity-90">/mo</span>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-2 gap-2">
                    <Badge variant="outline" className="bg-white/15 text-white border-white/30 font-bold text-xs uppercase tracking-wider py-1.5">
                      Instant Approval
                    </Badge>
                    <Badge variant="outline" className="bg-white/15 text-white border-white/30 font-bold text-xs uppercase tracking-wider py-1.5">
                      Low Deposit
                    </Badge>
                  </div>

                  {/* Primary CTA */}
                  <Link href={`/apply?propertyId=${property.id}`} className="block">
                    <Button 
                      className="w-full h-12 text-lg font-black shadow-2xl shadow-black/30 hover:scale-105 active:scale-95 transition-all rounded-xl bg-white text-primary hover:bg-white/95" 
                      size="lg" 
                      data-testid="button-apply-now"
                    >
                      Apply Now
                    </Button>
                  </Link>

                  {/* Secondary CTA */}
                  <Button 
                    variant="outline" 
                    className="w-full h-10 font-bold border-white/30 text-white hover:bg-white/10 rounded-xl"
                    data-testid="button-schedule-tour"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Tour
                  </Button>
                </CardContent>
              </Card>

              {/* Owner/Agent Card */}
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Property Manager</h3>
                  <div className="flex items-start gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20 flex-shrink-0">
                      <AvatarImage src={owner?.profile_image || undefined} alt={owner?.full_name || 'Property Manager'} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{owner?.full_name?.substring(0, 2).toUpperCase() || 'PM'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white">{owner?.full_name || 'Property Manager'}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Verified Expert</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="space-y-2">
                    {owner && (
                      <AgentContactDialog 
                        agent={{
                          id: owner.id,
                          name: owner.full_name || 'Property Manager',
                          email: owner.email,
                          phone: owner.phone || ''
                        }}
                        propertyId={property.id}
                        propertyTitle={property.title}
                        triggerText="Ask a Question"
                      />
                    )}
                    {owner?.phone && (
                      <Button 
                        variant="ghost" 
                        className="w-full gap-2 font-bold text-primary hover:bg-primary/5 justify-start" 
                        onClick={() => window.open(`tel:${owner.phone}`)}
                        data-testid="button-call-office"
                      >
                        <PhoneCall className="h-4 w-4" />
                        Call {owner.full_name?.split(' ')[0]}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Trust & Safety Card */}
              <Card className="border-2 border-dashed border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/10 rounded-2xl shadow-none hover-elevate transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg flex-shrink-0">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Choice Verified</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">This listing has been audited for fair housing compliance and price accuracy.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <StickyActionBar
        price={parseDecimal(property.price)}
        propertyId={property.id}
        propertyTitle={property.title}
        onContactClick={() => {}}
        onScheduleClick={() => {}}
        onCallClick={owner?.phone ? () => window.open(`tel:${owner.phone}`) : undefined}
        isFavorited={isFavorited(property.id)}
        onFavoriteClick={() => toggleFavorite(property.id)}
        agentPhone={owner?.phone || undefined}
      />

      {/* Credibility Bar */}
      <div className="mt-12">
        <CredibilityBar />
      </div>

      <div className="pb-20 md:pb-0">
        <Footer />
      </div>
    </div>
  );
}
