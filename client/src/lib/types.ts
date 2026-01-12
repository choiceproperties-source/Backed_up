// Types aligned with database schema (snake_case to match Supabase responses)

export interface Owner {
  id: string;
  full_name: string | null;
  email: string | null;
  display_email: string | null;
  display_phone: string | null;
  phone: string | null;
  role: string | null;
  profile_image: string | null;
  bio: string | null;
  license_verified: boolean | null;
  created_at: string;
  updated_at: string | null;
}

export interface Review {
  id: string;
  property_id: string;
  user_id: string;
  rating: number | null;
  title: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  users?: {
    id: string;
    full_name: string | null;
    profile_image: string | null;
  };
}

export interface PropertyPhoto {
  id: string;
  category: string;
  isPrivate: boolean;
  imageUrls: {
    thumbnail: string;
    gallery: string;
    original: string;
  };
}

export interface Property {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  price: string | null; // decimal returns as string from Postgres
  bedrooms: number | null;
  bathrooms: string | null; // decimal returns as string from Postgres
  square_feet: number | null;
  property_type: string | null;
  amenities: string[] | null;
  images: string[] | null;
  propertyPhotos?: PropertyPhoto[];
  latitude: string | null;
  longitude: string | null;
  furnished: boolean | null;
  pets_allowed: boolean | null;
  lease_term: string | null;
  utilities_included: string[] | null;
  year_built: number | null;
  price_history: Array<{
    price: string;
    changedAt: string;
    changedBy?: string;
  }> | null;
  status: string | null;
  listing_status: string | null;
  visibility: string | null;
  expires_at: string | null;
  view_count: number | null;
  save_count: number | null;
  application_fee: string | null;
  available_from: string | null;
  rules_text: string | null;
  smoking_allowed: boolean | null;
  parking_available: boolean | null;
  security_deposit: string | null;
  lease_term_months: number | null;
  available_date: string | null;
  created_at: string;
  updated_at: string | null;
  owner?: Owner;
}

// Extended property with computed/joined fields for display
export interface PropertyWithOwner extends Property {
  owner?: Owner;
  reviews?: Review[];
  average_rating?: number;
}

// Legacy owner interface for properties.json data
export interface LegacyOwner {
  id: string;
  name: string;
  slug: string;
  profile_photo_url: string;
  email: string;
  phone?: string;
  verified: boolean;
  description: string;
  created_at: string;
}

// Legacy property interface for backwards compatibility with existing components
// Components should gradually migrate to use Property interface
export interface LegacyProperty {
  id: string;
  owner_id: string;
  owner?: LegacyOwner;
  title: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built?: number;
  description: string;
  features: string[];
  type: string;
  location: string;
  images: string[];
  featured: boolean;
  listing_type: 'rent' | 'buy' | 'sell';
  application_fee?: number;
  property_tax_annual?: number;
  hoa_fee_monthly?: number;
  status: 'available' | 'pending' | 'sold' | 'leased';
  pet_friendly?: boolean;
  furnished?: boolean;
  amenities?: string[];
  reviews?: Review[];
  average_rating?: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  profile_image: string | null;
  bio: string | null;
  location: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  total_sales: number | null;
  rating: string | null;
  review_count: number | null;
  license_number: string | null;
  license_verified: boolean | null;
  display_email: string | null;
  display_phone: string | null;
  created_at: string;
  updated_at: string | null;
  email_verified?: boolean;
  needs_role_selection?: boolean;
}

export type UserRole = 'renter' | 'buyer' | 'landlord' | 'property_manager' | 'agent' | 'admin' | 'super_admin' | 'tenant';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  renter: 'Renter',
  buyer: 'Buyer',
  landlord: 'Landlord',
  property_manager: 'Property Manager',
  agent: 'Real Estate Agent',
  admin: 'Administrator',
  super_admin: 'Super Admin',
  tenant: 'Tenant',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  renter: 'Looking to rent a property',
  buyer: 'Looking to buy a property',
  landlord: 'Individual property owner',
  property_manager: 'Manages multiple properties',
  agent: 'Licensed real estate agent',
  admin: 'System administrator',
  super_admin: 'Full platform access',
  tenant: 'Tenant of a property',
};

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserRole>;
  signup: (
    email: string,
    name: string,
    password: string,
    phone?: string,
    role?: UserRole,
    legalConsent?: {
      termsVersion: string;
      privacyVersion: string;
      acceptedTermsAt: string;
      acceptedPrivacyAt: string;
      acceptedIp: string;
    }
  ) => Promise<UserRole>;
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<void>;
  isLoggedIn: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  authRedirect: string | null;
  handlePostAuthRedirect: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuthRedirect: () => void;
}

// Application types aligned with database
export interface Application {
  id: string;
  property_id: string | null;
  user_id: string | null;
  last_saved_step: number | null;
  personal_info: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    currentAddress?: string;
    ssn?: string;
  } | null;
  employment: {
    employerName?: string;
    jobTitle?: string;
    monthlyIncome?: string;
    employmentDuration?: string;
  } | null;
  rental_history: Record<string, unknown> | null;
  references: {
    name?: string;
    phone?: string;
    relationship?: string;
  } | null;
  disclosures: {
    hasEvictions?: boolean;
    hasFelonies?: boolean;
    hasBankruptcies?: boolean;
    explanation?: string;
  } | null;
  pets: {
    hasPets?: boolean;
    details?: string;
  } | null;
  vehicles: {
    hasVehicles?: boolean;
    details?: string;
  } | null;
  status: string | null;
  application_fee: string | null;
  available_from: string | null;
  created_at: string;
  updated_at: string | null;
  properties?: Property;
}

// Favorite types aligned with database
export interface Favorite {
  id: string;
  user_id: string | null;
  property_id: string | null;
  created_at: string;
  properties?: Property;
}

// Inquiry types aligned with database
export interface Inquiry {
  id: string;
  agent_id: string | null;
  property_id: string | null;
  sender_name: string;
  sender_email: string;
  sender_phone: string | null;
  message: string | null;
  inquiry_type: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  properties?: Property;
}

// Requirement types aligned with database
export interface Requirement {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  budget_min: string | null;
  budget_max: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  property_type: string[] | null;
  locations: string[] | null;
  amenities: string[] | null;
  pets: Record<string, unknown> | null;
  lease_term: string | null;
  move_in_date: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

// Saved Search types (new)
export interface SavedSearch {
  id: string;
  user_id: string | null;
  name: string;
  filters: {
    price_min?: number;
    price_max?: number;
    bedrooms?: number;
    bathrooms?: number;
    city?: string;
    property_type?: string;
    pets_allowed?: boolean;
    furnished?: boolean;
  };
  created_at: string;
  updated_at: string | null;
}

// Newsletter Subscriber types (new)
export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
}

// Contact Message types (new)
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean | null;
  created_at: string;
}

// Helper function to convert decimal strings to numbers for display
export function parseDecimal(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return parseFloat(value);
}

// Helper function to format price for display
export function formatPrice(price: string | number | null | undefined): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
}
