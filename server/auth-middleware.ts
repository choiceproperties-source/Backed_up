import { Request, Response, NextFunction } from "express";
import { supabase, getSupabaseOrThrow, isSupabaseConfigured } from "./supabase";
import { cache, CACHE_TTL } from "./cache";
import { logSecurityEvent } from "./security/audit-logger";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  };
}

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  owner: 80,
  agent: 70,
  landlord: 60,
  property_manager: 60,
  renter: 10,
  guest: 0,
};

export const PROPERTY_EDIT_ROLES = ["admin", "owner", "agent", "landlord", "property_manager"];
export const APPLICATION_REVIEW_ROLES = ["admin", "owner", "agent", "landlord", "property_manager"];
export const SENSITIVE_DATA_ROLES = ["admin", "owner", "agent", "landlord", "property_manager"];
export const ADMIN_ONLY_ROLES = ["admin"];

// Property Manager Permission Groups
export const PROPERTY_MANAGER_PERMISSIONS = {
  view_properties: "view_properties",
  manage_applications: "manage_applications",
  manage_leases: "manage_leases",
  manage_payments: "manage_payments",
  manage_maintenance: "manage_maintenance",
  messaging_access: "messaging_access",
} as const;

export type PermissionGroup = typeof PROPERTY_MANAGER_PERMISSIONS[keyof typeof PROPERTY_MANAGER_PERMISSIONS];

export function hasHigherOrEqualRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

export function canEditProperties(role: string): boolean {
  return PROPERTY_EDIT_ROLES.includes(role);
}

export function canReviewApplications(role: string): boolean {
  return APPLICATION_REVIEW_ROLES.includes(role);
}

export function canAccessSensitiveData(role: string): boolean {
  return SENSITIVE_DATA_ROLES.includes(role);
}

export function isAdminOnly(role: string): boolean {
  return ADMIN_ONLY_ROLES.includes(role);
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Authentication service is not configured. Please contact support." });
  }

  try {
    const supabaseClient = getSupabaseOrThrow();
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Check cache first to avoid N+1 query
    const cacheKey = `user_role:${user.id}`;
    let cachedRole = cache.get<string>(cacheKey) || "renter";
    
    if (cachedRole === "renter" && !cache.has(cacheKey)) {
      const { data: userData } = await supabaseClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      cachedRole = userData?.role || "renter";
      cache.set(cacheKey, cachedRole, CACHE_TTL.USER_ROLE);
    }

    req.user = {
      id: user.id,
      email: user.email || "",
      role: cachedRole,
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: "Authentication failed" });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token || !isSupabaseConfigured()) {
    return next();
  }

  const supabaseClient = getSupabaseOrThrow();
  supabaseClient.auth
    .getUser(token)
    .then(async ({ data: { user }, error }) => {
      if (!error && user) {
        // Check cache first to avoid N+1 query
        const cacheKey = `user_role:${user.id}`;
        let cachedRole = cache.get<string>(cacheKey) || "renter";
        
        if (cachedRole === "renter" && !cache.has(cacheKey)) {
          const { data: userData } = await supabaseClient
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();
          cachedRole = userData?.role || "renter";
          cache.set(cacheKey, cachedRole, CACHE_TTL.USER_ROLE);
        }

        req.user = {
          id: user.id,
          email: user.email || "",
          role: cachedRole,
        };
      }
      next();
    })
    .catch(() => next());
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function invalidateOwnershipCache(resourceType: string, resourceId: string): void {
  cache.invalidate(`ownership:${resourceType}:${resourceId}`);
}

