import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Download, Share2, Save, CheckCircle } from 'lucide-react';

interface RequirementData {
  id: string;
  timestamp: string;
  // Contact Info
  name: string;
  email: string;
  phone: string;
  // Budget
  minBudget: number;
  maxBudget: number;
  // Property Preferences
  bedrooms: string;
  bathrooms: string;
  propertyTypes: string[];
  // Location
  locations: string;
  // Amenities
  amenities: string[];
  // Pet Info
  hasPets: boolean;
  petDetails: string;
  // Other
  furnished: string;
  leaseLength: string;
  moveInDate: string;
  additionalNotes: string;
}

export default function PropertyRequirements() {
  const [formData, setFormData] = useState<RequirementData>({
    id: `req_${Date.now()}`,
    timestamp: new Date().toISOString(),
    name: '',
    email: '',
    phone: '',
    minBudget: 500,
    maxBudget: 3000,
    bedrooms: '2',
    bathrooms: '1',
    propertyTypes: [],
    locations: '',
    amenities: [],
    hasPets: false,
    petDetails: '',
    furnished: 'any',
    leaseLength: '12',
    moveInDate: '',
    additionalNotes: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const propertyTypeOptions = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio'];
  const amenityOptions = ['Pool', 'Gym', 'Parking', 'Washer/Dryer', 'AC', 'Dishwasher', 'Balcony/Patio', 'Fireplace', 'Furnished', 'Pet-Friendly'];
  const leaseLengthOptions = ['3', '6', '12', '24', 'Flexible'];

  const handlePropertyTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter(t => t !== type)
        : [...prev.propertyTypes, type]
    }));
  };

  const handleAmenityChange = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in contact information');
      return;
    }

    // Save to localStorage
    const requirements = JSON.parse(localStorage.getItem('choiceProperties_requirements') || '[]');
    requirements.push(formData);
    localStorage.setItem('choiceProperties_requirements', JSON.stringify(requirements));

    setSubmitted(true);
    toast.success('Property requirements saved!');

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleDownload = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-requirements-${formData.name || 'client'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Downloaded as CSV!');
  };

  const handleShare = async () => {
    const text = `My Property Requirements:\n\nBudget: $${formData.minBudget} - $${formData.maxBudget}\nBedrooms: ${formData.bedrooms}\nBathrooms: ${formData.bathrooms}\nLocations: ${formData.locations}\nAmenities: ${formData.amenities.join(', ') || 'Any'}\n\nContact: ${formData.name} (${formData.email}, ${formData.phone})`;
    
    if (navigator.share) {
      await navigator.share({
        title: 'Property Requirements Form',
        text: text
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Requirements copied to clipboard!');
    }
  };

  const generateCSV = () => {
    const rows = [
      ['Property Requirements Form'],
      ['Submitted:', new Date(formData.timestamp).toLocaleString()],
      [],
      ['CONTACT INFORMATION'],
      ['Name', formData.name],
      ['Email', formData.email],
      ['Phone', formData.phone],
      [],
      ['BUDGET'],
      ['Minimum Monthly Rent', `$${formData.minBudget}`],
      ['Maximum Monthly Rent', `$${formData.maxBudget}`],
      [],
      ['PROPERTY PREFERENCES'],
      ['Bedrooms', formData.bedrooms],
      ['Bathrooms', formData.bathrooms],
      ['Property Types', formData.propertyTypes.join(', ') || 'Any'],
      ['Furnished', formData.furnished],
      [],
      ['LOCATION'],
      ['Preferred Locations', formData.locations],
      [],
      ['AMENITIES'],
      ['Required Amenities', formData.amenities.join(', ') || 'None specified'],
      [],
      ['PETS'],
      ['Has Pets', formData.hasPets ? 'Yes' : 'No'],
      ['Pet Details', formData.petDetails],
      [],
      ['LEASE TERMS'],
      ['Preferred Lease Length', `${formData.leaseLength} months`],
      ['Desired Move-in Date', formData.moveInDate || 'ASAP'],
      [],
      ['ADDITIONAL NOTES'],
      [formData.additionalNotes || 'None']
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Requirements Submitted!</h2>
              <p className="text-muted-foreground mb-6">Your property requirements have been saved and shared with agents on our platform.</p>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-foreground mb-3">What Happens Next:</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> Our agents will review your requirements</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> You'll receive personalized property matches</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> Agents will contact you at {formData.email}</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> Schedule property viewings at your convenience</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button onClick={handleDownload} className="w-full bg-secondary hover:bg-secondary/90 gap-2" variant="outline">
                  <Download className="h-4 w-4" />
                  Download Form as CSV
                </Button>
                <Button onClick={handleShare} className="w-full gap-2" variant="outline">
                  <Share2 className="h-4 w-4" />
                  Share Your Requirements
                </Button>
                <Button onClick={() => window.location.href = '/'} className="w-full bg-primary hover:bg-primary/90">
                  Back to Home
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Form ID: {formData.id}
              </p>
            </Card>
          </div>
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
          <h1 className="text-4xl font-bold mb-2">Find Your Perfect Property</h1>
          <p className="text-white/90">Tell us what you're looking for and we'll match you with the perfect home</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Full Name *</label>
                <Input
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">Email *</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">Phone *</label>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Budget */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Budget</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Minimum Monthly Rent: ${formData.minBudget}</label>
                <input
                  type="range"
                  min="300"
                  max="5000"
                  step="100"
                  value={formData.minBudget}
                  onChange={(e) => setFormData({ ...formData, minBudget: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Maximum Monthly Rent: ${formData.maxBudget}</label>
                <input
                  type="range"
                  min="300"
                  max="5000"
                  step="100"
                  value={formData.maxBudget}
                  onChange={(e) => setFormData({ ...formData, maxBudget: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Property Preferences */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Property Preferences</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold block mb-2">Bedrooms</label>
                  <select
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-full px-3 py-2 border rounded bg-background dark:border-gray-700"
                  >
                    <option value="studio">Studio</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4">4+ Bedrooms</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-2">Bathrooms</label>
                  <select
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="w-full px-3 py-2 border rounded bg-background dark:border-gray-700"
                  >
                    <option value="1">1 Bathroom</option>
                    <option value="1.5">1.5 Bathrooms</option>
                    <option value="2">2 Bathrooms</option>
                    <option value="2.5">2.5 Bathrooms</option>
                    <option value="3">3+ Bathrooms</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-3">Property Type</label>
                <div className="space-y-2">
                  {propertyTypeOptions.map(type => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.propertyTypes.includes(type)}
                        onCheckedChange={() => handlePropertyTypeChange(type)}
                      />
                      <label className="text-sm cursor-pointer">{type}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2">Furnished?</label>
                <select
                  value={formData.furnished}
                  onChange={(e) => setFormData({ ...formData, furnished: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="any">Any</option>
                  <option value="furnished">Furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Location */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Location</h2>
            <div>
              <label className="text-sm font-semibold block mb-2">Preferred Locations/Areas</label>
              <Textarea
                placeholder="e.g., Downtown, Near subway, Close to work at 123 Main St, Quiet neighborhood"
                value={formData.locations}
                onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                className="h-20"
              />
            </div>
          </Card>

          {/* Amenities */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Desired Amenities</h2>
            <div className="grid grid-cols-2 gap-3">
              {amenityOptions.map(amenity => (
                <div key={amenity} className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.amenities.includes(amenity)}
                    onCheckedChange={() => handleAmenityChange(amenity)}
                  />
                  <label className="text-sm cursor-pointer">{amenity}</label>
                </div>
              ))}
            </div>
          </Card>

          {/* Pets */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Pets</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hasPets}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasPets: checked as boolean })}
                />
                <label className="text-sm font-semibold cursor-pointer">I have pets</label>
              </div>
              {formData.hasPets && (
                <div>
                  <label className="text-sm font-semibold block mb-2">Pet Details</label>
                  <Textarea
                    placeholder="e.g., 1 dog (50 lbs), hypoallergenic breed"
                    value={formData.petDetails}
                    onChange={(e) => setFormData({ ...formData, petDetails: e.target.value })}
                    className="h-16"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Lease Terms */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Lease Terms</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Preferred Lease Length</label>
                <div className="space-y-2">
                  {leaseLengthOptions.map(length => (
                    <div key={length} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`lease-${length}`}
                        name="leaseLength"
                        value={length}
                        checked={formData.leaseLength === length}
                        onChange={(e) => setFormData({ ...formData, leaseLength: e.target.value })}
                      />
                      <label htmlFor={`lease-${length}`} className="text-sm cursor-pointer">
                        {length === 'Flexible' ? 'Flexible' : `${length} months`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2">Desired Move-in Date</label>
                <Input
                  type="date"
                  value={formData.moveInDate}
                  onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Additional Notes */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">Additional Information</h2>
            <div>
              <label className="text-sm font-semibold block mb-2">Anything else you'd like us to know?</label>
              <Textarea
                placeholder="e.g., Looking to move with a roommate, Need high-speed internet, Working from home..."
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                className="h-24"
              />
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 h-12 text-lg font-bold gap-2"
            >
              <Save className="h-5 w-5" />
              Submit Requirements
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}
