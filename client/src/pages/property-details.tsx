import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Property, Review, Owner } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  MapPin, Bed, Bath, Maximize, X, ChevronLeft, ChevronRight, Grid3X3, 
  Building2, Video, Heart, Shield, Clock, Eye, Star, Share2, Zap,
  Trees, Wifi, Lock, Home, DollarSign, Calculator, BookOpen, TrendingUp,
  Send, CheckCircle, AlertCircle
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader 
} from "@/components/ui/card";
import { useFavorites } from "@/hooks/use-favorites";
import { useNearbyPlaces } from "@/hooks/use-nearby-places";
import { AmenitiesGrid } from "@/components/amenities-grid";
import { InteractiveMap } from "@/components/interactive-map";
import { NearbyPlaces } from "@/components/nearby-places";
import { EnhancedTrustBadges } from "@/components/enhanced-trust-badges";
import { CostCalculator } from "@/components/cost-calculator";
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

// Main Gallery Component
const PropertyGallery = ({ images, onImageClick }: { images: string[], onImageClick: (index: number) => void }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[500px] mb-12">
      {/* Main Hero Image */}
      <div 
        className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-3xl cursor-zoom-in"
        onClick={() => onImageClick(0)}
      >
        <img 
          src={images[0]} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          alt="Main Property View"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        <div className="absolute bottom-6 left-6">
          <Badge className="bg-white/90 backdrop-blur-md text-black border-none px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl">
            Main Entrance
          </Badge>
        </div>
      </div>

      {/* Supporting Images */}
      {images.slice(1, 5).map((img, i) => (
        <div 
          key={i}
          className="relative group overflow-hidden rounded-3xl cursor-pointer"
          onClick={() => onImageClick(i + 1)}
        >
          <img 
            src={img} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={`Property view ${i + 2}`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
          
          {i === 3 && images.length > 5 && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition-all group-hover:bg-black/20">
              <Grid3X3 className="h-8 w-8 mb-2" />
              <p className="font-black text-xl">+{images.length - 5}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">View All</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
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
  const [inquiryForm, setInquiryForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  // Jump links navigation
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'amenities', label: 'Amenities' },
    { id: 'financials', label: 'Financials' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'location', label: 'Location' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Header offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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

  const displayImages = allImages.length > 0 ? allImages : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2000"]; 

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

      {/* Premium Gallery Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-8 pt-8">
        <PropertyGallery 
          images={allImages} 
          onImageClick={(index) => {
            setCurrentImageIndex(index);
            setShowFullGallery(true);
          }} 
        />
      </section>

      {/* Hero Info Section */}
      <section id="overview" className="bg-white dark:bg-gray-950 px-6 py-10 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
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
              {sqft ? (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{(sqft as number).toLocaleString()} sqft</span>
                </>
              ) : null}
              {property.year_built && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>Built in {property.year_built}</span>
                </>
              )}
            </div>
            
            {(property as any).school_district && (
              <p className="text-2xl text-gray-500 dark:text-gray-400 font-medium">
                {(property as any).school_district}
              </p>
            )}

            {/* Mortgage Calculator Section */}
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-900">
              <CostCalculator 
                monthlyRent={parseFloat(String(property.price))}
                petsAllowed={(property as any).pets_allowed}
                parkingIncluded={(property as any).parking_included}
              />
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-4 items-center pt-2 sticky top-10">
            <Button 
              size="icon" 
              variant="outline" 
              className={`h-24 w-24 rounded-3xl border-gray-200 dark:border-gray-800 transition-all shadow-sm ${isFavorited(property.id) ? 'text-red-600' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
              onClick={() => toggleFavorite(property.id)}
              data-testid="button-favorite"
            >
              <Heart className={`h-10 w-10 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
            </Button>
            
            <Card className="w-80 shadow-xl border-gray-100 dark:border-gray-800">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Inquiry</p>
                  <p className="text-lg font-bold">Contact Agent</p>
                </div>
                <div className="space-y-4">
                  <Input placeholder="Full Name" value={inquiryForm.name} onChange={e => setInquiryForm(prev => ({...prev, name: e.target.value}))} />
                  <Input placeholder="Email Address" value={inquiryForm.email} onChange={e => setInquiryForm(prev => ({...prev, email: e.target.value}))} />
                  <Input placeholder="Phone (Optional)" value={inquiryForm.phone} onChange={e => setInquiryForm(prev => ({...prev, phone: e.target.value}))} />
                  <Textarea placeholder="I'm interested in this property..." value={inquiryForm.message} onChange={e => setInquiryForm(prev => ({...prev, message: e.target.value}))} className="h-32" />
                  <Button className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={handleInquiry} disabled={submittingInquiry}>
                    {submittingInquiry ? "Sending..." : "Send Inquiry"}
                  </Button>
                  <Button variant="outline" className="w-full h-12 font-bold" onClick={() => window.location.href = `/apply/${property.id}`}>
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>

      {/* Full Gallery Modal / Lightbox */}
      {showFullGallery && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-6 text-white">
            <h3 className="text-xl font-bold">{property.title} - Gallery</h3>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-12 w-12 rounded-full" onClick={() => setShowFullGallery(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center p-4">
            <img 
              src={allImages[currentImageIndex]} 
              className="max-h-[85vh] max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-500"
              alt={`Property image ${currentImageIndex + 1}`}
            />
            
            <Button variant="ghost" size="icon" className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-16 w-16 rounded-full" onClick={(e) => {
              e.stopPropagation();
              setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
            }}>
              <ChevronLeft className="h-10 w-10" />
            </Button>
            <Button variant="ghost" size="icon" className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-16 w-16 rounded-full" onClick={(e) => {
              e.stopPropagation();
              setCurrentImageIndex(prev => (prev + 1) % allImages.length);
            }}>
              <ChevronRight className="h-10 w-10" />
            </Button>
          </div>

          <div className="p-8 flex gap-3 overflow-x-auto bg-black/50 backdrop-blur-md border-t border-white/10">
            {allImages.map((img, i) => (
              <button key={i} onClick={() => setCurrentImageIndex(i)} className={`h-24 w-36 flex-shrink-0 rounded-xl border-2 transition-all overflow-hidden ${i === currentImageIndex ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/50' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                <img src={img} className="w-full h-full object-cover" alt={`Gallery thumb ${i}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 p-4 md:hidden animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Price</p>
            <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{formatPrice(property.price)}</p>
          </div>
          <Button 
            className="flex-[2] h-14 rounded-2xl font-bold text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            onClick={() => window.location.href = `/apply/${property.id}`}
          >
            Apply Now
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Property Info & Details */}
          <div className="lg:col-span-2 space-y-16">
            
            {/* 1. Core Overview */}
            <section id="about" className="space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="w-fit rounded-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-[10px]">
                  Property Overview
                </Badge>
                <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                  {property.title}
                </h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                {property.description}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-4 border-t border-gray-100 dark:border-gray-900">
                {property.property_type ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Type</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{property.property_type}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Type</p>
                    <p className="text-lg font-bold text-gray-400 dark:text-gray-600 italic">Not available</p>
                  </div>
                )}
                {property.lease_term ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Lease Term</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{property.lease_term}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Lease Term</p>
                    <p className="text-lg font-bold text-gray-400 dark:text-gray-600 italic">Not available</p>
                  </div>
                )}
                {property.year_built && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Year Built</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{property.year_built}</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Secondary Images */}
            <section id="gallery" className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Property Gallery</h3>
              <div className="grid grid-cols-2 gap-4">
                {allImages[1] && (
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
                    <img src={allImages[1]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                {allImages[2] && (
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
                    <img src={allImages[2]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
              </div>
            </section>

            {/* 3. Amenities */}
            <section id="amenities" className="space-y-8 pt-8 border-t border-gray-100 dark:border-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Grid3X3 className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Amenities & Features</h3>
              </div>
              <AmenitiesGrid amenities={property.amenities as any || []} />
            </section>

            {/* 4. Location */}
            <section id="location" className="space-y-8 pt-8 border-t border-gray-100 dark:border-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Neighborhood & Map</h3>
              </div>
              <div className="rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-900 shadow-sm h-96 w-full">
                <InteractiveMap 
                  center={[lat, lng]} 
                  title={property.title} 
                  address={property.address}
                />
              </div>
              <NearbyPlaces places={nearbyPlaces} />
            </section>

            {/* 5. Reviews */}
            <section id="reviews" className="space-y-8 pt-8 border-t border-gray-100 dark:border-gray-900 pb-12">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Star className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Resident Reviews</h3>
                </div>
                {reviews.length > 0 && (
                  <Badge variant="secondary" className="font-bold">
                    {reviews.length} Total
                  </Badge>
                )}
              </div>
              
              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map((review) => (
                    <Card key={review.id} className="border-gray-100 dark:border-gray-800 shadow-none bg-gray-50/50 dark:bg-white/5">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < (review.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <p className="text-sm italic text-gray-600 dark:text-gray-400 font-medium">"{review.comment}"</p>
                        <div className="pt-2">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">Verified Resident</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            {format(new Date(review.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-3xl text-center">
                  <p className="text-gray-400 font-medium italic">Be the first to share your experience with this property.</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Sticky Pricing & Inquiry */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              
              {/* Financials Summary */}
              <Card id="financials" className="border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden rounded-3xl">
                <div className="bg-blue-600 p-6 text-white space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Monthly Investment</p>
                  <p className="text-4xl font-black tracking-tighter">{formatPrice(property.price)}</p>
                </div>
                <CardContent className="p-6 space-y-6 bg-white dark:bg-gray-950">
                  <div className="space-y-4">
                    <CostCalculator 
                      monthlyRent={parseFloat(String(property.price))}
                      petsAllowed={(property as any).pets_allowed}
                      parkingIncluded={(property as any).parking_included}
                    />
                  </div>
                  
                  <Separator className="bg-gray-100 dark:bg-gray-900" />
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Application Fee</span>
                      <span className="font-bold text-gray-900 dark:text-white">$45.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Security Deposit</span>
                      <span className="font-bold text-gray-900 dark:text-white">One Month's Rent</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button 
                      className="w-full h-14 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                      onClick={() => window.location.href = `/apply/${property.id}`}
                    >
                      Apply Securely
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={`w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 font-bold gap-2 ${isFavorited(property.id) ? 'text-red-600 border-red-100 bg-red-50/50' : ''}`}
                      onClick={() => toggleFavorite(property.id)}
                    >
                      <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
                      {isFavorited(property.id) ? 'Saved to Favorites' : 'Save for Later'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Inquiry Card */}
              <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Assistance</p>
                  <h4 className="text-lg font-bold">Contact Listing Team</h4>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  <div className="space-y-3">
                    <Input placeholder="Full Name" className="rounded-xl border-gray-100 dark:border-gray-800 h-11" value={inquiryForm.name} onChange={e => setInquiryForm(prev => ({...prev, name: e.target.value}))} />
                    <Input placeholder="Email Address" className="rounded-xl border-gray-100 dark:border-gray-800 h-11" value={inquiryForm.email} onChange={e => setInquiryForm(prev => ({...prev, email: e.target.value}))} />
                    <Textarea placeholder="How can we help you?" className="rounded-xl border-gray-100 dark:border-gray-800 resize-none h-24 text-sm" value={inquiryForm.message} onChange={e => setInquiryForm(prev => ({...prev, message: e.target.value}))} />
                  </div>
                  <Button 
                    variant="secondary" 
                    className="w-full h-12 rounded-xl font-bold border-gray-100 dark:border-gray-900" 
                    onClick={handleInquiry} 
                    disabled={submittingInquiry}
                  >
                    {submittingInquiry ? "Sending..." : "Submit Inquiry"}
                  </Button>
                </CardContent>
              </Card>

              <EnhancedTrustBadges />
            </div>
          </div>
        </div>
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
                  <p className="text-white text-xl font-black">{sqft ? sqft.toLocaleString() : 'N/A'} ft²</p>
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

      {/* Floating CTA Card for Desktop */}
      <div className="hidden lg:block fixed top-32 right-8 z-40 animate-in fade-in slide-in-from-right duration-500">
        <Card className="w-80 shadow-2xl border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Price</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{formatPrice(property.price)}</p>
              </div>
              <Badge variant="outline" className="mb-1">{property.status || 'Status unavailable'}</Badge>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.location.href = `/apply/${property.id}`}>
                Apply Now
              </Button>
              <Button size="icon" variant="outline" className={`h-12 w-12 rounded-xl ${isFavorited(property.id) ? 'text-red-600' : ''}`} onClick={() => toggleFavorite(property.id)}>
                <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
