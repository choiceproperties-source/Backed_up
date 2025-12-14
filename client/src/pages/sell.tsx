import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Home, DollarSign, FileText, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { updateMetaTags } from "@/lib/seo";

const AMENITIES = [
  { id: 'parking', label: 'Parking' },
  { id: 'gym', label: 'Gym' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'balcony', label: 'Balcony/Patio' },
  { id: 'washer', label: 'Washer/Dryer' },
  { id: 'ac', label: 'Air Conditioning' },
  { id: 'heating', label: 'Heating' },
  { id: 'dishwasher', label: 'Dishwasher' },
  { id: 'storage', label: 'Storage' },
  { id: 'security', label: '24/7 Security' },
];

const LEASE_TERMS = ['3 months', '6 months', '12 months', 'Flexible'];

export default function Sell() {
  useEffect(() => {
    updateMetaTags({
      title: "List Your Property - Choice Properties",
      description: "List your property for rent or sale with Choice Properties. Reach qualified tenants and buyers in minutes.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/sell"
    });
  }, []);

  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    propertyType: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    yearBuilt: '',
    askingPrice: '',
    description: '',
    amenities: [] as string[],
    furnished: false,
    petsAllowed: false,
    leaseTerm: '',
    utilitiesIncluded: [] as string[],
    moveInDate: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const createPropertyMutation = useMutation({
    mutationFn: async () => {
      // Build enhanced description with lease and utilities info
      let enhancedDescription = formData.description;
      
      const leaseInfo = [];
      if (formData.leaseTerm) leaseInfo.push(`Lease Term: ${formData.leaseTerm}`);
      if (formData.moveInDate) leaseInfo.push(`Move-In Date: ${formData.moveInDate}`);
      if (formData.utilitiesIncluded.length > 0) {
        leaseInfo.push(`Utilities Included: ${formData.utilitiesIncluded.join(', ')}`);
      }
      
      if (leaseInfo.length > 0) {
        enhancedDescription = enhancedDescription 
          ? `${formData.description}\n\n${leaseInfo.join('\n')}`
          : leaseInfo.join('\n');
      }

      const response = await apiRequest("POST", "/api/properties", {
        title: `${formData.propertyType} at ${formData.address}`,
        description: enhancedDescription,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zip,
        price: formData.askingPrice ? parseFloat(formData.askingPrice) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        squareFeet: formData.sqft ? parseInt(formData.sqft) : null,
        propertyType: formData.propertyType,
        amenities: formData.amenities,
        furnished: formData.furnished,
        petsAllowed: formData.petsAllowed,
        leaseTerm: formData.leaseTerm,
        utilitiesIncluded: formData.utilitiesIncluded,
        status: 'active',
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsSubmitted(true);
      toast({
        title: "Success",
        description: "Your property has been listed!",
      });
    },
    onError: (err: any) => {
      setFieldErrors({ submit: err.message || "Failed to create listing" });
      toast({
        title: "Error",
        description: err.message || "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'bedrooms':
        if (value && (parseInt(value) < 0 || parseInt(value) > 20)) return 'Must be between 0-20';
        break;
      case 'bathrooms':
        if (value && (parseFloat(value) < 0 || parseFloat(value) > 20)) return 'Must be between 0-20';
        break;
      case 'sqft':
        if (value && (parseInt(value) < 100 || parseInt(value) > 50000)) return 'Must be between 100-50,000 sqft';
        break;
      case 'askingPrice':
        if (value && (parseFloat(value) < 100 || parseFloat(value) > 50000000)) return 'Must be between $100-$50M';
        break;
      case 'zip':
        if (value && !/^\d{5}(-\d{4})?$/.test(value)) return 'Invalid zip code format';
        break;
    }
    return '';
  };

  const handleFieldBlur = (e: any) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setFieldErrors({ ...fieldErrors, [name]: error });
    }
  };

  const handleAmenityChange = (amenityId: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.includes(amenityId)
        ? formData.amenities.filter(id => id !== amenityId)
        : [...formData.amenities, amenityId]
    });
  };

  const handleUtilityChange = (utility: string) => {
    setFormData({
      ...formData,
      utilitiesIncluded: formData.utilitiesIncluded.includes(utility)
        ? formData.utilitiesIncluded.filter(u => u !== utility)
        : [...formData.utilitiesIncluded, utility]
    });
  };

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.propertyType) errors.propertyType = 'Property type is required';
      if (!formData.bedrooms) errors.bedrooms = 'Bedrooms is required';
      if (!formData.bathrooms) errors.bathrooms = 'Bathrooms is required';
      const bdError = validateField('bedrooms', formData.bedrooms);
      const baError = validateField('bathrooms', formData.bathrooms);
      if (bdError) errors.bedrooms = bdError;
      if (baError) errors.bathrooms = baError;
    } else if (currentStep === 2) {
      if (!formData.address) errors.address = 'Address is required';
      if (!formData.city) errors.city = 'City is required';
      if (!formData.state) errors.state = 'State is required';
      if (!formData.zip) errors.zip = 'Zip code is required';
      const zipError = validateField('zip', formData.zip);
      if (zipError) errors.zip = zipError;
    } else if (currentStep === 3) {
      if (!formData.askingPrice) errors.askingPrice = 'Asking price is required';
      const priceError = validateField('askingPrice', formData.askingPrice);
      if (priceError) errors.askingPrice = priceError;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (validateStep(step)) {
      createPropertyMutation.mutate();
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20">
          <Card className="max-w-2xl w-full border-t-4 border-t-green-500 shadow-2xl">
            <CardContent className="p-10">
              <div className="text-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h2 className="text-3xl font-bold text-primary mb-4">Listing Submitted!</h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Your property listing has been submitted. Our team will review it and contact you within 24 hours to activate your listing.
                </p>
                <Button onClick={() => window.location.href = '/'} className="bg-primary">
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Home className="h-8 w-8" />
            List Your Property
          </h1>
          <p className="text-white/90">Sell or rent your property to thousands of buyers and renters</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* Step Indicator */}
          <div className="mb-12 flex gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                <p className="text-xs font-semibold mt-2">{s === 1 ? 'Property Type' : s === 2 ? 'Details' : 'Pricing'}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {fieldErrors.submit && (
              <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                <CardContent className="p-4 flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100">Error</p>
                    <p className="text-red-800 dark:text-red-200 text-sm">{fieldErrors.submit}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Step 1: Property Type */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>Tell us about your property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="font-semibold mb-2 block">Property Type</label>
                    <select 
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg bg-background dark:border-gray-700"
                      required
                    >
                      <option value="">Select type...</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="condo">Condo</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold mb-2 block">Bedrooms {fieldErrors.bedrooms && <span className="text-red-600 dark:text-red-400">*</span>}</label>
                      <Input type="number" min="0" max="20" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} onBlur={handleFieldBlur} required />
                      {fieldErrors.bedrooms && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.bedrooms}</p>}
                    </div>
                    <div>
                      <label className="font-semibold mb-2 block">Bathrooms {fieldErrors.bathrooms && <span className="text-red-600 dark:text-red-400">*</span>}</label>
                      <Input type="number" min="0" max="20" step="0.5" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} onBlur={handleFieldBlur} required />
                      {fieldErrors.bathrooms && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.bathrooms}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Property Features</h3>
                    <div className="flex items-center gap-3">
                      <Checkbox id="furnished" checked={formData.furnished} onCheckedChange={(checked) => setFormData({...formData, furnished: checked as boolean})} data-testid="checkbox-furnished" />
                      <label htmlFor="furnished" className="text-sm cursor-pointer">Furnished</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="pets" checked={formData.petsAllowed} onCheckedChange={(checked) => setFormData({...formData, petsAllowed: checked as boolean})} data-testid="checkbox-pets" />
                      <label htmlFor="pets" className="text-sm cursor-pointer">Pets Allowed</label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                  <CardDescription>Where is your property located?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input placeholder="Street Address" name="address" value={formData.address} onChange={handleInputChange} required />
                    {fieldErrors.address && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input placeholder="City" name="city" value={formData.city} onChange={handleInputChange} required />
                      {fieldErrors.city && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.city}</p>}
                    </div>
                    <div>
                      <Input placeholder="State" name="state" value={formData.state} onChange={handleInputChange} required />
                      {fieldErrors.state && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.state}</p>}
                    </div>
                  </div>
                  <div>
                    <Input placeholder="Zip Code (12345 or 12345-6789)" name="zip" value={formData.zip} onChange={handleInputChange} onBlur={handleFieldBlur} required />
                    {fieldErrors.zip && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.zip}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing & Description
                  </CardTitle>
                  <CardDescription>Set your listing price and details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="font-semibold mb-2 block">Asking Price ($) {fieldErrors.askingPrice && <span className="text-red-600 dark:text-red-400">*</span>}</label>
                    <Input type="number" min="100" name="askingPrice" value={formData.askingPrice} onChange={handleInputChange} onBlur={handleFieldBlur} placeholder="500000" required />
                    {fieldErrors.askingPrice && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.askingPrice}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input type="number" min="100" max="50000" placeholder="Square Footage" name="sqft" value={formData.sqft} onChange={handleInputChange} onBlur={handleFieldBlur} />
                      {fieldErrors.sqft && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.sqft}</p>}
                    </div>
                    <Input type="number" min="1800" max="2100" placeholder="Year Built" name="yearBuilt" value={formData.yearBuilt} onChange={handleInputChange} />
                  </div>

                  <div>
                    <label className="font-semibold mb-3 block">Amenities</label>
                    <div className="grid grid-cols-2 gap-3">
                      {AMENITIES.map(amenity => (
                        <div key={amenity.id} className="flex items-center gap-2">
                          <Checkbox 
                            id={amenity.id} 
                            checked={formData.amenities.includes(amenity.id)}
                            onCheckedChange={() => handleAmenityChange(amenity.id)}
                            data-testid={`checkbox-amenity-${amenity.id}`}
                          />
                          <label htmlFor={amenity.id} className="text-sm cursor-pointer">{amenity.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold mb-2 block">Lease Term</label>
                      <select 
                        name="leaseTerm"
                        value={formData.leaseTerm}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border rounded-lg bg-background dark:border-gray-700"
                      >
                        <option value="">Select term...</option>
                        {LEASE_TERMS.map(term => (
                          <option key={term} value={term}>{term}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold mb-2 block">Move-In Date</label>
                      <Input type="date" name="moveInDate" value={formData.moveInDate} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold mb-3 block">Utilities Included</label>
                    <div className="space-y-2">
                      {['Water', 'Electricity', 'Gas', 'Internet', 'Trash'].map(utility => (
                        <div key={utility} className="flex items-center gap-2">
                          <Checkbox 
                            id={`util-${utility}`}
                            checked={formData.utilitiesIncluded.includes(utility)}
                            onCheckedChange={() => handleUtilityChange(utility)}
                            data-testid={`checkbox-utility-${utility.toLowerCase()}`}
                          />
                          <label htmlFor={`util-${utility}`} className="text-sm cursor-pointer">{utility}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold mb-2 block">Description</label>
                    <Textarea placeholder="Describe your property, any special features, recent renovations, etc..." name="description" value={formData.description} onChange={handleInputChange} rows={4} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1 || createPropertyMutation.isPending}
              >
                Previous
              </Button>
              {step < 3 ? (
                <Button 
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={createPropertyMutation.isPending}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-primary"
                  disabled={createPropertyMutation.isPending}
                  data-testid="button-submit-listing"
                >
                  {createPropertyMutation.isPending ? "Submitting..." : "Submit Listing"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
