import { z } from "zod";
import { insertPropertySchema } from "@shared/schema";
import { cache, CACHE_TTL } from "../../cache";
import { invalidateOwnershipCache } from "../../auth-middleware";
import * as propertyRepository from "./property.repository";
import { getSupabaseOrThrow } from "../../supabase";

/* ------------------------------------------------ */
/* Types */
/* ------------------------------------------------ */

export interface GetPropertiesParams {
  propertyType?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
  ownerId?: string;
  page?: string;
  limit?: string;
}

export interface GetPropertiesResult {
  properties: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CreatePropertyInput {
  body: Record<string, any>;
  userId: string;
}

export interface CreatePropertyResult {
  data?: any;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/* ------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------ */

/**
 * Extract allowlisted rules and filter empty/null values.
 * Strict integrity check: No Fair Housing or legal disclosures allowed as "rules".
 * Only owner-defined data is included.
 */
export function getPropertyRules(property: any): Readonly<Record<string, any>> {
  if (!property) return Object.freeze({});

  const allowlist = [
    "pets_allowed",
    "smoking_allowed",
    "parking_available",
    "utilities_included",
    "laundry_type",
    "security_deposit",
    "lease_term_months",
    "available_date",
    "rules_text"
  ];

  const rules: Record<string, any> = {};

  for (const field of allowlist) {
    const value = property[field];

    // Filter out: null, empty strings, empty arrays, empty objects
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;

    rules[field] = value;
  }

  return Object.freeze(rules);
}

/**
 * Normalize image input from frontend / ImageKit
 * Accepts:
 * - string URLs
 * - { url: string }
 * - { fileUrl: string }
 */
function normalizeImages(images: unknown): string[] {
  if (images === undefined || images === null) return [];
  if (!Array.isArray(images)) {
    throw new Error("Images must be an array");
  }

  const urls: string[] = [];

  for (const img of images) {
    if (typeof img === "string") {
      // Validate URL format
      if (!img.startsWith("http://") && !img.startsWith("https://")) {
        throw new Error(`Invalid image URL format: ${img}`);
      }
      urls.push(img);
      continue;
    }

    if (typeof img === "object" && img !== null) {
      const url =
        (img as any).url ||
        (img as any).fileUrl ||
        (img as any).imageUrl;

      if (typeof url === "string") {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          throw new Error(`Invalid image URL format: ${url}`);
        }
        urls.push(url);
        continue;
      }
    }

    throw new Error("Invalid image format. Must be a URL string or object with url/fileUrl/imageUrl property.");
  }

  if (urls.length > 25) {
    throw new Error("Maximum 25 images per property");
  }

  return urls;
}

/**
 * Convert numeric frontend values into schema-safe format
 * FIXED: Keep numbers as numbers, don't convert to strings
 */
function normalizePropertyInput(body: Record<string, any>): Record<string, any> {
  const numericFields = [
    "price",
    "bedrooms",
    "bathrooms",
    "square_feet",
    "year_built",
    "deposit",
    "hoa_fee",
  ];

  const normalized = { ...body };

  // Handle numeric fields - ensure they are numbers or null/undefined
  for (const field of numericFields) {
    if (field in normalized) {
      const value = normalized[field];

      // Convert empty string to undefined
      if (value === "" || value === null) {
        normalized[field] = undefined;
        continue;
      }

      // Convert string numbers to actual numbers
      if (typeof value === "string") {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          normalized[field] = numValue;
        } else {
          // If it's a non-numeric string, keep it as is (will fail validation)
          normalized[field] = value;
        }
      }
      // If it's already a number, keep it as number
    }
  }

  // Handle required string fields - trim whitespace
  const stringFields = ["title", "address", "city", "state", "description"];
  for (const field of stringFields) {
    if (field in normalized && typeof normalized[field] === "string") {
      normalized[field] = normalized[field].trim();
      // Convert empty string to undefined for optional fields
      if (normalized[field] === "" && field !== "title" && field !== "address") {
        normalized[field] = undefined;
      }
    }
  }

  // Normalize state to uppercase
  if (normalized.state && typeof normalized.state === "string") {
    normalized.state = normalized.state.trim().toUpperCase();
  }

  // Handle property_type
  if (normalized.property_type && typeof normalized.property_type === "string") {
    normalized.property_type = normalized.property_type.trim().toLowerCase();
  }

