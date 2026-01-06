import { useRoute, Link } from "wouter";
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
  MapPin, Bed, Bath, Maximize, X, ChevronLeft, ChevronRight,
  Heart, Share2, DollarSign, Home, Info, Ruler
} from "lucide-react";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { useFavorites } from "@/hooks/use-favorites";
import { InteractiveMap } from "@/components/interactive-map";
import { updateMetaTags, getPropertyStructuredData, addStructuredData, removeStructuredData } from "@/lib/seo";
import { PropertyDetailsSkeleton } from "@/components/property-details-skeleton";
import NotFound from "@/pages/not-found";
import { PhotoGallery } from "@/components/photo-gallery";

export default function PropertyDetails() {
  const [match, params] = useRoute("/property/:id");
  const id = params?.id;
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  // Data mapping for property fields using snake_case from DB schema
  const rentPerMonth = property?.price ? formatPrice(property.price) : null;
  const addressLine1 = property?.address || null;
  const addressLine2 = (property?.city || property?.state || property?.zip_code) 
    ? `${property.city || ""}${property.city && property.state ? ", " : ""}${property.state || ""} ${property.zip_code || ""}`.trim()
    : null;
  const propertyType = property?.property_type ? property.property_type.replace(/_/g, ' ') : null;
  const availabilityDate = property?.created_at ? new Date(property.created_at).toLocaleDateString() : null;
  
  const bedroomCount = property?.bedrooms ?? null;
  const bathroomCount = property?.bathrooms ? parseDecimal(property.bathrooms) : null;
  const squareFeet = property?.square_feet ? property.square_feet.toLocaleString() : null;
  const yearBuilt = property?.year_built || null;
  const pricePerSqft = (property?.price && property?.square_feet) 
    ? formatPrice(parseDecimal(property.price) / property.square_feet) 
    : null;

  const leaseTerms = property?.lease_term || null;
  const petPolicy = property?.pets_allowed !== undefined ? (property.pets_allowed ? "Pets Allowed" : "No Pets") : null;
  const utilitiesIncluded = Array.isArray(property?.utilities_included) && property.utilities_included.length > 0
    ? property.utilities_included.join(", ")
    : null;

  // Placeholder logic for fields not explicitly in schema but requested in structure
  const parkingInfo = null; // Map to correct field if added later
  const laundryInfo = null; // Map to correct field if added later

  const { data: photosData } = useQuery<any[]>({
    queryKey: ['/api/v2/images/property', id],
    enabled: !!id,
    select: (res: any) => res?.data ?? [],
  });

  useEffect(() => {
    if (property) {
      updateMetaTags({
        title: `${property.title} - Listing`,
        description: property.description || '',
        image: photosData?.[0]?.imageUrls?.gallery || (Array.isArray(property.images) ? property.images[0] : undefined),
        url: window.location.href,
        type: "property"
      });
      addStructuredData(getPropertyStructuredData(property), 'property');
    }
    return () => { removeStructuredData('property'); };
  }, [property, photosData]);

  const allImages = property && photosData && photosData.length > 0
    ? photosData.map(photo => photo.imageUrls.gallery)
    : property && Array.isArray(property.images) && property.images.length > 0 
      ? (property.images as string[])
      : [];

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

  const bathrooms = property.bathrooms ? parseDecimal(property.bathrooms) : 0;
  const lat = property.latitude ? parseFloat(String(property.latitude)) : 0;
  const lng = property.longitude ? parseFloat(String(property.longitude)) : 0;
  const hasCoordinates = lat !== 0 && lng !== 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 py-6 w-full space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {addressLine1}
            </h1>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              {addressLine2}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className={`rounded-md font-bold ${isFavorited(property.id) ? 'text-red-600 bg-red-50 border-red-200' : ''}`}
              onClick={() => toggleFavorite(property.id)}
              data-testid="button-save-property"
            >
              <Heart className={`mr-2 h-4 w-4 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
              {isFavorited(property.id) ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" className="rounded-md font-bold" onClick={handleShare} data-testid="button-share-property">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Primary Gallery */}
        <PhotoGallery 
          images={allImages} 
          title={property.title}
          layout="grid"
        />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Property Info */}
          <div className="lg:col-span-2 space-y-10">
            {/* Core Pricing & Basic Info */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <div className="flex flex-col">
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white" data-testid="text-property-price">
                    {rentPerMonth}/month
                  </h2>
                  {utilitiesIncluded && (
                    <p className="text-sm text-green-600 font-semibold" data-testid="text-utilities-info">
                      Utilities: {utilitiesIncluded}
                    </p>
                  )}
                </div>
                <Badge className="bg-blue-600 text-white font-black px-4 py-1 rounded-sm uppercase text-[10px] tracking-widest">
                  {propertyType}
                </Badge>
              </div>
              <p className="text-gray-500 font-medium" data-testid="text-availability">
                Available: {availabilityDate || "Contact for date"}
              </p>
            </div>

            <Separator />

            {/* Quick Facts */}
            <section className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Quick Facts</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {bedroomCount !== null && (
                  <div className="flex flex-col" data-testid="fact-bedrooms">
                    <span className="text-gray-500 text-sm font-bold uppercase">Bedrooms</span>
                    <span className="text-xl font-black">{bedroomCount}</span>
                  </div>
                )}
                {bathroomCount !== null && (
                  <div className="flex flex-col" data-testid="fact-bathrooms">
                    <span className="text-gray-500 text-sm font-bold uppercase">Bathrooms</span>
                    <span className="text-xl font-black">{bathroomCount}</span>
                  </div>
                )}
                {squareFeet && (
                  <div className="flex flex-col" data-testid="fact-sqft">
                    <span className="text-gray-500 text-sm font-bold uppercase">SQFT</span>
                    <span className="text-xl font-black">{squareFeet}</span>
                  </div>
                )}
                {yearBuilt && (
                  <div className="flex flex-col" data-testid="fact-year-built">
                    <span className="text-gray-500 text-sm font-bold uppercase">Built In</span>
                    <span className="text-xl font-black">{yearBuilt}</span>
                  </div>
                )}
                {pricePerSqft && (
                  <div className="flex flex-col" data-testid="fact-price-sqft">
                    <span className="text-gray-500 text-sm font-bold uppercase">Per SQFT</span>
                    <span className="text-xl font-black">{pricePerSqft}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Description Section */}
            {property.description && (
              <section className="space-y-4">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Overview</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed whitespace-pre-wrap" data-testid="text-property-description">
                  {property.description}
                </p>
              </section>
            )}

            {/* Amenities Grid */}
            {Array.isArray(property.amenities) && property.amenities.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(property.amenities as any[]).map((amenity, i) => {
                    const name = typeof amenity === 'string' ? amenity : amenity.name;
                    const isIncluded = typeof amenity === 'object' ? amenity.included !== false : true;
                    return (
                      <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg" data-testid={`amenity-item-${i}`}>
                        <div className={`h-2 w-2 rounded-full ${isIncluded ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-gray-700 dark:text-gray-300 font-bold capitalize">{name.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Additional Details */}
            {(leaseTerms || petPolicy || parkingInfo || laundryInfo) && (
              <section className="space-y-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Additional Details</h3>
                <div className="space-y-4">
                  {leaseTerms && (
                    <div className="flex justify-between border-b pb-2" data-testid="detail-lease-terms">
                      <span className="text-gray-500 font-bold">Lease Terms</span>
                      <span className="font-black">{leaseTerms}</span>
                    </div>
                  )}
                  {petPolicy && (
                    <div className="flex justify-between border-b pb-2" data-testid="detail-pet-policy">
                      <span className="text-gray-500 font-bold">Pet Policy</span>
                      <span className="font-black">{petPolicy}</span>
                    </div>
                  )}
                  {parkingInfo && (
                    <div className="flex justify-between border-b pb-2" data-testid="detail-parking">
                      <span className="text-gray-500 font-bold">Parking</span>
                      <span className="font-black">{parkingInfo}</span>
                    </div>
                  )}
                  {laundryInfo && (
                    <div className="flex justify-between border-b pb-2" data-testid="detail-laundry">
                      <span className="text-gray-500 font-bold">Laundry</span>
                      <span className="font-black">{laundryInfo}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Location Map */}
            {hasCoordinates && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Location Highlights</h3>
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <MapPin className="h-4 w-4" />
                    <span>Map View</span>
                  </div>
                </div>
                <div className="h-[400px] rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-800">
                  <InteractiveMap 
                    center={[lat, lng]} 
                    title={property.title} 
                    address={property.address}
                  />
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Sticky Contact Form */}
          <div className="space-y-6">
            <div className="sticky top-24">
              <Card className="shadow-2xl border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="bg-blue-600 p-4 text-center">
                  <p className="text-white font-black uppercase tracking-widest text-xs">Request Info</p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <Input 
                      placeholder="Full Name" 
                      value={inquiryForm.name} 
                      onChange={e => setInquiryForm(prev => ({...prev, name: e.target.value}))} 
                      className="h-12 border-gray-200 focus:border-blue-500 rounded-lg"
                    />
                    <Input 
                      placeholder="Email Address" 
                      value={inquiryForm.email} 
                      onChange={e => setInquiryForm(prev => ({...prev, email: e.target.value}))} 
                      className="h-12 border-gray-200 focus:border-blue-500 rounded-lg"
                    />
                    <Input 
                      placeholder="Phone (Optional)" 
                      value={inquiryForm.phone} 
                      onChange={e => setInquiryForm(prev => ({...prev, phone: e.target.value}))} 
                      className="h-12 border-gray-200 focus:border-blue-500 rounded-lg"
                    />
                    <Textarea 
                      placeholder="I'm interested in this property..." 
                      value={inquiryForm.message} 
                      onChange={e => setInquiryForm(prev => ({...prev, message: e.target.value}))} 
                      className="h-32 border-gray-200 focus:border-blue-500 rounded-lg resize-none" 
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                      className="w-full h-14 font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/20 text-lg transition-all active:scale-[0.98]" 
                      onClick={handleInquiry} 
                      disabled={submittingInquiry}
                    >
                      {submittingInquiry ? "Sending..." : "Contact Agent"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-14 font-black border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-lg transition-all"
                      onClick={() => window.location.href = `/apply/${property.id}`}
                    >
                      Apply Now
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center font-medium uppercase tracking-tight">
                    By contacting, you agree to our terms of use.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
