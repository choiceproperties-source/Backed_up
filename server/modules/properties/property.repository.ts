import { getSupabaseOrThrow } from "../../supabase";

/* ------------------------------------------------ */
/* Types */
/* ------------------------------------------------ */

export interface PropertyFilters {
  propertyType?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
  ownerId?: string;
  page: number;
  limit: number;
}

export interface PropertyCreateData {
  title: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  price?: string;
  bedrooms?: number;
  bathrooms?: string;
  square_feet?: number;
  property_type?: string;
  amenities?: any;
  images?: string[];
  latitude?: string;
  longitude?: string;
  furnished?: boolean;
  pets_allowed?: boolean;
  lease_term?: string;
  utilities_included?: any;
  status?: string;
  owner_id: string;
}

/* ------------------------------------------------ */
/* Queries */
/* ------------------------------------------------ */

export async function findAllProperties(filters: PropertyFilters) {
  const {
    propertyType,
    city,
    minPrice,
    maxPrice,
    status,
    ownerId,
    page,
    limit,
  } = filters;

  const supabase = getSupabaseOrThrow();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("properties")
    .select("*", { count: "exact" });

  // Owner-specific view (Landlord / Admin dashboards)
  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  // Public filters
  if (propertyType) query = query.eq("property_type", propertyType);
  if (city) query = query.ilike("city", `%${city}%`);
  if (minPrice) query = query.gte("price", minPrice);
  if (maxPrice) query = query.lte("price", maxPrice);

  // Status handling
  if (status) {
    query = query.eq("status", status);
  } else if (!ownerId) {
    // Default: public listings only see active properties
    query = query.eq("status", "active");
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[PROPERTY_REPOSITORY] findAllProperties error:", error);
    throw error;
  }

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}

export async function findPropertyById(id: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[PROPERTY_REPOSITORY] findPropertyById error:", error);
    }
    return null;
  }

  return data;
}

/* ------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------ */

export async function createProperty(propertyData: PropertyCreateData) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("properties")
    .insert(propertyData)
    .select()
    .single();

  if (error) {
    console.error("[PROPERTY_REPOSITORY] createProperty failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      ownerId: propertyData.owner_id,
      imageCount: propertyData.images?.length ?? 0,
    });
    throw error;
  }

  return data;
}

export async function updateProperty(
  id: string,
  updateData: Record<string, any>
) {
  const supabase = getSupabaseOrThrow();

  if (!id) {
    throw new Error("Property ID is required for update");
  }

  const payload = {
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[PROPERTY_REPOSITORY] updateProperty failed:", {
      propertyId: id,
      error,
      payloadKeys: Object.keys(updateData),
    });
    throw error;
  }

  return data;
}

export async function deleteProperty(id: string) {
  const supabase = getSupabaseOrThrow();

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[PROPERTY_REPOSITORY] deleteProperty failed:", error);
    throw error;
  }

  return null;
}

/* ------------------------------------------------ */
/* Analytics */
/* ------------------------------------------------ */

export async function incrementPropertyViews(propertyId: string) {
  const supabase = getSupabaseOrThrow();

  const { error } = await supabase.rpc("increment_property_views", {
    property_id: propertyId,
  });

  if (!error) return;

  // Fallback if RPC is missing
  console.warn(
    "[PROPERTY_REPOSITORY] RPC increment failed, using fallback",
    error
  );

  const { data } = await supabase
    .from("properties")
    .select("view_count")
    .eq("id", propertyId)
    .single();

  const currentViews = data?.view_count ?? 0;

  await supabase
    .from("properties")
    .update({ view_count: currentViews + 1 })
    .eq("id", propertyId);
}