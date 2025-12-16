// API Client for Choice Properties Backend - Using v2 endpoints
import { getAuthToken } from "./auth-context";

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
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Request failed" }));
      return { error: errorData.error || errorData.message || "API request failed", success: false };
    }

    const data = await response.json();
    return { data: data.data || data, success: true };
  } catch (error: any) {
    return { error: error.message || "Network error", success: false };
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
  update: (id: string, data: any) => apiCall(`/api/v2/properties/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/api/v2/properties/${id}`, { method: "DELETE" }),
};

// Applications API - Using v2 endpoints
export const applicationsApi = {
  create: (data: any) => apiCall("/api/v2/applications", { method: "POST", body: JSON.stringify(data) }),
  getById: (id: string) => apiCall(`/api/v2/applications/${id}`),
  getByUser: (userId: string) => apiCall(`/api/v2/applications/user/${userId}`),
  getByProperty: (propertyId: string) => apiCall(`/api/v2/applications/property/${propertyId}`),
  update: (id: string, data: any) => apiCall(`/api/v2/applications/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, reason?: string) => 
    apiCall(`/api/v2/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
};

// Inquiries API - Using v2 endpoints
export const inquiriesApi = {
  create: (data: any) => apiCall("/api/v2/inquiries", { method: "POST", body: JSON.stringify(data) }),
  getByAgent: (agentId: string) => apiCall(`/api/v2/inquiries/agent/${agentId}`),
  getByProperty: (propertyId: string) => apiCall(`/api/v2/inquiries/property/${propertyId}`),
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

// Reviews API - Using v2 endpoints
export const reviewsApi = {
  getByProperty: (propertyId: string) => apiCall(`/api/v2/reviews/property/${propertyId}`),
  create: (data: any) => apiCall("/api/v2/reviews", { method: "POST", body: JSON.stringify(data) }),
};

// Auth API - Using v2 endpoints (Note: Primary auth handled by Supabase client)
export const authApi = {
  signup: (email: string, password: string, fullName: string) =>
    apiCall("/api/v2/auth/signup", { method: "POST", body: JSON.stringify({ email, password, fullName }) }),
  login: (email: string, password: string) =>
    apiCall("/api/v2/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};

// User Dashboard API
export const dashboardApi = {
  getUserDashboard: () => apiCall("/api/user/dashboard"),
  getNotifications: () => apiCall("/api/user/notifications"),
  markNotificationRead: (id: string) => apiCall(`/api/notifications/${id}/read`, { method: "PATCH" }),
};

// Health check
export const healthApi = {
  check: () => apiCall("/api/health"),
};
