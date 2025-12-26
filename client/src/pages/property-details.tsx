import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { Property, Review, Owner } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { 
  MapPin, Bed, Bath, Maximize, X, ChevronLeft, ChevronRight, Grid3X3, 
  Building2, Video, Heart, Shield, Clock, Eye, Star, Share2
} from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";
import { AmenitiesGrid } from "@/components/amenities-grid";
import { InteractiveMap } from "@/components/interactive-map";
import { NearbyPlaces } from "@/components/nearby-places";
import { EnhancedTrustBadges } from "@/components/enhanced-trust-badges";
import { updateMetaTags, getPropertyStructuredData, addStructuredData, removeStructuredData } from "@/lib/seo";
import { PropertyDetailsSkeleton } from "@/components/property-details-skeleton";
import NotFound from "@/pages/not-found";

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

export default function PropertyDetails() {
  const [match, params] = useRoute("/property/:id");
  const id = params?.id;
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVideoTour, setShowVideoTour] = useState(false);

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

  const { data: photosData } = useQuery<any[]>({
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
        title: `${property.title} - Exclusive Listing`,
        description: property.description || '',
        image: photosData?.[0]?.imageUrls?.gallery || placeholderExterior,
        url: window.location.href,
        type: "property"
      });
      addStructuredData(getPropertyStructuredData(property), 'property');
    }
    return () => { removeStructuredData('property'); };
  }, [property]);

  const allImages = property && photosData && photosData.length > 0
    ? photosData.map(photo => photo.imageUrls.gallery)
    : property && (property.images || []).length > 0 
      ? property.images!.map(img => imageMap[img] || img)
      : [placeholderExterior, placeholderLiving, placeholderKitchen, placeholderBedroom];

  if (!match) return <NotFound />;
  if (isLoading || !property) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1">
          <PropertyDetailsSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col selection:bg-primary/20">
      <Navbar />

      {/* Stunning Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden bg-black group/hero">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={allImages[0]}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-[10000ms] ease-out scale-100 group-hover/hero:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end items-center pb-24 px-4 text-center max-w-5xl mx-auto space-y-6">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-[0.2em] border-none shadow-2xl backdrop-blur-md">
              {property.status || 'Exclusive Listing'}
            </Badge>
            <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
              {property.title}
            </h1>
            <div className="flex items-center justify-center gap-3 text-gray-200/90 font-medium text-lg md:text-xl drop-shadow-lg">
              <MapPin className="h-5 w-5 text-secondary" />
              <span>{property.address}, {property.city}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <Button 
              size="lg" 
              className="h-14 px-8 rounded-none font-black text-base shadow-2xl bg-white text-black hover:bg-gray-100 border-none transition-all hover:scale-105"
              onClick={() => setShowVideoTour(true)}
            >
              <Video className="h-5 w-5 mr-2" />
              Watch Experience
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 rounded-none font-black text-base shadow-2xl border-white/30 text-white bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-all hover:scale-105"
              onClick={() => setShowFullGallery(true)}
            >
              <Grid3X3 className="h-5 w-5 mr-2" />
              View All Photos
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Property Bar */}
      <div className="sticky top-16 z-40 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-8">
          <div className="hidden md:flex items-center gap-12">
            <div className="flex items-center gap-3">
              <Bed className="h-5 w-5 text-primary" />
              <div className="leading-none">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Beds</p>
                <p className="text-lg font-black">{bedrooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bath className="h-5 w-5 text-primary" />
              <div className="leading-none">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Baths</p>
                <p className="text-lg font-black">{bathrooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Maximize className="h-5 w-5 text-primary" />
              <div className="leading-none">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Area</p>
                <p className="text-lg font-black">{sqft.toLocaleString()} <span className="text-sm text-gray-400">ft²</span></p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-1 md:flex-none justify-between md:justify-end">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Monthly Price</p>
              <p className="text-2xl font-black text-primary leading-none">{formatPrice(property.price)}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="lg" 
                className="rounded-none px-8 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                onClick={() => window.location.href = `/apply/${property.id}`}
              >
                Apply Now
              </Button>
              <Button 
                size="icon" 
                variant="outline" 
                className={`rounded-none h-12 w-12 border-gray-200 transition-all ${isFavorited(property.id) ? 'bg-red-50 text-red-500 border-red-100' : ''}`}
                onClick={() => toggleFavorite(property.id)}
              >
                <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-16 space-y-24">
        {/* About & Narrative Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">About the home</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.1]">
                Modern elegance meets <br />
                <span className="text-gray-400">urban sophistication.</span>
              </h3>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              {property.description || "Experience living at its finest in this meticulously designed space. Every corner has been crafted to offer a blend of luxury, comfort, and functionality, making it the perfect sanctuary for modern living."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="space-y-4">
              <div className="aspect-[4/5] rounded-none overflow-hidden shadow-2xl">
                <img src={allImages[1]} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="aspect-square rounded-none overflow-hidden shadow-xl">
                <img src={allImages[2]} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
              </div>
            </div>
            <div className="pt-12 space-y-4">
              <div className="aspect-square rounded-none overflow-hidden shadow-xl">
                <img src={allImages[3]} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="aspect-[4/5] rounded-none overflow-hidden shadow-2xl">
                <img src={allImages[4]} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Lifestyle Features</h2>
            <h3 className="text-4xl font-black tracking-tighter">Everything you need, <br /> and then some.</h3>
          </div>
          <AmenitiesGrid amenities={property.amenities} />
        </section>

        {/* Neighborhood Section */}
        <section className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4 max-w-xl">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">The Neighborhood</h2>
              <h3 className="text-4xl font-black tracking-tighter">Explore the local vibe and <br /> hotspots nearby.</h3>
            </div>
            <Button variant="outline" className="rounded-none px-8 font-bold border-gray-200">View Full Area Map</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
            <div className="lg:col-span-2 rounded-none overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl">
              <InteractiveMap lat={lat} lng={lng} />
            </div>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <NearbyPlaces places={nearbyPlaces} />
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900 rounded-none px-8 md:px-16 border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl font-black tracking-tight">Choice Verified™</h3>
              <p className="text-gray-500 font-medium">This property has been manually inspected and verified for accuracy and high-quality standards.</p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <Avatar key={i} className="border-4 border-gray-50 dark:border-gray-900 h-12 w-12 rounded-none">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-400">42 people applied this week</span>
              </div>
            </div>
            <div className="lg:col-span-2">
              <EnhancedTrustBadges />
            </div>
          </div>
        </section>
      </div>

      {/* Video Tour Modal */}
      {showVideoTour && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-none overflow-hidden shadow-2xl border border-white/10">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setShowVideoTour(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-4">
              <div className="p-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <Video className="h-16 w-16 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black">Experience {property.title}</h3>
                <p className="text-gray-400 font-medium max-w-md">The cinematic video tour is being prepared. In a production environment, this would load a high-resolution 4K walkthrough.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {showFullGallery && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-white/10">
            <div className="text-white">
              <p className="text-lg font-black">{currentImageIndex + 1} / {allImages.length}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setShowFullGallery(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            <Button variant="ghost" size="icon" className="absolute left-4 text-white hover:bg-white/10 h-16 w-16" onClick={() => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length)}>
              <ChevronLeft className="h-10 w-10" />
            </Button>
            <img src={allImages[currentImageIndex]} className="max-h-[80vh] max-w-full object-contain" />
            <Button variant="ghost" size="icon" className="absolute right-4 text-white hover:bg-white/10 h-16 w-16" onClick={() => setCurrentImageIndex(prev => (prev + 1) % allImages.length)}>
              <ChevronRight className="h-10 w-10" />
            </Button>
          </div>
          <div className="p-6 overflow-x-auto flex gap-4 justify-center bg-black/50">
            {allImages.map((img, i) => (
              <button key={i} onClick={() => setCurrentImageIndex(i)} className={`h-16 w-24 flex-shrink-0 border-2 transition-all ${i === currentImageIndex ? 'border-primary' : 'border-transparent opacity-50'}`}>
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
