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

// Main Gallery Component - Zillow Style
const PropertyGallery = ({ images, onImageClick }: { images: string[], onImageClick: (index: number) => void }) => {
  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[21/9] bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800">
        <div className="text-center space-y-2">
          <Home className="h-12 w-12 mx-auto text-gray-300" />
          <p className="text-gray-500 font-medium">Images coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer overflow-hidden rounded-xl shadow-lg border border-gray-100 dark:border-gray-800" onClick={() => onImageClick(0)}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[400px] md:h-[600px]">
        {/* Main Large Image */}
        <div className="md:col-span-2 md:row-span-2 relative overflow-hidden">
          <img 
            src={images[0]} 
            className="w-full h-full object-cover" 
            alt="Main Property View"
          />
        </div>

        {/* Supporting Thumbnails */}
        {images.slice(1, 5).map((img, i) => (
          <div key={i} className="relative hidden md:block overflow-hidden">
            <img 
              src={img} 
              className="w-full h-full object-cover" 
              alt={`Property view ${i + 2}`}
            />
            {i === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-lg">
                +{images.length - 5} photos
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 md:hidden">
        <Badge className="bg-white/90 text-black border-none px-3 py-1 font-bold text-xs shadow-md">
          1 / {images.length}
        </Badge>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        className="absolute bottom-6 left-6 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 font-bold border-none shadow-xl hidden md:flex"
      >
        <Maximize className="mr-2 h-4 w-4" />
        View Gallery
      </Button>
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
        {/* Zillow Header Style: Breadcrumbs and Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
          <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
            <Link href="/properties" className="hover:underline">Properties</Link>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="text-gray-500">{property.city}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className={`rounded-md font-bold ${isFavorited(property.id) ? 'text-red-600 bg-red-50 border-red-200' : ''}`}
              onClick={() => toggleFavorite(property.id)}
            >
              <Heart className={`mr-2 h-4 w-4 ${isFavorited(property.id) ? 'fill-current' : ''}`} />
              {isFavorited(property.id) ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" className="rounded-md font-bold" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Primary Gallery */}
        <PropertyGallery 
          images={allImages} 
          onImageClick={(index) => {
            setCurrentImageIndex(index);
            setShowFullGallery(true);
          }} 
        />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Property Info */}
          <div className="lg:col-span-2 space-y-10">
            {/* Core Listing Info */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">
                  {formatPrice(property.price)}
                  {property.status === 'available' && (
                    <span className="text-lg font-bold text-gray-400 ml-3 align-middle uppercase tracking-tighter">/mo</span>
                  )}
                </h1>
                <Badge className="bg-blue-600 text-white font-black px-4 py-1 rounded-sm uppercase text-[10px] tracking-widest">
                  {property.status === 'available' ? 'For Rent' : property.status?.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-white">{property.bedrooms || 0}</span>
                  <span className="text-gray-400 font-medium text-lg uppercase">bd</span>
                </div>
                <div className="flex items-center gap-2 border-l pl-6 border-gray-200 dark:border-gray-800">
                  <span className="text-gray-900 dark:text-white">{bathrooms}</span>
                  <span className="text-gray-400 font-medium text-lg uppercase">ba</span>
                </div>
                {property.square_feet && (
                  <div className="flex items-center gap-2 border-l pl-6 border-gray-200 dark:border-gray-800">
                    <span className="text-gray-900 dark:text-white">{property.square_feet.toLocaleString()}</span>
                    <span className="text-gray-400 font-medium text-lg uppercase">sqft</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {property.address}
                </p>
                <p className="text-xl font-medium text-gray-500 dark:text-gray-400">
                  {property.city}, {property.state} {property.zip_code}
                </p>
              </div>
            </div>

            <Separator />

            {/* Description Section */}
            {property.description && (
              <section className="space-y-4">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Overview</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </section>
            )}

            {/* Facts & Features Table */}
            <section className="space-y-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Facts & features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-lg">
                <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-900">
                  <span className="text-gray-500 font-bold flex items-center gap-2"><Home className="h-5 w-5" /> Type</span>
                  <span className="text-gray-900 dark:text-white font-black capitalize">{property.property_type?.replace('_', ' ')}</span>
                </div>
                {property.year_built && (
                  <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-900">
                    <span className="text-gray-500 font-bold flex items-center gap-2"><Info className="h-5 w-5" /> Year Built</span>
                    <span className="text-gray-900 dark:text-white font-black">{property.year_built}</span>
                  </div>
                )}
                {property.lease_term && (
                  <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-900">
                    <span className="text-gray-500 font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Lease Term</span>
                    <span className="text-gray-900 dark:text-white font-black">{property.lease_term}</span>
                  </div>
                )}
                {property.square_feet && (
                  <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-900">
                    <span className="text-gray-500 font-bold flex items-center gap-2"><Ruler className="h-5 w-5" /> Price / Sqft</span>
                    <span className="text-gray-900 dark:text-white font-black">{formatPrice(parseDecimal(property.price) / property.square_feet)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Amenities Grid */}
            {Array.isArray(property.amenities) && property.amenities.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(property.amenities as string[]).map((amenity, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-blue-600" />
                      <span className="text-gray-700 dark:text-gray-300 font-bold capitalize">{amenity.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Location Map */}
            {hasCoordinates && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white border-b-4 border-blue-600 w-fit pb-1">Location</h3>
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

      {/* Lightbox / Gallery Modal */}
      {showFullGallery && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-6 text-white border-b border-white/10">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight">{property.title}</h3>
              <p className="text-sm text-gray-400">Photo {currentImageIndex + 1} of {allImages.length}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10 rounded-full h-12 w-12" 
              onClick={() => setShowFullGallery(false)}
            >
              <X className="h-8 w-8" />
            </Button>
          </div>
          
          <div className="flex-1 relative flex items-center justify-center p-4">
            <img 
              src={allImages[currentImageIndex]} 
              className="max-h-[80vh] max-w-full object-contain select-none animate-in zoom-in-95 duration-500"
              alt={`Property image ${currentImageIndex + 1}`}
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-6 text-white hover:bg-white/20 h-16 w-16 rounded-full border border-white/20 backdrop-blur-md" 
              onClick={() => setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length)}
            >
              <ChevronLeft className="h-10 w-10" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-6 text-white hover:bg-white/20 h-16 w-16 rounded-full border border-white/20 backdrop-blur-md" 
              onClick={() => setCurrentImageIndex(prev => (prev + 1) % allImages.length)}
            >
              <ChevronRight className="h-10 w-10" />
            </Button>
          </div>

          <div className="p-8 flex gap-4 overflow-x-auto bg-black/50 border-t border-white/10 scrollbar-hide">
            {allImages.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentImageIndex(i)} 
                className={`h-24 w-40 flex-shrink-0 rounded-lg border-2 transition-all overflow-hidden ${i === currentImageIndex ? 'border-blue-500 scale-105 ring-4 ring-blue-500/20' : 'border-transparent opacity-40 hover:opacity-100'}`}
              >
                <img src={img} className="w-full h-full object-cover" alt={`Gallery thumb ${i}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
