import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Property, Owner } from "@/lib/types";
import { formatPrice, parseDecimal } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, Bed, Bath, Heart, Share2, 
  Home, Ruler, Calendar, Check, ExternalLink,
  MessageSquare, Phone, Mail, Info, TrendingUp, Eye, Bookmark,
  X, ChevronLeft, ChevronRight, CheckCircle2, Star, Building2, ArrowLeft,
  Shield, PawPrint, Ban
} from "lucide-react";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useFavorites } from "@/hooks/use-favorites";
import { InteractiveMap } from "@/components/interactive-map";
import { PostedBy } from "@/components/property/posted-by";
import { updateMetaTags, getPropertyStructuredData, addStructuredData, removeStructuredData } from "@/lib/seo";
import { PropertyDetailsSkeleton } from "@/components/property-details-skeleton";

/**
 * Extract allowlisted rules and filter empty/null values.
 * Strict integrity check: No Fair Housing or legal disclosures allowed as "rules".
 * Only owner-defined data is included.
 */
function getPropertyRules(property: any): Readonly<Record<string, any>> {
  if (!property) return Object.freeze({});

  const allowlist = [
    "pets_allowed",
    "smoking_allowed",
    "parking_available",
    "utilities_included",
    "laundry_type",
    "security_deposit",
    "lease_term_months",
    "available_date",
    "rules_text"
  ];

  const rules: Record<string, any> = {};

  for (const field of allowlist) {
    const value = property[field];

    // Filter out: null, empty strings, empty arrays, empty objects
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;

    rules[field] = value;
  }

  return Object.freeze(rules);
}

