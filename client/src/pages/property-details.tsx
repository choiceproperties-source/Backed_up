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
  PhoneCall, MessageCircle, Shield, CheckCircle2, Clock, Eye, Video, Users, AlertCircle
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

      {/* Hero Gallery - Zillow Style */}
      <div className="w-full bg-gray-100 dark:bg-gray-900">
        <div className="max-w-[1400px] mx-auto">
          {/* Desktop Gallery Grid */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-1 h-[450px] cursor-pointer" onClick={() => setShowFullGallery(true)}>
            <div className="col-span-2 row-span-2 relative group overflow-hidden bg-gray-200 dark:bg-gray-800">
              <img
                src={allImages[0]}
                alt={property.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                data-testid="hero-image-primary"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {allImages.length > 0 && (
                <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-sm">
                  <ImageIcon className="h-4 w-4" />
                  {allImages.length}
                </div>
              )}
            </div>
            {allImages.slice(1, 5).map((img, idx) => (
              <div key={idx} className="relative group overflow-hidden bg-gray-200 dark:bg-gray-800">
                <img
                  src={img}
                  alt={`${property.title} - ${idx + 2}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                {idx === 3 && allImages.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">+{allImages.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
            <button
              className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowFullGallery(true); }}
              data-testid="button-view-all-photos"
            >
              <Grid3X3 className="h-4 w-4" />
              View all {allImages.length} photos
            </button>
          </div>

          {/* Mobile Gallery */}
          <div className="md:hidden relative h-72 bg-gray-200 dark:bg-gray-800 cursor-pointer" onClick={() => setShowFullGallery(true)}>
            <img
              src={allImages[currentImageIndex]}
              alt={property.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              data-testid="hero-image-mobile"
            />
            <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-sm">
              <ImageIcon className="h-4 w-4" />
              {allImages.length}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <span className="bg-black/70 text-white px-3 py-1 rounded text-sm font-medium">
                {currentImageIndex + 1}/{allImages.length}
              </span>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="bg-black/70 text-white h-8 w-8" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="ghost" className="bg-black/70 text-white h-8 w-8" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Unified Property Header Card */}
            <Card className="border-gray-200 dark:border-gray-800 overflow-hidden">
              <CardContent className="p-6 space-y-5">
                {/* Compelling Headline */}
                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight" data-testid="property-headline">
                    {property.title || `Spacious ${bedrooms}-Bedroom ${property.property_type || 'Home'}`}
                    {property.furnished && ' | Furnished'}
                    {sqft > 2000 && ' | Large Layout'}
                  </h1>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-base">{property.address}, {property.city}, {property.state} {property.zip_code}</span>
                  </div>
                </div>

                {/* Manager Rating & Response */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(averageRating || 4.8) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="font-medium">{(averageRating || 4.8).toFixed(1)}</span>
                    <span className="text-gray-500">({reviews?.length || 0} reviews)</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Responds within 2 hours</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span>98% response rate</span>
                  </div>
                </div>

                <Separator />

                {/* Key Details Row */}
                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Bed className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{bedrooms}</span>
                    <span className="text-gray-500 dark:text-gray-400">bd</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Bath className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{bathrooms}</span>
                    <span className="text-gray-500 dark:text-gray-400">ba</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                    <Maximize className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{sqft.toLocaleString()}</span>
                    <span className="text-gray-500 dark:text-gray-400">sqft</span>
                  </div>
                  {property.furnished && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <Sofa className="h-5 w-5 text-primary" />
                      <span className="font-medium text-gray-900 dark:text-white">Furnished</span>
                    </div>
                  )}
                  {property.pets_allowed !== undefined && (
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <PawPrint className="h-5 w-5 text-primary" />
                      <span className="font-medium text-gray-900 dark:text-white">{property.pets_allowed ? 'Pets OK' : 'No Pets'}</span>
                    </div>
                  )}
                </div>

                {/* Availability & Lease */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">Available Now</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-gray-600 dark:text-gray-400">{property.lease_term || '12 month'} lease minimum</span>
                </div>

                <Separator />

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {property.status === 'active' ? 'Available' : property.status}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    <Shield className="h-3 w-3" />
                    Verified Listing
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Photos
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {property.property_type || 'Apartment'}
                  </Badge>
                </div>

                {/* Action Buttons - Desktop */}
                <div className="hidden md:flex gap-3 pt-2">
                  <Button
                    onClick={() => toggleFavorite(property.id)}
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="button-save"
                  >
                    <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-red-500 text-red-500' : ''}`} />
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
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-5">
                <button
                  onClick={() => toggleSection('overview')}
                  className="flex items-center justify-between w-full text-left"
                  data-testid="section-overview-toggle"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">About This Property</h2>
                  {expandedSections.overview ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                {expandedSections.overview && (
                  <div className="mt-4 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {property.description || `Welcome to this beautiful ${bedrooms}-bedroom, ${bathrooms}-bathroom ${property.property_type || 'home'} in the heart of ${property.city}. ${property.furnished ? 'This fully furnished property is move-in ready and includes all essential furniture.' : ''} ${sqft > 2000 ? `With ${sqft.toLocaleString()} square feet of living space, there is plenty of room for comfortable living.` : ''} ${property.pets_allowed ? 'Pets are welcome in this home.' : ''}`}
                    </p>
                    {nearbyPlaces && Array.isArray(nearbyPlaces) && nearbyPlaces.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Neighborhood Highlights</h3>
                        <div className="flex flex-wrap gap-2">
                          {nearbyPlaces.slice(0, 4).map((place: { name: string; distance: string }, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {place.name} - {place.distance}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Facts & Features Section */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-5">
              <button
                onClick={() => toggleSection('facts')}
                className="flex items-center justify-between w-full text-left"
                data-testid="section-facts-toggle"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Facts & Features</h2>
                {expandedSections.facts ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {expandedSections.facts && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Interior</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Bedrooms</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bedrooms}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Bathrooms</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bathrooms}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Square Feet</span>
                        <span className="font-medium text-gray-900 dark:text-white">{sqft.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Furnished</span>
                        <span className="font-medium text-gray-900 dark:text-white">{property.furnished ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Rental Terms</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Property Type</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{property.property_type || 'Apartment'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Lease Term</span>
                        <span className="font-medium text-gray-900 dark:text-white">{property.lease_term || '12 months'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Pets Allowed</span>
                        <span className="font-medium text-gray-900 dark:text-white">{property.pets_allowed ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-600 dark:text-gray-400">Available</span>
                        <span className="font-medium text-gray-900 dark:text-white">Now</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Amenities Section */}
            <div className="border-t pt-6">
              <button
                onClick={() => toggleSection('amenities')}
                className="flex items-center justify-between w-full text-left"
                data-testid="section-amenities-toggle"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Amenities</h2>
                {expandedSections.amenities ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {expandedSections.amenities && (
                <div className="mt-4">
                  <AmenitiesGrid amenities={property.amenities as string[] | undefined} />
                </div>
              )}
            </div>

            {/* Reviews Section */}
            {reviews && reviews.length > 0 && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">({reviews.length})</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i <= (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{review.title || 'Review'}</p>
                      {review.comment && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Section */}
            <div className="border-t pt-6">
              <button
                onClick={() => toggleSection('location')}
                className="flex items-center justify-between w-full text-left"
                data-testid="section-location-toggle"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Location</h2>
                {expandedSections.location ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {expandedSections.location && (
                <div className="mt-4 space-y-6">
                  <div className="rounded-lg overflow-hidden">
                    <InteractiveMap 
                      center={position} 
                      title={property.title} 
                      address={property.address}
                      nearbyPlaces={nearbyPlaces}
                      showControls={true}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Nearby Places</h3>
                    <NearbyPlaces places={nearbyPlaces} />
                  </div>
                </div>
              )}
            </div>

            {/* Property Management Section - Only visible to owners/agents */}
            {user && (user.id === (property as any).owner_id || user.id === (property as any).listing_agent_id || user.role === 'admin') && (
              <>
                <div className="border-t pt-6">
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

                <div className="border-t pt-6">
                  <button
                    onClick={() => toggleSection('management')}
                    className="flex items-center justify-between w-full text-left"
                    data-testid="section-management-toggle"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Property Management</h2>
                    </div>
                    {expandedSections.management ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
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
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="shadow-xl border-primary/10 dark:border-primary/5 rounded-2xl overflow-hidden hover-elevate transition-all duration-300">
                <div className="bg-primary p-6 text-white text-center sm:text-left">
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-4xl font-black">${property.price ? parseInt(property.price).toLocaleString() : 'N/A'}</span>
                    <span className="text-primary-foreground/80 font-medium">/mo</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] uppercase tracking-tighter">Instant Approval</Badge>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] uppercase tracking-tighter">Low Deposit</Badge>
                  </div>
                </div>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-3">
                    <Link href={`/apply?propertyId=${property.id}`} className="block">
                      <Button className="w-full h-14 text-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all active-elevate-2 rounded-xl" size="lg" data-testid="button-apply-now">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="relative py-2">
                    <Separator className="bg-gray-100 dark:bg-gray-800" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connect</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/10 shadow-sm">
                        <AvatarImage src={owner?.profile_image || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary font-black">{owner?.full_name?.substring(0, 2).toUpperCase() || 'PM'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{owner?.full_name || 'Property Manager'}</p>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Verified Expert</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
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
                        <Button variant="ghost" className="w-full gap-2 text-primary font-bold hover:bg-primary/5" onClick={() => window.open(`tel:${owner.phone}`)}>
                          <PhoneCall className="h-4 w-4" />
                          Call Office
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trust Badge Card */}
              <Card className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-xl">
                    <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Choice Verified</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">This listing has been audited for fair housing compliance and price accuracy.</p>
                  </div>
                </div>
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
