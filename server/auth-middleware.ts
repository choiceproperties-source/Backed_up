import { Request, Response, NextFunction } from "express";
import { getSupabaseOrThrow, isSupabaseConfigured } from "./supabase";
import { cache, CACHE_TTL } from "./cache";
import { logSecurityEvent } from "./security/audit-logger";

/* ------------------------------------------------ */
/* Types */
/* ------------------------------------------------ */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
  };
}

/* ------------------------------------------------ */
/* Role System (Single Source of Truth) */
/* ------------------------------------------------ */

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 1000,
  admin: 100,
  owner: 80,
  agent: 70,
  landlord: 60,
  property_manager: 60,
  renter: 10,
  guest: 0,
};

export const PROPERTY_EDIT_ROLES = [
  "super_admin",
  "admin",
  "owner",
  "agent",
  "landlord",
  "property_manager",
];

export const APPLICATION_REVIEW_ROLES = [...PROPERTY_EDIT_ROLES];
export const SENSITIVE_DATA_ROLES = [...PROPERTY_EDIT_ROLES];
export const ADMIN_ONLY_ROLES = ["admin", "super_admin"];

/* ------------------------------------------------ */
/* Role Helpers */
/* ------------------------------------------------ */

export function hasHigherOrEqualRole(userRole: string, requiredRole: string) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export const canEditProperties = (role: string) =>
  PROPERTY_EDIT_ROLES.includes(role);

export const canReviewApplications = (role: string) =>
  APPLICATION_REVIEW_ROLES.includes(role);

/* ------------------------------------------------ */
/* Core Auth Middleware */
/* ------------------------------------------------ */

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: "Authentication service unavailable",
    });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing access token" });
  }

  try {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = data.user.id;

    /* ---------- ROLE LOOKUP (CACHED) ---------- */
    const cacheKey = `user_role:${userId}`;
    let role = cache.get<string>(cacheKey);

    if (!role) {
      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      role = userRow?.role || "renter";
      cache.set(cacheKey, role, CACHE_TTL.USER_ROLE);
    }

    req.user = {
      id: userId,
      email: data.user.email ?? "",
      role: role || "renter",
    };

    next();
  } catch (err) {
    console.error("[AUTH] authenticateToken failed:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/* ------------------------------------------------ */
/* Optional Auth (Non-blocking) */
/* ------------------------------------------------ */

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  if (!isSupabaseConfigured()) return next();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) return next();

  try {
    const supabase = getSupabaseOrThrow();
    const { data } = await supabase.auth.getUser(token);

    if (!data?.user) return next();

    const cacheKey = `user_role:${data.user.id}`;
    let role = cache.get<string>(cacheKey);

    if (!role) {
      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      role = userRow?.role || "renter";
      cache.set(cacheKey, role, CACHE_TTL.USER_ROLE);
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? "",
      role: role || "renter",
    };
  } catch {
    // silent fail (optional auth)
  }

  next();
}

/* ------------------------------------------------ */
/* Authorization Guards */
/* ------------------------------------------------ */

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

/* ------------------------------------------------ */
/* Ownership Checks */
/* ------------------------------------------------ */

export function invalidateOwnershipCache(type: string, id: string) {
  cache.invalidate(`ownership:${type}:${id}`);
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Super Admin access required" });
  }
  next();
}

async function getResourceOwner(
  type: string,
  id: string
): Promise<{ ownerId: string | null; found: boolean }> {
  const cacheKey = `ownership:${type}:${id}`;
  const cached = cache.get<{ ownerId: string | null; found: boolean }>(
    cacheKey
  );
  if (cached) return cached;

  const supabase = getSupabaseOrThrow();
  let ownerId: string | null = null;
  let found = false;

  const tableMap: Record<string, { table: string; field: string }> = {
    property: { table: "properties", field: "owner_id" },
    application: { table: "applications", field: "user_id" },
    review: { table: "reviews", field: "user_id" },
    inquiry: { table: "inquiries", field: "agent_id" },
    saved_search: { table: "saved_searches", field: "user_id" },
    favorite: { table: "favorites", field: "user_id" },
    user: { table: "users", field: "id" },
  };

  const config = tableMap[type];
  if (!config) return { ownerId: null, found: false };

  if (type === "user") {
    ownerId = id;
    found = true;
  } else {
    const { data } = await supabase
      .from(config.table)
      .select(config.field)
      .eq("id", id)
      .single();

    ownerId = (data as any)?.[config.field as any] ?? null;
    found = !!data;
  }

  const result = { ownerId, found };
  if (found) {
    cache.set(cacheKey, result, CACHE_TTL.OWNERSHIP_CHECK);
  }

  return result;
}

export function requireOwnership(
  type:
    | "property"
    | "application"
    | "review"
    | "inquiry"
    | "saved_search"
    | "user"
    | "favorite"
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role === "admin" || req.user.role === "super_admin") return next();

    try {
      const { ownerId, found } = await getResourceOwner(type, req.params.id);

      if (!found) {
        return res.status(404).json({ error: "Resource not found" });
      }

      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: "Not resource owner" });
      }

      next();
    } catch (err) {
      console.error("[AUTH] Ownership check failed:", err);
      return res.status(500).json({ error: "Ownership verification failed" });
    }
  };
}

/* ------------------------------------------------ */
/* Property / Application Guards */
/* ------------------------------------------------ */

export function requirePropertyEditAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !canEditProperties(req.user.role)) {
      logSecurityEvent(
        req.user?.id ?? "unknown",
        "property_edit",
        false,
        { role: req.user?.role },
        req
      );
      return res.status(403).json({
        error:
          "Only landlords, agents, property managers, and admins can edit properties.",
      });
    }
    next();
  };
}

export function requireApplicationReviewAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !canReviewApplications(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to review applications.",
      });
    }
    next();
  };
}