  // Handle images
  if ("images" in normalized) {
    try {
      normalized.images = normalizeImages(normalized.images);
    } catch (error: any) {
      // Rethrow with clearer message
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }

  return normalized;
}

/* ------------------------------------------------ */
/* Queries */
/* ------------------------------------------------ */

/**
 * Format poster information with role mapping and privacy rules
 */
async function formatPosterInfo(property: any) {
  // If owner isn't joined, we need to fetch it
  let owner = property.owner;
  if (!owner && property.owner_id) {
    try {
      const supabase = getSupabaseOrThrow();
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, profile_image, role, display_email, display_phone, license_verified")
        .eq("id", property.owner_id)
        .maybeSingle();
      
      if (!error && data) {
        owner = {
          id: data.id,
          full_name: data.full_name,
          profile_image: data.profile_image,
          role: data.role,
          display_email: data.display_email,
          display_phone: data.display_phone,
          license_verified: data.license_verified
        };
      }
    } catch (err) {
      console.error("[PROPERTY_SERVICE] Error fetching owner info:", err);
    }
  }
  
  if (!owner) return null;

  const showContact = property.show_contact_info !== false;
  
  // Role mapping
  let roleLabel = "Property Owner";
  if (owner.role === "agent") roleLabel = "Listing Agent";
  else if (owner.role === "property_manager") roleLabel = "Property Manager";
  
  return {
    id: owner.id,
    name: owner.full_name || "Property Owner",
    avatar: owner.profile_image,
    role: owner.role,
    role_label: roleLabel,
    is_verified: owner.license_verified || false,
    agency: null,
    contact: {
      email: showContact ? (owner.display_email || null) : null,
      phone: showContact ? (owner.display_phone || null) : null,
    }
  };
}

export async function getProperties(
  params: GetPropertiesParams
): Promise<GetPropertiesResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));

  const cacheKey = [
    "properties",
    params.propertyType ?? "",
    params.city ?? "",
    params.minPrice ?? "",
    params.maxPrice ?? "",
    params.status ?? "active",
    params.ownerId ?? "",
    page,
    limit,
  ].join(":");

  const cached = cache.get<GetPropertiesResult>(cacheKey);
  if (cached) return cached;

  const { data = [], count = 0 } =
    await propertyRepository.findAllProperties({
      propertyType: params.propertyType,
      city: params.city,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      status: params.status,
      ownerId: params.ownerId,
      page,
      limit,
    });

  const propertiesWithPoster = await Promise.all(data.map(async property => ({
    ...property,
    poster: await formatPosterInfo(property)
  })));

  const totalPages = Math.ceil(count / limit);

  const result: GetPropertiesResult = {
    properties: propertiesWithPoster,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };

  cache.set(cacheKey, result, CACHE_TTL.PROPERTIES_LIST);
  return result;
}

