import { useQuery } from '@tanstack/react-query';
import { useAuth, getAuthToken } from '@/lib/auth-context';

interface PropertyData {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  images?: string[];
  status?: string;
  property_type?: string;
  square_feet?: number;
}

interface ApplicationData {
  id: string;
  property_id?: string;
  user_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  property?: PropertyData;
  created_at?: string;
  updated_at?: string;
  step?: number;
  personal_info?: Record<string, unknown>;
  rental_history?: Record<string, unknown>;
  employment?: Record<string, unknown>;
}

interface FavoriteData {
  id: string;
  property_id: string;
  created_at: string;
  property?: PropertyData;
}

interface SavedSearchData {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

interface ReviewData {
  id: string;
  property_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  created_at: string;
  property?: {
    id: string;
    title: string;
    address: string;
    city: string;
  };
}

interface RequirementData {
  id: string;
  user_id: string;
  contact_name: string;
  contact_email: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  property_type?: string[];
  locations?: string[];
  created_at: string;
}

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalFavorites: number;
  totalSavedSearches: number;
  totalRequirements: number;
  totalReviews: number;
  totalProperties: number;
}

interface UserDashboardData {
  applications: ApplicationData[];
  favorites: FavoriteData[];
  savedSearches: SavedSearchData[];
  requirements: RequirementData[];
  reviews: ReviewData[];
  properties: PropertyData[];
  stats: DashboardStats;
}

export function useUserDashboard() {
  const { user, isLoggedIn } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<UserDashboardData>({
    queryKey: ['/api/user/dashboard'],
    enabled: isLoggedIn && !!user,
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await fetch('/api/user/dashboard', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 30000,
  });

  return {
    applications: data?.applications || [],
    favorites: data?.favorites || [],
    savedSearches: data?.savedSearches || [],
    requirements: data?.requirements || [],
    reviews: data?.reviews || [],
    properties: data?.properties || [],
    stats: data?.stats || {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      totalFavorites: 0,
      totalSavedSearches: 0,
      totalRequirements: 0,
      totalReviews: 0,
      totalProperties: 0,
    },
    isLoading,
    error,
    refetch,
  };
}
