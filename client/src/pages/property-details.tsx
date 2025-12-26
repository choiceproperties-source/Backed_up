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
  ChevronLeft, ChevronRight, Grid3X3, Building2, Settings, Image as ImageIcon, DollarSign,
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

      {/* Hero Gallery - Matching Property Card Design */}
      <div className="w-full bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Gallery - 16:9 with gradient overlay matching card */}
          <div className="hidden md:block aspect-video relative overflow-hidden bg-muted cursor-pointer group" onClick={() => setShowFullGallery(true)}>
            <img
              src={allImages[0]}
              alt={property.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-in-out"
              data-testid="hero-image-primary"
            />
            
            {/* Dark Wash Gradient - Matches Property Card */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
            
            {/* Status & Image Count Badges - Matching Card Style */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
              <Badge className="bg-primary/90 backdrop-blur-md text-primary-foreground font-black text-[10px] uppercase tracking-widest border-none shadow-lg px-2 py-1" data-testid="badge-status">
                Available
              </Badge>
              {allImages.length > 1 && (
                <Badge className="bg-black/40 backdrop-blur-md text-white font-bold text-[10px] shadow-lg border border-white/10 px-2 py-1 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {allImages.length}
                </Badge>
              )}
            </div>

            {/* Price Overlay - Matching Card Style */}
            <div className="absolute bottom-6 left-6 text-white z-10">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tighter">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">/mo</span>
              </div>
            </div>

            {/* View All Photos Button */}
            <button
              className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-bold text-sm hover:shadow-xl hover:scale-105 transition-all duration-300 text-gray-900 dark:text-white"
              onClick={(e) => { e.stopPropagation(); setShowFullGallery(true); }}
              data-testid="button-view-all-photos"
            >
              <Grid3X3 className="h-4 w-4" />
              View all
            </button>
          </div>

          {/* Mobile Gallery - 16:9 aspect ratio */}
          <div className="md:hidden aspect-video relative overflow-hidden bg-muted cursor-pointer" onClick={() => setShowFullGallery(true)}>
            <img
              src={allImages[currentImageIndex]}
              alt={property.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              data-testid="hero-image-mobile"
            />
            
            {/* Dark Wash Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
            
            {/* Mobile Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
              <Badge className="bg-primary/90 backdrop-blur-md text-primary-foreground font-black text-[10px] uppercase tracking-widest border-none shadow-lg px-2 py-1">
                Available
              </Badge>
              {allImages.length > 1 && (
                <Badge className="bg-black/40 backdrop-blur-md text-white font-bold text-[10px] shadow-lg border border-white/10 px-2 py-1 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {allImages.length}
                </Badge>
              )}
            </div>

            {/* Mobile Price */}
            <div className="absolute bottom-12 left-4 text-white z-10">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tighter">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">/mo</span>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20">
              <span className="bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded text-xs font-bold border border-white/10">
                {currentImageIndex + 1}/{allImages.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10 transition-all"
                  data-testid="button-mobile-prev"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10 transition-all"
                  data-testid="button-mobile-next"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Facts Row - Icon-Based */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="overflow-x-auto md:overflow-visible -mx-4 md:mx-0">
            <div className="flex gap-4 md:gap-6 px-4 md:px-0 py-4 min-w-max md:min-w-0 md:grid md:grid-cols-4">
              {/* Bedrooms */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-lg">
                  <Bed className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Bed</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{bedrooms}</p>
                </div>
              </div>
              
              {/* Bathrooms */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-lg">
                  <Bath className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Bath</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{bathrooms}</p>
                </div>
              </div>
              
              {/* Square Feet */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-lg">
                  <Maximize className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Sqft</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{sqft > 0 ? sqft.toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              
              {/* Property Type */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg">
                  <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Type</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white capitalize">{property.property_type || 'Home'}</p>
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
            {/* Header Card - Matching Card Typography */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                {/* Title & Location - Matching Card Style */}
                <div className="space-y-2">
                  <h1 className="text-base font-bold text-foreground line-clamp-2" data-testid="property-headline">
                    {property.title}
                  </h1>
                  <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{property.address}, {property.city}</span>
                  </div>
                </div>

                {/* Rating & Features */}
                <div className="flex flex-wrap items-center gap-3 text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(averageRating || 4.8) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                    ))}
                    <span className="font-bold text-gray-900 dark:text-white">{(averageRating || 4.8).toFixed(1)}</span>
                    <span className="text-gray-500 dark:text-gray-400">({reviews?.length || 0})</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  {property.furnished && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0 text-xs font-bold">
                      <Sofa className="h-3 w-3 mr-1" />
                      Furnished
                    </Badge>
                  )}
                  {property.pets_allowed && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-0 text-xs font-bold">
                      <PawPrint className="h-3 w-3 mr-1" />
                      Pets
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <button
                  onClick={() => toggleSection('overview')}
                  className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                  data-testid="section-overview-toggle"
                >
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">About</h2>
                  {expandedSections.overview ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
                {expandedSections.overview && (
                  <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
                    <p>
                      {property.description || `${bedrooms}BR, ${bathrooms}BA ${property.property_type || 'home'} in ${property.city}. ${sqft > 0 ? `${sqft.toLocaleString()} sqft.` : ''} ${property.furnished ? 'Furnished.' : ''} ${property.pets_allowed ? 'Pets welcome.' : ''}`}
                    </p>
                    {nearbyPlaces && Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0 && (
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-gray-900 dark:text-white text-xs mb-2 uppercase tracking-wider">Nearby</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {nearbyPlaces.slice(0, 5).map((place: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs font-medium">
                              {place.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details Grid */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Details</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Bedrooms</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{bedrooms}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Bathrooms</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{bathrooms}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Type</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1 capitalize">{property.property_type || 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Furnished</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{property.furnished ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <button
                  onClick={() => toggleSection('amenities')}
                  className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                  data-testid="section-amenities-toggle"
                >
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Amenities</h2>
                  {expandedSections.amenities ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
                {expandedSections.amenities && (
                  <div className="mt-4">
                    <AmenitiesGrid amenities={property.amenities as string[] | undefined} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Reviews</h2>
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex gap-0.5 mb-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} className={`h-3 w-3 ${i <= (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{review.title || 'Review'}</p>
                        {review.comment && <p className="text-gray-600 dark:text-gray-400 mt-1">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <button
                  onClick={() => toggleSection('location')}
                  className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                  data-testid="section-location-toggle"
                >
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Location</h2>
                  {expandedSections.location ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                </button>
                {expandedSections.location && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 h-64">
                      <InteractiveMap 
                        center={position} 
                        title={property.title} 
                        address={property.address}
                        nearbyPlaces={nearbyPlaces}
                        showControls={true}
                      />
                    </div>
                    {nearbyPlaces && Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0 && (
                      <NearbyPlaces places={nearbyPlaces} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Management */}
            {user && (user.id === (property as any).owner_id || user.id === (property as any).listing_agent_id || user.role === 'admin') && (
              <>
                <AddressVerification
                  propertyId={property.id}
                  address={property.address}
                  city={property.city || ""}
                  state={property.state || ""}
                  zipCode={property.zip_code || undefined}
                  isVerified={(property as any).address_verified || false}
                  onVerified={() => {}}
                />

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <button
                      onClick={() => toggleSection('management')}
                      className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 p-3 -m-3 rounded-lg transition-colors"
                      data-testid="section-management-toggle"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">Management</h2>
                      </div>
                      {expandedSections.management ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    {expandedSections.management && (
                      <div className="mt-4">
                        <PropertyManagement property={property as any} onUpdate={() => {}} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Column - Sidebar CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-4">
              {/* Primary CTA */}
              <Link href={`/apply?propertyId=${property.id}`} className="block">
                <Button 
                  className="w-full h-12 font-black shadow-lg hover:shadow-xl active:scale-95 transition-all" 
                  size="lg" 
                  data-testid="button-apply-now"
                >
                  Apply Now
                </Button>
              </Link>

              {/* Owner Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Owner</p>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={owner?.profile_image || undefined} alt={owner?.full_name || 'Owner'} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{owner?.full_name?.substring(0, 2).toUpperCase() || 'PM'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{owner?.full_name || 'Property Manager'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        Verified
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {owner?.phone && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="w-full gap-2 text-sm justify-start font-bold text-primary hover:bg-primary/5"
                        onClick={() => window.open(`tel:${owner.phone}`)}
                        data-testid="button-call-office"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        Call
                      </Button>
                    )}
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
                        triggerText="Message"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Trust Badge */}
              <Card className="border-2 border-dashed border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/10 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Verified Listing</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Fair housing verified</p>
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

      {/* Trust Bar */}
      <div className="mt-12">
        <CredibilityBar />
      </div>

      <div className="pb-20 md:pb-0">
        <Footer />
      </div>
    </div>
  );
}
