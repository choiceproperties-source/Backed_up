import { getSupabaseOrThrow } from "../../supabase";

export interface PropertyFilters {
  propertyType?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: string;
  ownerId?: string;  // FIX 2b: Add ownerId filter
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
  images?: any;
  latitude?: string;
  longitude?: string;
  furnished?: boolean;
  pets_allowed?: boolean;
  lease_term?: string;
  utilities_included?: any;
  status?: string;
  owner_id: string;
}

export async function findAllProperties(filters: PropertyFilters) {
  const { propertyType, city, minPrice, maxPrice, status, ownerId, page, limit } = filters;
  const offset = (page - 1) * limit;
  const supabase = getSupabaseOrThrow();

  let query = supabase.from("properties").select("*", { count: "exact" });

  // FIX 2c: Apply owner filter when provided (for landlord dashboard)
  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  if (propertyType) query = query.eq("property_type", propertyType);
  if (city) query = query.ilike("city", `%${city}%`);
  if (minPrice) query = query.gte("price", minPrice);
  if (maxPrice) query = query.lte("price", maxPrice);
  if (status) {
    query = query.eq("status", status);
  } else if (!ownerId) {
    // Only default to 'active' for public browsing (no owner filter)
    query = query.eq("status", "active");
  }

  query = query.order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return { data, count };
}

export async function findPropertyById(id: string) {
  try {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (err) {
    return null;
  }
}

export async function createProperty(propertyData: PropertyCreateData) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("properties")
    .insert([propertyData])
    .select();

  if (error) throw error;

  return data[0];
}

export async function updateProperty(id: string, updateData: Record<string, any>) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("properties")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) throw error;

  return data[0];
}

export async function deleteProperty(id: string) {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return null;
}

export async function incrementPropertyViews(propertyId: string) {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase.rpc('increment_property_views', { property_id: propertyId });
  
  if (error) {
    const { data: property } = await supabase
      .from("properties")
      .select("view_count")
      .eq("id", propertyId)
      .single();
    
    await supabase
      .from("properties")
      .update({ view_count: (property?.view_count || 0) + 1 })
      .eq("id", propertyId);
  }
}
