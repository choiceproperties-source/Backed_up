import { useRoute } from "wouter";
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
  X, ChevronLeft, ChevronRight, CheckCircle2, Star, Building2, ArrowLeft
} from "lucide-react";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useFavorites } from "@/hooks/use-favorites";
import { InteractiveMap } from "@/components/interactive-map";
import { updateMetaTags, getPropertyStructuredData, addStructuredData, removeStructuredData } from "@/lib/seo";
import { PropertyDetailsSkeleton } from "@/components/property-details-skeleton";
import NotFound from "@/pages/not-found";

import { PostedBy } from "@/components/property/posted-by";

export default function PropertyDetails() {
  const [match, params] = useRoute("/property/:id");
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
      console.log("Fetched property info:", propertyInfo);
      return {
        property: propertyInfo,
        owner: propertyInfo?.poster || propertyInfo?.owner || null
      };
    },
  });

  const property = propertyData?.property;

  useEffect(() => {
    if (property) {
      updateMetaTags({
        title: `${property.title} - Listing`,
        description: property.description || '',
        image: Array.isArray(property.images) ? property.images[0] : undefined,
        url: window.location.href,
        type: "property"
      });
      addStructuredData(getPropertyStructuredData(property), 'property');
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

  const lat = property.latitude ? parseFloat(String(property.latitude)) : 0;
  const lng = property.longitude ? parseFloat(String(property.longitude)) : 0;
  const hasCoordinates = lat !== 0 && lng !== 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-[1440px] mx-auto pb-12">
        {/* Zillow Style Image Gallery */}
        <section className="relative group bg-gray-100 dark:bg-gray-900 overflow-hidden md:h-[500px] lg:h-[600px] flex">
          {allImages.length > 0 ? (
            <div className="flex w-full h-full gap-1">
              <div className="w-full md:w-2/3 h-full relative cursor-pointer overflow-hidden" onClick={() => setIsGalleryOpen(true)}>
                <img 
                  src={allImages[0]} 
                  alt={property.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm font-medium">
                  {allImages.length} Photos
                </div>
              </div>
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
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
              No photos available
            </div>
          )}
        </section>

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-8">
                <div className="flex flex-wrap items-center gap-8 py-4 border-y border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      {property.price ? formatPrice(property.price) : "Contact Agent"}
                    </span>
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">/ Month</span>
                  </div>
                  {property.application_fee && (
                    <div className="flex flex-col border-l border-gray-200 dark:border-gray-800 pl-8">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        ${property.application_fee}
                      </span>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">App Fee</span>
                    </div>
                  )}
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
                  <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none font-bold py-1 px-3">
                    {property.status === 'active' ? 'Available Now' : 'Off Market'}
                  </Badge>
                </div>

              {/* Overview Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold border-b-2 border-blue-600 w-fit pb-1">Overview</h3>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className={`rounded-full h-10 w-10 p-0 ${isFavorited(property.id) ? 'text-red-500 border-red-500 bg-red-50' : ''}`}
                      onClick={() => toggleFavorite(property.id)}
                      data-testid="button-save-property"
                    >
                      <Heart className={`h-5 w-5 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-full h-10 w-10 p-0"
                      onClick={handleShare}
                      data-testid="button-share-property"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-4">
                  <MapPin className="h-4 w-4 mr-1 text-blue-600" />
                  {property.address}, {property.city}, {property.state} {property.zip_code}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed whitespace-pre-wrap" data-testid="text-property-description">
                  {property.description || "No description provided"}
                </p>
              </section>

              {/* Facts & Features */}
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
                  {property.lease_term && (
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Lease Term</p>
                        <p className="font-bold">{property.lease_term}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Furnished</p>
                      <p className="font-bold">{property.furnished ? "Yes" : "No"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Pets Allowed</p>
                      <p className="font-bold">{property.pets_allowed ? "Yes" : "No"}</p>
                    </div>
                  </div>
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

              {/* Amenities Section */}
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

              {/* Price History & Trust Signals */}
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
                    {property.save_count !== undefined && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Bookmark className="h-4 w-4" />
                        <span className="text-xs font-bold">{property.save_count} saves</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Application Fee</p>
                    <p className="text-xl font-bold">${property.application_fee || "45.00"}</p>
                  </div>
                </div>

                {Array.isArray(property.price_history) && property.price_history.length > 0 ? (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> History Details
                    </p>
                    <div className="space-y-2">
                      {property.price_history.map((h, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            {new Date(h.changedAt).toLocaleDateString()}
                          </span>
                          <span className="font-bold">{formatPrice(h.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">No price history available for this listing.</p>
                )}
              </section>

              {/* Location Map */}
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

            {/* Right Column: Sticky Contact Card */}
            <div className="space-y-6">
              <div className="sticky top-24">
                <Card className="shadow-xl border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="bg-blue-600 p-4 text-center">
                    <p className="text-white font-bold uppercase tracking-widest text-xs">Interested? Contact Agent</p>
                  </div>
                    <CardContent className="p-6 space-y-6">
                      <PostedBy owner={propertyData?.owner as any} />
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
                        onClick={() => window.location.href = `/apply/${property.id}`}
                      >
                        Apply Now
                      </Button>
                    </div>
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