export default function PropertyDetails() {
  const [match, params] = useRoute("/property/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

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

  useEffect(() => {
    if (property) {
      const isOffMarket = property.listing_status === 'off_market' || property.status === 'off_market';
      
      const metaTitle = isOffMarket 
        ? `${property.title} – Off Market | Choice Properties`
        : `${property.title} - Listing`;
      
      const metaDescription = isOffMarket
        ? "This property is currently off market. View details, photos, and future availability on Choice Properties."
        : (property.description || '');

      updateMetaTags({
        title: metaTitle,
        description: metaDescription,
        image: Array.isArray(property.images) ? property.images[0] : undefined,
        url: window.location.href,
        type: "property"
      });
      
      const structuredData: any = getPropertyStructuredData(property);
      if (isOffMarket) {
        if (!structuredData.offers) {
          structuredData.offers = {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: property.price ? property.price.toString() : '0',
            availability: "https://schema.org/Discontinued"
          };
        } else {
          structuredData.offers.availability = "https://schema.org/Discontinued";
        }
      }
      
      addStructuredData(structuredData, 'property');
    }
    return () => { removeStructuredData('property'); };
  }, [property]);

  const allImages = property && Array.isArray(property.images) && property.images.length > 0 
    ? (property.images as string[])
    : [];

  const handleInquiry = async () => {
    if (!inquiryForm.name || !inquiryForm.email) {
      toast({ title: "Error", description: "Please fill in name and email", variant: "destructive" });
      return;
    }
    setSubmittingInquiry(true);
    try {
      await apiRequest("POST", `/api/v2/inquiries`, {
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  if (!match) return <div className="min-h-screen flex items-center justify-center">Property Not Found</div>;
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

  const ownerData = property.owner ? {
    ...property.owner,
    id: property.owner_id,
    full_name: property.owner.full_name || "Property Owner"
  } : undefined;

  const lat = property.latitude ? parseFloat(String(property.latitude)) : 0;
  const lng = property.longitude ? parseFloat(String(property.longitude)) : 0;
  const hasCoordinates = lat !== 0 && lng !== 0;

  const availableFromDate = property.available_from ? new Date(property.available_from) : null;
  const isFutureAvailable = availableFromDate && availableFromDate > new Date();
  const isOffMarket = property.listing_status === 'off_market' || property.status === 'off_market';
  const isComingSoon = !isOffMarket && isFutureAvailable;

  const availabilityText = isComingSoon 
    ? 'Coming Soon'
    : isOffMarket ? 'Off Market' : 'Available Now';
  
  const availabilitySubtext = isComingSoon && availableFromDate
    ? `Available ${availableFromDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : isOffMarket ? 'This property is not currently accepting applications.' : '';

  if (isOffMarket) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-[1440px] mx-auto pb-12">
          <section className="relative group bg-gray-100 dark:bg-gray-900 overflow-hidden md:h-[500px] lg:h-[600px] flex opacity-90 grayscale-[0.2]">
            {allImages.length > 0 ? (
              <div className="flex w-full h-full">
                <div className="w-full h-full relative">
                  <img 
                    src={allImages[0]} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                No photos available
              </div>
            )}
          </section>

          <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="p-8 rounded-xl border border-border/50 shadow-xl">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Listing Representative</p>
                      <Badge className="bg-zinc-800 text-white border-none font-bold py-1 px-3">
                        Off Market
                      </Badge>
                    </div>
                    <PostedBy owner={ownerData as any} poster={(property as any).poster} />
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-lg">
                    <MapPin className="h-5 w-5 mr-1 text-blue-600" />
                    {property.address}, {property.city}, {property.state} {property.zip_code}
                  </div>
                </Card>

                <section className="space-y-4">
                  <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Status</h3>
                  <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
                    <Info className="h-8 w-8 mx-auto mb-3 text-zinc-500" />
                    <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                      This property is not currently accepting applications.
                    </p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Overview</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed whitespace-pre-wrap">
                    {property.description || "No description provided"}
                  </p>
                </section>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto pb-12">
        <section className={`relative group bg-gray-100 dark:bg-gray-900 overflow-hidden md:h-[500px] lg:h-[600px] flex ${isOffMarket ? 'opacity-90 grayscale-[0.2]' : ''}`}>
          {allImages.length > 0 ? (
            <div className="flex w-full h-full gap-1">
              <div className={`w-full ${!isOffMarket ? 'md:w-2/3' : ''} h-full relative ${!isOffMarket ? 'cursor-pointer' : ''}`} onClick={() => !isOffMarket && setIsGalleryOpen(true)}>
                <img 
                  src={allImages[0]} 
                  alt={property.title}
                  className={`w-full h-full object-cover ${!isOffMarket ? 'transition-transform duration-500 hover:scale-105' : ''}`}
                />
                {!isOffMarket && (
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm font-medium">
                    {allImages.length} Photos
                  </div>
                )}
              </div>
              {!isOffMarket && (
                <div className="hidden md:flex md:w-1/3 flex-col gap-1">
                  {allImages.slice(1, 3).map((img, i) => (
                    <div key={i} className="h-1/2 relative cursor-pointer overflow-hidden" onClick={() => setIsGalleryOpen(true)}>
                      <img 
                        src={img} 
                        alt={`${property.title} view ${i + 2}`}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      {i === 1 && allImages.length > 3 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-lg">
                          +{allImages.length - 3} more
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
              No photos available
            </div>
          )}
        </section>

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="p-8 rounded-xl border border-border/50 shadow-xl">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Listing Representative</p>
                      <div className="flex items-center gap-2">
                        <Badge className={`${isOffMarket ? 'bg-zinc-800' : isComingSoon ? 'bg-amber-500' : 'bg-blue-600'} text-white border-none font-bold py-1 px-3`}>
                          {availabilityText}
                        </Badge>
                      </div>
                    </div>
                    <PostedBy owner={ownerData as any} poster={(property as any).poster} />
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-lg">
                    <MapPin className="h-5 w-5 mr-1 text-blue-600" />
                    {property.address}, {property.city}, {property.state} {property.zip_code}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      className={`rounded-full h-10 w-10 p-0 ${isFavorited(property.id) ? 'text-red-500 border-red-500 bg-red-50' : ''}`}
                      onClick={() => toggleFavorite(property.id)}
                    >
                      <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-full h-10 w-10 p-0"
                      onClick={handleShare}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>

                <div className="flex flex-wrap items-center gap-8 py-4 border-y border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      {property.price ? formatPrice(property.price) : "Contact Agent"}
                    </span>
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">/ Month</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold">{property.bedrooms ?? 0}</span>
                      <span className="text-xs text-gray-500 font-bold uppercase">Beds</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold">{property.bathrooms ? parseDecimal(property.bathrooms) : 0}</span>
                      <span className="text-xs text-gray-500 font-bold uppercase">Baths</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold">{property.square_feet?.toLocaleString() ?? "--"}</span>
                      <span className="text-xs text-gray-500 font-bold uppercase">Sq Ft</span>
                    </div>
                  </div>
                </div>

              <section className="space-y-4">
                <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Overview</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed whitespace-pre-wrap">
                  {property.description || "No description provided"}
                </p>
              </section>

              {/* Property Rules - Strict Integrity Enforcement */}
              {Object.keys(getPropertyRules(property)).length > 0 && (
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <Shield className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-black uppercase tracking-widest">Property Policies</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(property as any).pets_allowed !== null && (property as any).pets_allowed !== undefined && (
                      <Card className="bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 rounded-none p-4 hover-elevate transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-none shadow-sm">
                              <PawPrint className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest">Pet Policy</span>
                          </div>
                          <Badge variant={(property as any).pets_allowed ? "success" : "destructive"} className="rounded-none uppercase tracking-tighter text-[10px] font-black">
                            {(property as any).pets_allowed ? "Allowed" : "Not Allowed"}
                          </Badge>
                        </div>
                      </Card>
                    )}

                    {(property as any).smoking_allowed !== null && (property as any).smoking_allowed !== undefined && (
                      <Card className="bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 rounded-none p-4 hover-elevate transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-none shadow-sm">
                              <Ban className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest">Smoking Policy</span>
                          </div>
                          <Badge variant={(property as any).smoking_allowed ? "success" : "destructive"} className="rounded-none uppercase tracking-tighter text-[10px] font-black">
                            {(property as any).smoking_allowed ? "Allowed" : "No Smoking"}
                          </Badge>
                        </div>
                      </Card>
                    )}
                  </div>

                  {(property as any).rules_text && (
                    <div className="p-6 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-none">
                      <div className="flex items-center gap-2 mb-4">
                        <Info className="h-4 w-4 text-blue-600" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">Additional Rules</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {(property as any).rules_text}
                      </p>
                    </div>
                  )}
                </section>
              )}

              <section className="space-y-6">
                <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Facts & Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                  {property.property_type && (
                    <div className="flex items-start gap-3">
                      <Home className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Type</p>
                        <p className="font-bold">{property.property_type}</p>
                      </div>
                    </div>
                  )}
                  {property.year_built && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Built In</p>
                        <p className="font-bold">{property.year_built}</p>
                      </div>
                    </div>
                  )}
                  {property.lease_term_months && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Lease Duration</p>
                        <p className="font-bold">{property.lease_term_months} Months</p>
                      </div>
                    </div>
                  )}
                  {property.square_feet && (
                    <div className="flex items-start gap-3">
                      <Ruler className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Square Feet</p>
                        <p className="font-bold">{property.square_feet.toLocaleString()} sqft</p>
                      </div>
                    </div>
                  )}
                </div>

                {Array.isArray(property.utilities_included) && property.utilities_included.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold uppercase text-gray-500 tracking-wider">Utilities Included</p>
                    <div className="flex flex-wrap gap-2">
                      {property.utilities_included.map((util, i) => (
                        <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-none font-bold">
                          {util}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {Array.isArray(property.amenities) && property.amenities.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Amenities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Price & Trust</h3>
                  <div className="flex items-center gap-4">
                    {property.view_count !== undefined && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-bold">{property.view_count} views</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Application Fee</p>
                    <p className="text-xl font-bold">${property.application_fee || "45.00"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Available From</p>
                    <p className="text-xl font-bold">
                      {property.available_from 
                        ? new Date(property.available_from).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                        : "Available Now"}
                    </p>
                  </div>
                </div>
              </section>

              {hasCoordinates && (
                <section className="space-y-4">
                  <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Location</h3>
                  <div className="h-[400px] rounded-xl overflow-hidden shadow-inner border border-gray-100 dark:border-gray-800">
                    <InteractiveMap 
                      center={[lat, lng]} 
                      title={property.title} 
                      address={property.address}
                    />
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <div className="sticky top-24">
                <Card className="shadow-xl border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className={`${isOffMarket ? 'bg-zinc-800' : 'bg-blue-600'} p-4 text-center`}>
                    <p className="text-white font-bold uppercase tracking-widest text-xs">
                      {isOffMarket ? "Property Off Market" : "Interested? Contact Agent"}
                    </p>
                  </div>
                    <CardContent className="p-6 space-y-6">
                      <PostedBy owner={ownerData as any} poster={(property as any).poster} />
                    
                    {!isOffMarket && !isComingSoon ? (
                      <>
                        <div className="space-y-4">
                          <Input 
                            placeholder="Full Name" 
                            value={inquiryForm.name} 
                            onChange={e => setInquiryForm(prev => ({...prev, name: e.target.value}))} 
                            className="h-11 rounded-lg border-gray-200"
                          />
                          <Input 
                            placeholder="Email" 
                            value={inquiryForm.email} 
                            onChange={e => setInquiryForm(prev => ({...prev, email: e.target.value}))} 
                            className="h-11 rounded-lg border-gray-200"
                          />
                          <Textarea 
                            placeholder="I'm interested in this property..." 
                            value={inquiryForm.message} 
                            onChange={e => setInquiryForm(prev => ({...prev, message: e.target.value}))} 
                            className="h-32 rounded-lg border-gray-200 resize-none" 
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Button 
                            className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]" 
                            onClick={handleInquiry} 
                            disabled={submittingInquiry}
                          >
                            {submittingInquiry ? "Sending..." : "Contact Agent"}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full h-12 font-bold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            onClick={() => setLocation(`/apply/${property.id}`)}
                          >
                            Apply Now
                          </Button>
                        </div>
                      </>
                    ) : isComingSoon ? (
                      <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
                          <Calendar className="h-5 w-5 shrink-0" />
                          <p className="text-sm font-medium">
                            This property is coming soon. Applications will open on {availableFromDate?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}.
                          </p>
                        </div>
                        <Button 
                          className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]" 
                          onClick={handleInquiry} 
                          disabled={submittingInquiry}
                        >
                          {submittingInquiry ? "Sending..." : "Contact Agent"}
                        </Button>
                        <Button 
                          variant="outline"
                          className="w-full h-12 font-bold text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-not-allowed"
                          disabled
                        >
                          Applications opening {availableFromDate?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                          <Info className="h-5 w-5 shrink-0" />
                          <p className="text-sm font-medium">
                            This property is currently off market.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <span className="font-bold">{currentImageIndex + 1} / {allImages.length}</span>
            <button onClick={() => setIsGalleryOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center p-4">
            <img 
              src={allImages[currentImageIndex]} 
              alt={`${property.title} gallery ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {allImages.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1))}
                  className="absolute left-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button 
                  onClick={() => setCurrentImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
          </div>
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max mx-auto">
              {allImages.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentImageIndex(i)}
                  className={`h-16 w-24 rounded overflow-hidden border-2 transition-all ${currentImageIndex === i ? 'border-white' : 'border-transparent opacity-50'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