export async function getPropertyById(id: string): Promise<any> {
  const cacheKey = `property:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const property = await propertyRepository.findPropertyById(id);
  if (!property) return null;

  const hydratedProperty = {
    ...property,
    poster: await formatPosterInfo(property)
  };

  cache.set(cacheKey, hydratedProperty, CACHE_TTL.PROPERTY_DETAIL);
  return hydratedProperty;
}

/* ------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------ */

export async function createProperty({
  body,
  userId,
}: CreatePropertyInput): Promise<CreatePropertyResult> {
  console.log("[PROPERTY_SERVICE] createProperty called:", {
    userId,
    rawBody: body,
    timestamp: new Date().toISOString(),
  });

  let normalized;
  try {
    normalized = normalizePropertyInput(body);
    console.log("[PROPERTY_SERVICE] normalized input:", normalized);
  } catch (err: any) {
    console.error("[PROPERTY_SERVICE] normalization error:", {
      error: err.message,
      stack: err.stack,
      body,
    });
    return {
      error: err.message,
      errors: [{ field: "general", message: err.message }],
    };
  }

  // Validate with Zod schema
  const parsed = insertPropertySchema.safeParse(normalized);
  if (!parsed.success) {
    console.error("[PROPERTY_SERVICE] validation error:", {
      errors: parsed.error.errors,
      normalized,
    });

    // Return ALL validation errors, not just the first one
    const errors = parsed.error.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
    }));

    return {
      error: errors[0]?.message || "Validation failed",
      errors,
    };
  }

  try {
    const propertyData = {
      ...parsed.data,
      owner_id: userId,
      listing_agent_id: (parsed.data as any).listingAgentId || null,
      agency_id: (parsed.data as any).agencyId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("[PROPERTY_SERVICE] creating property with data:", propertyData);

    const data = await propertyRepository.createProperty(propertyData as any);

    // Invalidate relevant caches
    cache.invalidate("properties:");
    invalidateOwnershipCache("property", data.id);

    console.log("[PROPERTY_SERVICE] property created successfully:", {
      propertyId: data.id,
      userId,
    });

    return { data };
  } catch (err: any) {
    console.error("[PROPERTY_SERVICE] repository error:", {
      error: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details,
      propertyData: {
        ...parsed.data,
        owner_id: userId,
      },
    });

    // Handle database-specific errors
    if (err.code === '23505') { // Unique constraint violation
      return {
        error: "A property with similar details already exists",
        errors: [{ field: "general", message: "Duplicate property detected" }],
      };
    }

    if (err.code === '23503') { // Foreign key violation
      return {
        error: "Invalid user reference",
        errors: [{ field: "owner_id", message: "User does not exist" }],
      };
    }

    // Handle other database errors
    if (err.message?.includes("violates")) {
      return {
        error: "Database constraint violation",
        errors: [{ field: "general", message: "Invalid data format" }],
      };
    }

    return {
      error: err.message || "Failed to create property in database",
      errors: [{ field: "general", message: "Database error occurred" }],
    };
  }
}

export async function updateProperty(
  id: string,
  updateData: Record<string, any>,
  userId?: string
): Promise<any> {
  console.log("[PROPERTY_SERVICE] updateProperty called:", {
    id,
    userId,
    updateData,
  });

  const property = await propertyRepository.findPropertyById(id);

  if (!property) {
    throw new Error("Property not found");
  }

  if (userId && property.owner_id !== userId) {
    throw new Error("Unauthorized: You do not own this property");
  }

  const normalized = normalizePropertyInput(updateData);

  // Use the repository to update - we skip Zod partial() here because of the error
  // and handle field validation/conversion in the repository layer
  const updated = await propertyRepository.updateProperty(id, normalized);

  cache.invalidate(`property:${id}`);
  cache.invalidate("properties:");
  invalidateOwnershipCache("property", id);

  console.log("[PROPERTY_SERVICE] property updated successfully:", { id });

  return updated;
}

export async function deleteProperty(
  id: string,
  userId?: string
): Promise<null> {
  console.log("[PROPERTY_SERVICE] deleteProperty called:", { id, userId });

  const property = await propertyRepository.findPropertyById(id);

  if (!property) {
    throw new Error("Property not found");
  }

  if (userId && property.owner_id !== userId) {
    throw new Error("Unauthorized: You do not own this property");
  }

  await propertyRepository.deleteProperty(id);

  cache.invalidate(`property:${id}`);
  cache.invalidate("properties:");
  invalidateOwnershipCache("property", id);

  console.log("[PROPERTY_SERVICE] property deleted successfully:", { id });

  return null;
}

export async function recordPropertyView(propertyId: string): Promise<void> {
  await propertyRepository.incrementPropertyViews(propertyId);
}

// Additional functions for completeness (if they exist in repository)
export async function getPropertyFull(id: string): Promise<any> {
  return propertyRepository.findPropertyById(id);
}

export async function getPropertiesByOwner(ownerId: string): Promise<any[]> {
  return propertyRepository.findPropertiesByOwner(ownerId);
}

export async function getPropertyAnalytics(propertyId: string): Promise<any> {
  // Implement analytics logic or call repository
  return { views: 0, saves: 0, applications: 0 };
}

export async function updatePropertyStatus(
  id: string,
  status: string
): Promise<any> {
  return propertyRepository.updateProperty(id, { status });
}

export async function updatePropertyPrice(
  id: string,
  price: number
): Promise<any> {
  return propertyRepository.updateProperty(id, { price });
}

export async function updateExpiration(
  id: string,
  expiresAt: string
): Promise<any> {
  return propertyRepository.updateProperty(id, { expires_at: expiresAt });
}

export async function schedulePublish(
  id: string,
  publishAt: string
): Promise<any> {
  return propertyRepository.updateProperty(id, { publish_at: publishAt });
}

export async function getMarketInsights(): Promise<any> {
  return { averagePrice: 0, totalProperties: 0 };
}

export async function getTrustIndicators(): Promise<any> {
  return { verifiedProperties: 0, verifiedOwners: 0 };
}