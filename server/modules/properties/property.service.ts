import { insertPropertySchema } from "@shared/schema";
import { cache, CACHE_TTL } from "../../cache";
import { invalidateOwnershipCache } from "../../auth-middleware";
import * as propertyRepository from "./property.repository";

export interface GetPropertiesParams {
  propertyType?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
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

export async function getProperties(params: GetPropertiesParams): Promise<GetPropertiesResult> {
  const pageNum = Math.max(1, parseInt(params.page || "1") || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(params.limit || "20") || 20));

  const cacheKey = `properties:${params.propertyType || ''}:${params.city || ''}:${params.minPrice || ''}:${params.maxPrice || ''}:${params.status || 'active'}:${pageNum}:${limitNum}`;
  const cached = cache.get<GetPropertiesResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const { data, count } = await propertyRepository.findAllProperties({
    propertyType: params.propertyType,
    city: params.city,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    status: params.status,
    page: pageNum,
    limit: limitNum,
  });

  const totalPages = Math.ceil((count || 0) / limitNum);

  const result: GetPropertiesResult = {
    properties: data || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    }
  };

  cache.set(cacheKey, result, CACHE_TTL.PROPERTIES_LIST);

  return result;
}

export async function getPropertyById(id: string): Promise<any> {
  const cacheKey = `property:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await propertyRepository.findPropertyById(id);

  cache.set(cacheKey, data, CACHE_TTL.PROPERTY_DETAIL);

  return data;
}

export interface CreatePropertyInput {
  body: Record<string, any>;
  userId: string;
}

export async function createProperty(input: CreatePropertyInput): Promise<{ data?: any; error?: string }> {
  const validation = insertPropertySchema.safeParse(input.body);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const propertyData = {
    ...validation.data,
    owner_id: input.userId,
  };

  const data = await propertyRepository.createProperty(propertyData as any);

  cache.invalidate("properties:");

  return { data };
}

export async function updateProperty(id: string, updateData: Record<string, any>): Promise<any> {
  const data = await propertyRepository.updateProperty(id, updateData);

  cache.invalidate(`property:${id}`);
  cache.invalidate("properties:");
  invalidateOwnershipCache("property", id);

  return data;
}

export async function deleteProperty(id: string): Promise<null> {
  await propertyRepository.deleteProperty(id);

  cache.invalidate(`property:${id}`);
  cache.invalidate("properties:");
  invalidateOwnershipCache("property", id);

  return null;
}

export async function recordPropertyView(propertyId: string): Promise<void> {
  await propertyRepository.incrementPropertyViews(propertyId);
}
