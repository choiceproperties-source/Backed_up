import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Property, Review, Owner } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, Bed, Bath, Maximize, X, ChevronLeft, ChevronRight, Grid3X3, 
  Building2, Video, Heart, Shield, Clock, Eye, Star, Share2, Zap,
  Trees, Wifi, Lock, Home, DollarSign, Calculator, BookOpen, TrendingUp,
  Send, CheckCircle, AlertCircle
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
  const { toast } = useToast();
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVideoTour, setShowVideoTour] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

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
    const rent = parseFloat(String(property?.price || 0));
    setMonthlyPayment(rent);
  }, [property?.price]);
  
  useEffect(() => {
    if (property) {
      updateMetaTags({
        title: `${property.title} - Premium Listing`,
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

  const handleInquiry = async () => {
    if (!inquiryForm.name || !inquiryForm.email) {
      toast({ title: "Error", description: "Please fill in name and email", variant: "destructive" });
      return;
    }
    setSubmittingInquiry(true);
    try {
      await apiRequest("POST", `/api/inquiries`, {
        propertyId: property?.id,
        senderName: inquiryForm.name,
        senderEmail: inquiryForm.email,
        senderPhone: inquiryForm.phone,
        message: inquiryForm.message
      });
      toast({ title: "Success", description: "Your inquiry has been sent!" });
      setInquiryForm({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send inquiry", variant: "destructive" });
    }
    setSubmittingInquiry(false);
  };

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

      {/* Premium Hero with Image Carousel */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={allImages[currentImageIndex]}
            alt={property.title}
            className="w-full h-full object-cover transition-all duration-700 scale-100 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        </div>

        {/* Carousel Controls */}
        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 rounded-lg z-20" onClick={() => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length)} data-testid="button-prev-hero">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 rounded-lg z-20" onClick={() => setCurrentImageIndex(prev => (prev + 1) % allImages.length)} data-testid="button-next-hero">
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Image Counter */}
        <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg font-black text-sm z-20">
          {currentImageIndex + 1} / {allImages.length}
        </div>

        {/* Status Badge */}
        <div className="absolute top-8 left-8 z-20">
          <Badge className="bg-white/95 backdrop-blur-md text-black hover:bg-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-[0.15em] border-none shadow-2xl">
            {property.status || 'Featured'}
          </Badge>
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end items-start pb-32 px-8 md:px-16 max-w-5xl space-y-8">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1200">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl max-w-4xl">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-white/90 font-semibold text-lg drop-shadow-lg">
              <MapPin className="h-5 w-5 text-blue-300" />
              <span>{property.address}</span>
              <span className="text-white/60">•</span>
              <span>{property.city}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-16 duration-1200 delay-200">
            <Button 
              size="lg" 
              className="h-14 px-8 rounded-lg font-bold shadow-2xl bg-white text-black hover:bg-gray-100 border-none transition-all"
              onClick={() => window.location.href = `/apply/${property.id}`}
              data-testid="button-apply-now"
            >
              Apply Now
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 rounded-lg font-bold shadow-xl border-white/40 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
              onClick={() => setShowVideoTour(true)}
              data-testid="button-video-tour"
            >
              <Video className="h-5 w-5 mr-2" />
              Tour
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 rounded-lg font-bold shadow-xl border-white/40 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
              onClick={() => setShowFullGallery(true)}
              data-testid="button-view-photos"
            >
              <Grid3X3 className="h-5 w-5 mr-2" />
              Photos
            </Button>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex gap-2 overflow-x-auto justify-center bg-gradient-to-t from-black via-black/50 to-transparent backdrop-blur-sm">
          {allImages.map((img, i) => (
            <button key={i} onClick={() => setCurrentImageIndex(i)} className={`h-16 w-24 flex-shrink-0 rounded-lg border-2 transition-all overflow-hidden ${i === currentImageIndex ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-transparent opacity-50 hover:opacity-70'}`} data-testid={`carousel-thumb-${i}`}>
              <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${i}`} />
            </button>
          ))}
        </div>
      </section>

      {/* Sticky Info Bar */}
      <div className="sticky top-16 z-40 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Bed className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">Bedrooms</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{bedrooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bath className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">Bathrooms</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{bathrooms}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Maximize className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">Area</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{sqft.toLocaleString()} ft²</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">Monthly</p>
                <p className="text-lg font-black text-blue-600">{formatPrice(property.price)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="outline" 
              className={`rounded-lg h-12 w-12 border-gray-200 dark:border-gray-700 transition-all ${isFavorited(property.id) ? 'bg-red-50 dark:bg-red-950 text-red-600 border-red-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              onClick={() => toggleFavorite(property.id)}
              data-testid="button-favorite"
            >
              <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
            </Button>
            <Button size="icon" variant="outline" className="rounded-lg h-12 w-12 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" data-testid="button-share">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-8 py-20 space-y-32">
        
        {/* Key Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 rounded-xl">
            <CardContent className="pt-6">
              <Zap className="h-8 w-8 text-blue-600 mb-3" />
              <p className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-1">Utilities</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">Included</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800 rounded-xl">
            <CardContent className="pt-6">
              <Lock className="h-8 w-8 text-green-600 mb-3" />
              <p className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-1">Security</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">24/7</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 rounded-xl">
            <CardContent className="pt-6">
              <Wifi className="h-8 w-8 text-purple-600 mb-3" />
              <p className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-1">Internet</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">High-Speed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800 rounded-xl">
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-orange-600 mb-3" />
              <p className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-1">Market Value</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">Strong</p>
            </CardContent>
          </Card>
        </section>

        {/* About Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">About the property</Badge>
              <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                Premium Living Space
              </h2>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              {property.description || "Experience living at its finest in this meticulously designed space. Every corner has been crafted to offer a blend of luxury, comfort, and functionality."}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <p className="text-sm font-black uppercase text-gray-500">Property Type</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{property.property_type || 'Apartment'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black uppercase text-gray-500">Lease Term</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{property.lease_term || '12 Months'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300 cursor-pointer group">
                <img src={allImages[1] || placeholderLiving} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-testid="img-gallery-1" />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer group">
                <img src={allImages[2] || placeholderKitchen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-testid="img-gallery-2" />
              </div>
            </div>
            <div className="pt-12 space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer group">
                <img src={allImages[3] || placeholderBedroom} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-testid="img-gallery-3" />
              </div>
            </div>
          </div>
        </section>

        {/* Property Details Tabs */}
        <section className="space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Property Details</Badge>
            <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">Complete Information</h2>
          </div>
          
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            {[
              { id: 'details', label: 'Details', icon: Building2 },
              { id: 'features', label: 'Features', icon: Star },
              { id: 'pricing', label: 'Pricing', icon: DollarSign }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div><p className="text-sm font-black uppercase text-gray-500 mb-2">Unit Layout</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{bedrooms} Bed • {bathrooms} Bath</p></div>
                <div><p className="text-sm font-black uppercase text-gray-500 mb-2">Square Footage</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{sqft.toLocaleString()} sq ft</p></div>
                <div><p className="text-sm font-black uppercase text-gray-500 mb-2">Year Built</p><p className="text-lg font-semibold text-gray-900 dark:text-white">2022</p></div>
              </div>
              <div className="space-y-6">
                <div><p className="text-sm font-black uppercase text-gray-500 mb-2">Pet Policy</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{property.petsAllowed ? 'Pets Welcome' : 'No Pets'}</p></div>
                <div><p className="text-sm font-black uppercase text-gray-500 mb-2">Furnished</p><p className="text-lg font-semibold text-gray-900 dark:text-white">{property.furnished ? 'Yes' : 'Unfurnished'}</p></div>
                <div><p className="text-sm font-black uppercase text-gray-500 mb-2">Parking</p><p className="text-lg font-semibold text-gray-900 dark:text-white">Included</p></div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AmenitiesGrid amenities={property.amenities || []} />
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="p-6 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-black uppercase text-gray-500 mb-2">Monthly Rent</p>
                  <p className="text-4xl font-black text-blue-600">{formatPrice(property.price)}</p>
                </div>
                <div className="p-6 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-sm font-black uppercase text-gray-500 mb-2">Security Deposit</p>
                  <p className="text-3xl font-black text-green-600">{formatPrice(property.price)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-6 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-black uppercase text-gray-500 mb-2">Application Fee</p>
                  <p className="text-3xl font-black text-purple-600">$45.00</p>
                </div>
                <div className="p-6 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-black uppercase text-gray-500 mb-2">Available Date</p>
                  <p className="text-2xl font-black text-orange-600">Immediately</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Financing Calculator */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 md:p-12 space-y-8">
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h2 className="text-4xl font-black text-gray-900 dark:text-white">Financing Calculator</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 mb-3">Monthly Rent</p>
              <p className="text-3xl font-black text-blue-600">{formatPrice(monthlyPayment)}</p>
            </div>
            <div>
              <p className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 mb-3">Annual Cost</p>
              <p className="text-3xl font-black text-green-600">{formatPrice(monthlyPayment * 12)}</p>
            </div>
            <div>
              <p className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 mb-3">12-Month Total</p>
              <p className="text-3xl font-black text-purple-600">{formatPrice((monthlyPayment * 12) + parseFloat(String(property.price || 0)))}</p>
            </div>
          </div>
        </section>

        {/* Schools Section */}
        <section className="space-y-12">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h2 className="text-5xl font-black text-gray-900 dark:text-white">Schools Nearby</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Lincoln High School", grade: "9-12", rating: 4.5, distance: "0.8 mi" },
              { name: "Central Middle School", grade: "6-8", rating: 4.2, distance: "0.5 mi" },
              { name: "Riverside Elementary", grade: "K-5", rating: 4.7, distance: "0.3 mi" }
            ].map((school, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow duration-300 rounded-xl border border-gray-200 dark:border-gray-800">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{school.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Grades {school.grade}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className={`h-4 w-4 ${j < Math.round(school.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{school.distance}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Price Trends */}
        <section className="space-y-12">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h2 className="text-5xl font-black text-gray-900 dark:text-white">Price Trends</h2>
          </div>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl">
            <CardContent className="pt-8 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">12 months ago</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">$2,200</span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: "75%"}}></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Today</span>
                  <span className="text-lg font-black text-gray-900 dark:text-white">{formatPrice(property.price)}</span>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: "100%"}}></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 pt-4">Market price increased 5.2% over the last year</p>
            </CardContent>
          </Card>
        </section>

        {/* Similar Properties Carousel */}
        <section className="space-y-12">
          <h2 className="text-5xl font-black text-gray-900 dark:text-white">Similar Properties</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <Card key={i} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="aspect-video bg-gray-300 dark:bg-gray-700 relative overflow-hidden">
                  <img src={allImages[i % allImages.length]} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" alt={`Similar property ${i}`} />
                  <Badge className="absolute top-4 right-4 bg-white/90 text-black">Similar</Badge>
                </div>
                <CardContent className="pt-4 space-y-4">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white line-clamp-2">Modern Apartment #{2800 + i}</h3>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{property.city}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div><p className="text-[10px] font-bold uppercase text-gray-500">Beds</p><p className="text-lg font-black">{bedrooms}</p></div>
                    <div><p className="text-[10px] font-bold uppercase text-gray-500">Baths</p><p className="text-lg font-black">{bathrooms}</p></div>
                    <div><p className="text-[10px] font-bold uppercase text-gray-500">Sqft</p><p className="text-lg font-black">{(sqft/1000).toFixed(1)}k</p></div>
                  </div>
                  <p className="text-2xl font-black text-blue-600 pt-2">{formatPrice(parseFloat(String(property.price || 0)) + (i * 50))}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-12">
          <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Lifestyle Features</Badge>
          <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">Premium Amenities</h2>
          <AmenitiesGrid amenities={property.amenities || []} />
        </section>

        {/* Neighborhood Map */}
        <section className="space-y-12">
          <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Neighborhood</Badge>
          <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">Explore the Area</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl">
              <InteractiveMap latitude={lat} longitude={lng} />
            </div>
            <div className="space-y-4 overflow-y-auto pr-3 custom-scrollbar">
              <NearbyPlaces places={nearbyPlaces} />
            </div>
          </div>
        </section>

        {/* Inquiry Form - Zillow/OpenDoor Standard */}
        <section className="space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Contact</Badge>
            <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">Interested in this property?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Send an inquiry to the property manager</p>
          </div>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl">
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Full Name</label>
                  <Input 
                    placeholder="Your name"
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({...inquiryForm, name: e.target.value})}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    data-testid="input-inquiry-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Email</label>
                  <Input 
                    type="email"
                    placeholder="your@email.com"
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({...inquiryForm, email: e.target.value})}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    data-testid="input-inquiry-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Phone (Optional)</label>
                <Input 
                  placeholder="(555) 123-4567"
                  value={inquiryForm.phone}
                  onChange={(e) => setInquiryForm({...inquiryForm, phone: e.target.value})}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  data-testid="input-inquiry-phone"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">Message</label>
                <Textarea 
                  placeholder="Tell us why you're interested in this property..."
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 min-h-24"
                  data-testid="textarea-inquiry-message"
                />
              </div>
              <Button 
                size="lg"
                className="w-full rounded-lg font-bold h-12 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleInquiry}
                disabled={submittingInquiry}
                data-testid="button-send-inquiry"
              >
                {submittingInquiry ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Inquiry
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Trust Section */}
        <section className="py-16 px-8 md:px-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                <h3 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Verified Safe</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">This property has been manually inspected and verified for accuracy and premium quality standards.</p>
            </div>
            <div className="lg:col-span-2">
              <EnhancedTrustBadges />
            </div>
          </div>
        </section>

        {/* Owner Contact */}
        {owner && (
          <section className="space-y-12">
            <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Property Manager</Badge>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl">
              <CardContent className="pt-8 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 rounded-xl border-4 border-white dark:border-gray-900">
                    <AvatarImage src={owner.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${owner.id}`} />
                    <AvatarFallback>{owner.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{owner.full_name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">{owner.role === 'landlord' ? 'Property Owner' : 'Leasing Manager'}</p>
                    <div className="flex items-center gap-2 pt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">4.9/5</span>
                    </div>
                  </div>
                </div>
                <Button size="lg" className="rounded-lg font-bold h-12 px-8 bg-blue-600 hover:bg-blue-700" data-testid="button-contact-owner">
                  Contact Owner
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* Video Tour Modal */}
      {showVideoTour && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 z-10 rounded-lg" onClick={() => setShowVideoTour(false)} data-testid="button-close-video">
              <X className="h-6 w-6" />
            </Button>
            <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-4">
              <div className="p-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <Video className="h-16 w-16 text-blue-400 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black">{property.title} Tour</h3>
                <p className="text-gray-400 font-medium max-w-md">Premium 4K video tour with immersive walkthrough coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Gallery Modal */}
      {showFullGallery && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-black/50 backdrop-blur-md">
            <p className="text-lg font-black text-white">{currentImageIndex + 1} / {allImages.length}</p>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-lg" onClick={() => setShowFullGallery(false)} data-testid="button-close-gallery">
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            <Button variant="ghost" size="icon" className="absolute left-4 text-white hover:bg-white/10 h-16 w-16 rounded-lg" onClick={() => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length)} data-testid="button-prev-image">
              <ChevronLeft className="h-10 w-10" />
            </Button>
            <img src={allImages[currentImageIndex]} className="max-h-[80vh] max-w-full object-contain" alt={`Gallery ${currentImageIndex + 1}`} />
            <Button variant="ghost" size="icon" className="absolute right-4 text-white hover:bg-white/10 h-16 w-16 rounded-lg" onClick={() => setCurrentImageIndex(prev => (prev + 1) % allImages.length)} data-testid="button-next-image">
              <ChevronRight className="h-10 w-10" />
            </Button>
          </div>
          <div className="p-6 overflow-x-auto flex gap-4 justify-center bg-black/50 backdrop-blur-md border-t border-gray-800">
            {allImages.map((img, i) => (
              <button key={i} onClick={() => setCurrentImageIndex(i)} className={`h-16 w-24 flex-shrink-0 rounded-lg border-2 transition-all overflow-hidden ${i === currentImageIndex ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-transparent opacity-40 hover:opacity-70'}`} data-testid={`thumbnail-${i}`}>
                <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${i}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