async function getResourceOwner(resourceType: string, resourceId: string): Promise<{ ownerId: string | null; found: boolean }> {
  const cacheKey = `ownership:${resourceType}:${resourceId}`;
  const cached = cache.get<{ ownerId: string | null; found: boolean }>(cacheKey);
  if (cached) return cached;

  if (!isSupabaseConfigured()) {
    throw new Error("Database service is not configured");
  }

  const supabaseClient = getSupabaseOrThrow();
  let ownerId: string | null = null;
  let found = false;

  if (resourceType === "property") {
    const { data } = await supabaseClient.from("properties").select("owner_id").eq("id", resourceId).single();
    ownerId = data?.owner_id || null;
    found = !!data;
  } else if (resourceType === "application") {
    const { data } = await supabaseClient.from("applications").select("user_id").eq("id", resourceId).single();
    ownerId = data?.user_id || null;
    found = !!data;
  } else if (resourceType === "review") {
    const { data } = await supabaseClient.from("reviews").select("user_id").eq("id", resourceId).single();
    ownerId = data?.user_id || null;
    found = !!data;
  } else if (resourceType === "inquiry") {
    const { data } = await supabaseClient.from("inquiries").select("agent_id").eq("id", resourceId).single();
    ownerId = data?.agent_id || null;
    found = !!data;
  } else if (resourceType === "saved_search") {
    const { data } = await supabaseClient.from("saved_searches").select("user_id").eq("id", resourceId).single();
    ownerId = data?.user_id || null;
    found = !!data;
  } else if (resourceType === "favorite") {
    const { data } = await supabaseClient.from("favorites").select("user_id").eq("id", resourceId).single();
    ownerId = data?.user_id || null;
    found = !!data;
  } else if (resourceType === "user") {
    ownerId = resourceId;
    found = true;
  }

  const result = { ownerId, found };
  if (found) {
    cache.set(cacheKey, result, CACHE_TTL.OWNERSHIP_CHECK);
  }
  return result;
}

export function requireOwnership(resourceType: "property" | "application" | "review" | "inquiry" | "saved_search" | "user" | "favorite") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role === "admin") {
      return next();
    }

    const resourceId = req.params.id;
    const resourceNames: Record<string, string> = {
      property: "Property",
      application: "Application",
      review: "Review",
      inquiry: "Inquiry",
      saved_search: "Saved search",
      user: "User",
      favorite: "Favorite",
    };

    try {
      const { ownerId, found } = await getResourceOwner(resourceType, resourceId);

      if (!found) {
        return res.status(404).json({ error: `${resourceNames[resourceType]} not found` });
      }

      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: "You do not own this resource" });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: "Failed to verify ownership" });
    }
  };
}

export function requirePropertyEditAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!canEditProperties(req.user.role)) {
      logSecurityEvent(req.user.id, "login", false, { 
        reason: "Unauthorized property edit attempt", 
        role: req.user.role 
      }, req);
      return res.status(403).json({ 
        error: "You don't have permission to edit properties. Only landlords, property managers, agents, and admins can edit properties." 
      });
    }

    next();
  };
}

export function requireApplicationReviewAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!canReviewApplications(req.user.role)) {
      logSecurityEvent(req.user.id, "login", false, { 
        reason: "Unauthorized application review attempt", 
        role: req.user.role 
      }, req);
      return res.status(403).json({ 
        error: "You don't have permission to review applications. Only property owners, landlords, agents, and admins can review applications." 
      });
    }

    next();
  };
}

export function preventTenantPropertyEdit() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const tenantRoles = ["renter", "buyer"];
    if (tenantRoles.includes(req.user.role)) {
      logSecurityEvent(req.user.id, "login", false, { 
        reason: "Tenant attempted to edit property", 
        role: req.user.role,
        path: req.path,
        method: req.method
      }, req);
      return res.status(403).json({ 
        error: "Tenants cannot modify property listings. Please contact the property owner or agent." 
      });
    }

    next();
  };
}

export function require2FAVerified() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.twoFactorEnabled && !req.user.twoFactorVerified) {
      return res.status(403).json({ 
        error: "Two-factor authentication required",
        requiresTwoFactor: true 
      });
    }

    next();
  };
}

export async function isPropertyManagerForProperty(
  propertyManagerId: string,
  propertyId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  
  try {
    const supabaseClient = getSupabaseOrThrow();
    const { data } = await supabaseClient
      .from("property_manager_assignments")
      .select("id")
      .eq("property_manager_id", propertyManagerId)
      .eq("property_id", propertyId)
      .is("revoked_at", null)
      .single();

    return !!data;
  } catch (error) {
    console.error("[AUTH] Failed to check property manager assignment:", error);
    return false;
  }
}

export async function canAccessProperty(
  userId: string,
  userRole: string,
  propertyId: string
): Promise<boolean> {
  // Admins can access all properties
  if (userRole === "admin") return true;

  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabaseClient = getSupabaseOrThrow();
  // Get property owner
  const { data: property } = await supabaseClient
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .single();

  if (!property) return false;

  // Owner can access their own property
  if (property.owner_id === userId) return true;

  // Property managers need explicit assignment
  if (userRole === "property_manager") {
    return await isPropertyManagerForProperty(userId, propertyId);
  }

  // Agents can view all properties
  if (userRole === "agent") return true;

  return false;
}
