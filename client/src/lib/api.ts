// API Client for Choice Properties Backend
const API_BASE = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error || "API request failed" };
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    return { error: error.message || "Unknown error" };
  }
}

// Properties API - Using v2 endpoints
export const propertiesApi = {
  getAll: (filters?: { propertyType?: string; city?: string; minPrice?: number; maxPrice?: number }) => {
    const params = new URLSearchParams();
    if (filters?.propertyType) params.append("propertyType", filters.propertyType);
    if (filters?.city) params.append("city", filters.city);
    if (filters?.minPrice) params.append("minPrice", filters.minPrice.toString());
    if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice.toString());
    
    return apiCall(`/api/v2/properties?${params.toString()}`);
  },
  getById: (id: string) => apiCall(`/api/v2/properties/${id}`),
  create: (data: any) => apiCall("/api/v2/properties", { method: "POST", body: JSON.stringify(data) }),
};

// Applications API - Using v2 endpoints
export const applicationsApi = {
  create: (data: any) => apiCall("/api/v2/applications", { method: "POST", body: JSON.stringify(data) }),
  getByUser: (userId: string) => apiCall(`/api/v2/applications/user/${userId}`),
  update: (id: string, data: any) => apiCall(`/api/v2/applications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// Inquiries API
export const inquiriesApi = {
  create: (data: any) => apiCall("/api/inquiries", { method: "POST", body: JSON.stringify(data) }),
  getByAgent: (agentId: string) => apiCall(`/api/inquiries/agent/${agentId}`),
};

// Requirements API
export const requirementsApi = {
  create: (data: any) => apiCall("/api/requirements", { method: "POST", body: JSON.stringify(data) }),
  getByUser: (userId: string) => apiCall(`/api/requirements/user/${userId}`),
};

// Favorites API
export const favoritesApi = {
  create: (data: any) => apiCall("/api/favorites", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/api/favorites/${id}`, { method: "DELETE" }),
  getByUser: (userId: string) => apiCall(`/api/favorites/user/${userId}`),
};

// Reviews API
export const reviewsApi = {
  getByProperty: (propertyId: string) => apiCall(`/api/reviews/property/${propertyId}`),
  create: (data: any) => apiCall("/api/reviews", { method: "POST", body: JSON.stringify(data) }),
};

// Auth API - Using v2 endpoints (Note: Primary auth handled by Supabase client)
export const authApi = {
  signup: (email: string, password: string, fullName: string) =>
    apiCall("/api/v2/auth/signup", { method: "POST", body: JSON.stringify({ email, password, fullName }) }),
  login: (email: string, password: string) =>
    apiCall("/api/v2/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};

// Health check
export const healthApi = {
  check: () => apiCall("/api/health"),
};
