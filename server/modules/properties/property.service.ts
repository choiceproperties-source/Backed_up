import { insertPropertySchema } from "@shared/schema";
import { cache, CACHE_TTL } from "../../cache";
import { invalidateOwnershipCache } from "../../auth-middleware";
import * as propertyRepository from "./property.repository";

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

/* ------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------ */

/**
 * Normalize image input from frontend / ImageKit
 * Accepts:
 * - string URLs
 * - { url: string }
 * - { fileUrl: string }
 */
function normalizeImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];

  const urls: string[] = [];

  for (const img of images) {
    if (typeof img === "string") {
      urls.push(img);
      continue;
    }

    if (typeof img === "object" && img !== null) {
      const url =
        (img as any).url ||
        (img as any).fileUrl ||
        (img as any).imageUrl;

      if (typeof url === "string") {
        urls.push(url);
        continue;
      }
    }

    throw new Error("Invalid image format. Upload images via ImageKit only.");
  }

  if (urls.length > 25) {
    throw new Error("Maximum 25 images per property");
  }

  for (const url of urls) {
    if (url.startsWith("data:")) {
      throw new Error("Base64 images are not allowed");
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error("Images must be valid URLs");
    }
  }

  return urls;
}

/**
 * Convert numeric frontend values into schema-safe strings
 */
function normalizePropertyInput(body: Record<string, any>) {
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

  for (const field of numericFields) {
    if (field in normalized && typeof normalized[field] === "number") {
      normalized[field] = String(normalized[field]);
    }
  }

  if ("images" in normalized) {
    normalized.images = normalizeImages(normalized.images);
  }

  return normalized;
}

/* ------------------------------------------------ */
/* Queries */
/* ------------------------------------------------ */

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

  const totalPages = Math.ceil(count / limit);

  const result: GetPropertiesResult = {
    properties: data,
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

  cache.set(cacheKey, property, CACHE_TTL.PROPERTY_DETAIL);
  return property;
}

/* ------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------ */

export async function createProperty({
  body,
  userId,
}: CreatePropertyInput): Promise<{ data?: any; error?: string }> {
  let normalized;

  try {
    normalized = normalizePropertyInput(body);
  } catch (err: any) {
    return { error: err.message };
  }

  const parsed = insertPropertySchema.safeParse(normalized);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const propertyData = {
    ...parsed.data,
    owner_id: userId,
  };

  const data = await propertyRepository.createProperty(propertyData as any);

  cache.invalidate("properties:");
  return { data };
}

export async function updateProperty(
  id: string,
  updateData: Record<string, any>,
  userId?: string
): Promise<any> {
  const property = await propertyRepository.findPropertyById(id);

  if (!property) {
    throw new Error("Property not found");
  }

  if (userId && property.owner_id !== userId) {
    throw new Error("Unauthorized: You do not own this property");
  }

  const normalized = normalizePropertyInput(updateData);

  const updated = await propertyRepository.updateProperty(id, normalized);

  cache.invalidate(`property:${id}`);
  cache.invalidate("properties:");
  invalidateOwnershipCache("property", id);

  return updated;
}

export async function deleteProperty(
  id: string,
  userId?: string
): Promise<null> {
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

  return null;
}

export async function recordPropertyView(propertyId: string): Promise<void> {
  await propertyRepository.incrementPropertyViews(propertyId);
}