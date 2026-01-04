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

  const lat = property?.latitude ? parseFloat(String(property.latitude)) : 0;
  const lng = property?.longitude ? parseFloat(String(property.longitude)) : 0;
  const nearbyPlaces = useNearbyPlaces(lat, lng);

  const bedrooms = property?.bedrooms;
  const bathrooms = property?.bathrooms ? Math.round(parseDecimal(property.bathrooms)) : null;
  const sqft = property?.square_feet;

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
    : property && (property.images as string[] || []).length > 0 
      ? (property.images as string[]).map(img => imageMap[img] || img)
      : [];

  const displayImages = allImages.length > 0 ? allImages : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2000"]; // Neutral placeholder if really empty

  useEffect(() => {
    if (!showFullGallery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
      if (e.key === 'ArrowRight') setCurrentImageIndex(prev => (prev + 1) % allImages.length);
      if (e.key === 'Escape') setShowFullGallery(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullGallery, allImages.length]);

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
      <section className="relative h-[60vh] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={displayImages[currentImageIndex]}
            alt={property.title}
            className="w-full h-full object-cover transition-all duration-700 scale-100 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
        </div>

        {/* Floating Map Icon */}
        <div className="absolute bottom-6 right-6 z-30 group cursor-pointer" onClick={() => setActiveTab("map")} data-testid="floating-map-button">
          <div className="bg-white p-3 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <MapPin className="text-white h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Carousel Controls */}
        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 rounded-full z-20" onClick={() => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length)} data-testid="button-prev-hero">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 rounded-full z-20" onClick={() => setCurrentImageIndex(prev => (prev + 1) % allImages.length)} data-testid="button-next-hero">
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Dots Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {allImages.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all ${i === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'}`}
            />
          ))}
        </div>

        {/* Status Badge */}
        <div className="absolute top-6 left-6 z-20">
          {(property as any).visibility === 'featured' && (
            <Badge className="bg-white/95 backdrop-blur-md text-black px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-wider border-none shadow-xl">
              Featured
            </Badge>
          )}
        </div>
      </section>

      {/* Hero Info Section - Mimicking the provided image */}
      <section className="bg-white dark:bg-gray-950 px-6 py-10 border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-6 flex-1">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight border-b-2 border-gray-900 dark:border-white w-fit pr-4 pb-1">
                {property.address}
              </h1>
              <p className="text-2xl md:text-4xl font-semibold text-gray-400 dark:text-gray-500 underline decoration-dotted decoration-2 underline-offset-8">
                {property.city}, {property.state} {property.zip_code || (property as any).zip}
              </p>
            </div>

            <div className="pt-4">
              <h2 className="text-7xl font-bold text-gray-900 dark:text-white tracking-tighter">
                {formatPrice(property.price)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xl text-gray-500 dark:text-gray-400 font-medium">
              {bedrooms !== undefined && bedrooms !== null && (
                <span>{bedrooms} bds</span>
              )}
              {bathrooms !== undefined && bathrooms !== null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{bathrooms} ba</span>
                </>
              )}
              {sqft && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{(sqft as number).toLocaleString()} sqft</span>
                </>
              )}
              {property.price && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{formatPrice(Math.round(parseFloat(String(property.price)) / 200))}/month est.</span>
                </>
              )}
            </div>
            
            {(property as any).school_district && (
              <p className="text-2xl text-gray-500 dark:text-gray-400 font-medium">
                {(property as any).school_district}
              </p>
            )}
          </div>

          <div className="flex items-center pt-2">
            <Button 
              size="icon" 
              variant="outline" 
              className={`h-24 w-24 rounded-3xl border-gray-200 dark:border-gray-800 transition-all shadow-sm ${isFavorited(property.id) ? 'text-red-600' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
              onClick={() => toggleFavorite(property.id)}
              data-testid="button-favorite"
            >
              <Heart className={`h-10 w-10 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Sticky Info Bar */}
      <div className="sticky top-16 z-40 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-lg hidden md:block">
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
                <p className="text-lg font-black text-gray-900 dark:text-white">{sqft ? `${sqft.toLocaleString()} ft²` : 'N/A'}</p>
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
              data-testid="button-favorite-sticky"
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
        
        {/* Key Stats Cards - Removed hardcoded placeholders */}
        {property.utilities_included && property.utilities_included.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 rounded-xl">
              <CardContent className="pt-6">
                <Zap className="h-8 w-8 text-blue-600 mb-3" />
                <p className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-1">Utilities</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">Included</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* About Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">About the property</Badge>
              <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                {property.title}
              </h2>
            </div>
            {property.description && (
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                {property.description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 pt-6">
              {property.property_type && (
                <div className="space-y-2">
                  <p className="text-sm font-black uppercase text-gray-500">Property Type</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{property.property_type}</p>
                </div>
              )}
              {property.lease_term && (
                <div className="space-y-2">
                  <p className="text-sm font-black uppercase text-gray-500">Lease Term</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{property.lease_term}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              {allImages[1] && (
                <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300 cursor-pointer group">
                  <img src={allImages[1]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-testid="img-gallery-1" />
                </div>
              )}
              {allImages[2] && (
                <div className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer group">
                  <img src={allImages[2]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-testid="img-gallery-2" />
                </div>
              )}
            </div>
            <div className="pt-12 space-y-4">
              {allImages[3] && (
                <div className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer group">
                  <img src={allImages[3]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-testid="img-gallery-3" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Removed Year Built Placeholder Section */}

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
                {(bedrooms !== null || bathrooms !== null) && (
                  <div>
                    <p className="text-sm font-black uppercase text-gray-500 mb-2">Unit Layout</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {bedrooms !== null ? `${bedrooms} Bed` : ''}
                      {bedrooms !== null && bathrooms !== null ? ' • ' : ''}
                      {bathrooms !== null ? `${bathrooms} Bath` : ''}
                    </p>
                  </div>
                )}
                {sqft && (
                  <div>
                    <p className="text-sm font-black uppercase text-gray-500 mb-2">Square Footage</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{(sqft as number).toLocaleString()} sq ft</p>
                  </div>
                )}
              </div>
              <div className="space-y-6">
                {(property as any).year_built && (
                  <div>
                    <p className="text-sm font-black uppercase text-gray-500 mb-2">Year Built</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{(property as any).year_built}</p>
                  </div>
                )}
                {property.pets_allowed !== null && (
                  <div>
                    <p className="text-sm font-black uppercase text-gray-500 mb-2">Pet Policy</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{property.pets_allowed ? 'Pets Welcome' : 'No Pets'}</p>
                  </div>
                )}
                {property.furnished !== null && (
                  <div>
                    <p className="text-sm font-black uppercase text-gray-500 mb-2">Furnished</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{property.furnished ? 'Yes' : 'Unfurnished'}</p>
                  </div>
                )}
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
              </div>
              <div className="space-y-4">
                <div className="p-6 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-black uppercase text-gray-500 mb-2">Listing Status</p>
                  <p className="text-2xl font-black text-orange-600 uppercase">{property.status || 'Active'}</p>
                </div>
              </div>
            </div>
          )}
        </section>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-8 md:p-12 space-y-8">
            <div className="flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-600" />
              <h2 className="text-4xl font-black text-gray-900 dark:text-white">Estimated Costs</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 mb-3">Monthly Rent</p>
                <p className="text-3xl font-black text-blue-600">{formatPrice(monthlyPayment)}</p>
              </div>
              <div>
                <p className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 mb-3">Annual Commitment</p>
                <p className="text-3xl font-black text-green-600">{formatPrice(monthlyPayment * 12)}</p>
              </div>
            </div>
          </Card>

        {/* Schools Section - Removed hardcoded placeholders */}
        {/* Price Trends - Removed hardcoded placeholders */}
        {/* Similar Properties - Removed hardcoded placeholders */}

        {/* Features Section */}
        {property.amenities && property.amenities.length > 0 && (
          <section className="space-y-12">
            <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Lifestyle Features</Badge>
            <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">Premium Amenities</h2>
            <AmenitiesGrid amenities={property.amenities} />
          </section>
        )}

        {/* Neighborhood Map */}
        {(lat !== 0 || lng !== 0) && (
          <section className="space-y-12">
            <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">Neighborhood</Badge>
            <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">Explore the Area</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
              <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl">
                <InteractiveMap center={[lat, lng]} title={property.title} address={`${property.address}, ${property.city}`} />
              </div>
              <div className="space-y-4 overflow-y-auto pr-3 custom-scrollbar">
                <NearbyPlaces places={nearbyPlaces} />
              </div>
            </div>
          </section>
        )}

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

      {/* Zillow-Style Gallery Modal */}
      {showFullGallery && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
          {/* Header Bar */}
          <div className="flex justify-between items-center px-8 py-4 bg-black/80 backdrop-blur-md border-b border-gray-800">
            <div className="flex items-center gap-4">
              <p className="text-white font-bold text-lg">{currentImageIndex + 1} of {allImages.length}</p>
              <span className="text-gray-400">•</span>
              <p className="text-gray-300 font-medium">{property.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-lg" data-testid="button-share-gallery">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-lg" onClick={() => setShowFullGallery(false)} data-testid="button-close-gallery">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Main Gallery Area */}
          <div className="flex-1 flex gap-4 overflow-hidden p-4">
            {/* Left Info Panel - Zillow Style */}
            <div className="w-80 flex-shrink-0 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white">{property.title}</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-300 text-sm">{property.address}</p>
                      <p className="text-gray-300 text-sm">{property.city}, {property.state || 'CA'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="bg-blue-600 rounded-lg p-4">
                  <p className="text-gray-200 text-xs font-bold uppercase mb-1">Monthly Rent</p>
                  <p className="text-white text-3xl font-black">{formatPrice(property.price)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Beds</p>
                    <p className="text-white text-2xl font-black">{bedrooms}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Baths</p>
                    <p className="text-white text-2xl font-black">{bathrooms}</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Square Feet</p>
                  <p className="text-white text-xl font-black">{sqft.toLocaleString()} ft²</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg h-12" data-testid="button-apply-from-gallery">
                  Apply Now
                </Button>
              </div>

              <div className="text-gray-400 text-xs text-center pt-4 border-t border-white/10">
                <p>Use arrow keys to navigate</p>
              </div>
            </div>

            {/* Main Image Viewer - Zillow Style */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Large Image */}
              <div className="flex-1 rounded-xl overflow-hidden bg-black relative group">
                <img 
                  src={allImages[currentImageIndex]} 
                  className="w-full h-full object-cover transition-transform duration-300"
                  alt={`Gallery ${currentImageIndex + 1}`} 
                  data-testid="gallery-main-image"
                />

                {/* Navigation Arrows - Zillow Style */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" 
                  onClick={() => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length)} 
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-14 w-14 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" 
                  onClick={() => setCurrentImageIndex(prev => (prev + 1) % allImages.length)} 
                  data-testid="button-next-image"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>

                {/* Image Counter Badge */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-bold">
                  {currentImageIndex + 1}/{allImages.length}
                </div>
              </div>

              {/* Thumbnail Strip - Zillow Style */}
              <div className="h-32 bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                <div className="flex h-full gap-2 overflow-x-auto p-2 scroll-smooth">
                  {allImages.map((img, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentImageIndex(i)}
                      className={`flex-shrink-0 h-28 w-40 rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:border-blue-400 ${
                        i === currentImageIndex 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/50 ring-2 ring-blue-500' 
                          : 'border-gray-700 opacity-70 hover:opacity-100'
                      }`}
                      data-testid={`thumbnail-${i}`}
                    >
                      <img 
                        src={img} 
                        className="w-full h-full object-cover" 
                        alt={`Thumbnail ${i + 1}`} 
                      />
                      {i === 14 && allImages.length > 15 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                          +{allImages.length - 15}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
