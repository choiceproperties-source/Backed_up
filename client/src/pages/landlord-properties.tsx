import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useOwnedProperties } from '@/hooks/use-owned-properties';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Home,
  Plus,
  Trash2,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Loader2,
  ArrowLeft,
  Edit2,
  X,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Validation schema
const propertyFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  bedrooms: z.number().min(0, 'Bedrooms must be positive'),
  bathrooms: z.number().min(0, 'Bathrooms must be positive'),
  squareFeet: z.number().min(0, 'Square feet must be positive').optional(),
  propertyType: z.string().optional(),
  description: z.string().optional(),
  furnished: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  leaseTerm: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  amenities: z.array(z.string()).default([]),
  utilitiesIncluded: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const AMENITIES = [
  'Air Conditioning',
  'Washer/Dryer',
  'Dishwasher',
  'Pool',
  'Gym',
  'Parking',
  'Garden',
  'Balcony',
];

const UTILITIES = ['Water', 'Electricity', 'Gas', 'Internet', 'Trash'];

const PROPERTY_TYPES = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio', 'Other'];

const LEASE_TERMS = ['6 months', '12 months', '18 months', '24 months', 'Flexible'];

export default function LandlordProperties() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { properties, loading, createProperty, updateProperty, deleteProperty } =
    useOwnedProperties();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setValue,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      furnished: false,
      petsAllowed: false,
      status: 'active',
      amenities: [],
      utilitiesIncluded: [],
      images: [],
    },
  });

  const selectedAmenities = watch('amenities') || [];
  const selectedUtilities = watch('utilitiesIncluded') || [];
  const images = watch('images') || [];

  useEffect(() => {
    updateMetaTags({
      title: 'My Properties - Landlord Dashboard',
      description: 'Manage and edit your rental properties',
      image: 'https://choiceproperties.com/og-image.png',
      url: 'https://choiceproperties.com/landlord-properties',
    });
  }, []);

  if (!isLoggedIn || !user || (user.role !== 'landlord' && user.role !== 'admin')) {
    navigate('/login');
    return null;
  }

  const resetForm = () => {
    reset();
    setEditingId(null);
    setPreviewImages([]);
  };

  const handleEditProperty = (property: any) => {
    reset({
      title: property.title,
      address: property.address,
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zipCode || '',
      price: property.price || 0,
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      squareFeet: property.squareFeet || 0,
      propertyType: property.propertyType || '',
      description: property.description || '',
      furnished: property.furnished || false,
      petsAllowed: property.petsAllowed || false,
      leaseTerm: property.leaseTerm || '',
      status: property.status || 'active',
      amenities: property.amenities || [],
      utilitiesIncluded: property.utilitiesIncluded || [],
      images: property.images || [],
    });
    setPreviewImages(property.images || []);
    setEditingId(property.id);
    setShowNewPropertyForm(true);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      await deleteProperty(propertyId);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadingImage(true);
    const readers: Promise<string>[] = [];

    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        })
      );
    }

    Promise.all(readers).then((dataUrls) => {
      const currentImages = images || [];
      const newImages = [...currentImages, ...dataUrls].slice(0, 5);
      setValue('images', newImages);
      setPreviewImages(newImages);
      setUploadingImage(false);
      toast({
        title: 'Success',
        description: `${dataUrls.length} image(s) added`,
      });
    });
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setValue('images', newImages);
    setPreviewImages(newImages);
  };

  const toggleAmenity = (amenity: string) => {
    const current = selectedAmenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    setValue('amenities', updated);
  };

  const toggleUtility = (utility: string) => {
    const current = selectedUtilities || [];
    const updated = current.includes(utility)
      ? current.filter((u) => u !== utility)
      : [...current, utility];
    setValue('utilitiesIncluded', updated);
  };

  const onSubmit = async (data: PropertyFormData) => {
    try {
      if (editingId) {
        await updateProperty(editingId, data);
      } else {
        await createProperty(data);
      }
      resetForm();
      setShowNewPropertyForm(false);
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Button
            onClick={() => navigate('/landlord-dashboard')}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">My Properties</h1>
            <p className="text-blue-100 mt-2">Create, edit, and manage your rental properties</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 flex-1">
        {/* Add/Edit Form */}
        {!showNewPropertyForm ? (
          <Button
            onClick={() => {
              resetForm();
              setShowNewPropertyForm(true);
            }}
            className="mb-8 bg-blue-600 hover:bg-blue-700"
            data-testid="button-add-property"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Property
          </Button>
        ) : (
          <Card className="p-8 mb-8 border-l-4 border-blue-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {editingId ? 'Edit Property' : 'Add New Property'}
              </h2>
              <Button
                onClick={() => {
                  resetForm();
                  setShowNewPropertyForm(false);
                }}
                variant="ghost"
                size="icon"
                data-testid="button-close-form"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Property Title"
                      {...register('title')}
                      data-testid="input-property-title"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <Textarea
                    placeholder="Property Description"
                    rows={3}
                    {...register('description')}
                    data-testid="textarea-property-description"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Location</h3>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Street Address"
                      {...register('address')}
                      data-testid="input-property-address"
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input placeholder="City" {...register('city')} data-testid="input-property-city" />
                      {errors.city && (
                        <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Input placeholder="State" {...register('state')} data-testid="input-property-state" />
                      {errors.state && (
                        <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  <Input
                    placeholder="Zip Code"
                    {...register('zipCode')}
                    data-testid="input-property-zip"
                  />
                </div>
              </div>

              {/* Property Details */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Property Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Select onValueChange={(value) => setValue('propertyType', value)}>
                        <SelectTrigger data-testid="select-property-type">
                          <SelectValue placeholder="Property Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Select onValueChange={(value) => setValue('leaseTerm', value)}>
                        <SelectTrigger data-testid="select-lease-term">
                          <SelectValue placeholder="Lease Term" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEASE_TERMS.map((term) => (
                            <SelectItem key={term} value={term}>
                              {term}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Bedrooms</label>
                      <Input
                        type="number"
                        placeholder="0"
                        {...register('bedrooms', { valueAsNumber: true })}
                        data-testid="input-property-bedrooms"
                      />
                      {errors.bedrooms && (
                        <p className="text-sm text-destructive mt-1">{errors.bedrooms.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Bathrooms</label>
                      <Input
                        type="number"
                        placeholder="0"
                        step="0.5"
                        {...register('bathrooms', { valueAsNumber: true })}
                        data-testid="input-property-bathrooms"
                      />
                      {errors.bathrooms && (
                        <p className="text-sm text-destructive mt-1">{errors.bathrooms.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Sq Ft</label>
                      <Input
                        type="number"
                        placeholder="0"
                        {...register('squareFeet', { valueAsNumber: true })}
                        data-testid="input-property-sqft"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Monthly Price</label>
                      <Input
                        type="number"
                        placeholder="0"
                        {...register('price', { valueAsNumber: true })}
                        data-testid="input-property-price"
                      />
                      {errors.price && (
                        <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Amenities</h3>
                <div className="grid grid-cols-2 gap-4">
                  {AMENITIES.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={selectedAmenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                        data-testid={`checkbox-amenity-${amenity.replace(/\s+/g, '-').toLowerCase()}`}
                      />
                      <Label htmlFor={`amenity-${amenity}`} className="cursor-pointer">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Utilities */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Utilities Included</h3>
                <div className="grid grid-cols-2 gap-4">
                  {UTILITIES.map((utility) => (
                    <div key={utility} className="flex items-center space-x-2">
                      <Checkbox
                        id={`utility-${utility}`}
                        checked={selectedUtilities.includes(utility)}
                        onCheckedChange={() => toggleUtility(utility)}
                        data-testid={`checkbox-utility-${utility.replace(/\s+/g, '-').toLowerCase()}`}
                      />
                      <Label htmlFor={`utility-${utility}`} className="cursor-pointer">
                        {utility}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Features */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <Label htmlFor="furnished" className="cursor-pointer">
                      Furnished
                    </Label>
                    <Switch {...register('furnished')} data-testid="switch-furnished" />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <Label htmlFor="petsAllowed" className="cursor-pointer">
                      Pets Allowed
                    </Label>
                    <Switch {...register('petsAllowed')} data-testid="switch-pets-allowed" />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <Label htmlFor="status" className="cursor-pointer">
                      Active Listing
                    </Label>
                    <Select
                      onValueChange={(value) => setValue('status', value as 'active' | 'inactive')}
                    >
                      <SelectTrigger className="w-32" data-testid="select-property-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Images (up to 5)</h3>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage || images.length >= 5}
                      className="hidden"
                      id="image-input"
                    />
                    <label
                      htmlFor="image-input"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {uploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {images.length}/5 images
                      </span>
                    </label>
                  </div>

                  {previewImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-4">
                      {previewImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg overflow-hidden"
                          data-testid={`image-preview-${index}`}
                        >
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-destructive hover:bg-destructive/90 text-white p-1 rounded"
                            data-testid={`button-remove-image-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-property"
                >
                  {editingId ? 'Update' : 'Save'} Property
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowNewPropertyForm(false);
                  }}
                  variant="outline"
                  data-testid="button-cancel-property"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Properties List */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-foreground font-semibold">Loading properties...</p>
          </Card>
        ) : properties.length === 0 ? (
          <Card className="p-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-semibold">No properties yet</p>
            <p className="text-muted-foreground text-sm mt-2">
              Click "Add New Property" to create your first listing
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property: any) => (
              <Card
                key={property.id}
                className="overflow-hidden hover-elevate"
                data-testid={`card-property-${property.id}`}
              >
                {/* Image */}
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {property.images && property.images[0] ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Home className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        property.status === 'active'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}
                      data-testid={`badge-status-${property.id}`}
                    >
                      {property.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg text-foreground mb-2">{property.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {property.city}, {property.state}
                  </p>

                  <div className="flex gap-4 mb-4 text-sm text-foreground">
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4" /> {property.bedrooms} bed
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" /> {property.bathrooms} bath
                    </span>
                  </div>

                  {property.squareFeet && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {property.squareFeet.toLocaleString()} sq ft
                    </p>
                  )}

                  <p className="font-bold text-blue-600 dark:text-blue-400 text-lg mb-4 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {(property.price || 0).toLocaleString()}/mo
                  </p>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditProperty(property)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      data-testid={`button-edit-property-${property.id}`}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteProperty(property.id)}
                      size="sm"
                      variant="destructive"
                      data-testid={`button-delete-property-${property.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
