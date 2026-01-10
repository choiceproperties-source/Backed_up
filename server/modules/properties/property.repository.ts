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
  price?: number; // Changed from string to number
  bedrooms?: number;
  bathrooms?: number; // Changed from string to number
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
  created_at?: string;
  updated_at?: string;
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
    query = query.or(`owner_id.eq.${ownerId},listing_agent_id.eq.${ownerId}`);
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
    console.error("[PROPERTY_REPOSITORY] findAllProperties error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      filters,
    });
    throw error;
  }

  // Pre-fetch images for each property to eliminate N+1 calls
  const propertiesWithImages = await Promise.all((data ?? []).map(async (property) => {
    const imageUrls = (property.images || []).map((url: string, index: number) => ({
      id: `${property.id}-${index}`,
      url: url,
      index: index,
      category: 'property',
      isPrivate: false,
      imageUrls: {
        thumbnail: url,
        gallery: url,
        original: url,
      },
    }));
    return { ...property, propertyPhotos: imageUrls };
  }));

  return {
    data: propertiesWithImages,
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
    if (error.code !== "PGRST116") { // PGRST116 = "No rows returned"
      console.error("[PROPERTY_REPOSITORY] findPropertyById error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        propertyId: id,
      });
    }
    return null;
  }

  return data;
}

export async function findPropertiesByOwner(ownerId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .or(`owner_id.eq.${ownerId},listing_agent_id.eq.${ownerId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[PROPERTY_REPOSITORY] findPropertiesByOwner error:", {
      message: error.message,
      code: error.code,
      ownerId,
    });
    throw error;
  }

  return data ?? [];
}

/* ------------------------------------------------ */
/* Mutations */
/* ------------------------------------------------ */

export async function createProperty(propertyData: PropertyCreateData) {
  const supabase = getSupabaseOrThrow();

  console.log("[PROPERTY_REPOSITORY] createProperty received:", {
    dataKeys: Object.keys(propertyData),
    hasLeaseTerm: 'lease_term' in propertyData,
    price: propertyData.price,
    priceType: typeof propertyData.price,
    bedrooms: propertyData.bedrooms,
    bedroomsType: typeof propertyData.bedrooms,
    bathrooms: propertyData.bathrooms,
    bathroomsType: typeof propertyData.bathrooms,
  });

  // Create a clean copy of the data
  const cleanData: Record<string, any> = {};

  // Only include fields that exist in the database schema
  const validFields = [
    'title', 'description', 'address', 'city', 'state', 'zip_code',
    'price', 'bedrooms', 'bathrooms', 'square_feet', 'property_type',
    'amenities', 'images', 'latitude', 'longitude', 'furnished',
    'pets_allowed', 'utilities_included', 'status', 'owner_id',
    'listing_agent_id', 'agency_id',
    'created_at', 'updated_at', 'view_count', 'deposit', 'hoa_fee',
    'year_built', 'expires_at', 'publish_at'
  ];

  for (const [key, value] of Object.entries(propertyData)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Convert camelCase keys to snake_case for consistency with update logic if needed
    const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    // Only include valid fields
    if (validFields.includes(dbKey)) {
      // Convert numeric fields to proper types if needed
      if (['price', 'bedrooms', 'bathrooms', 'square_feet', 'deposit', 'hoa_fee', 'year_built', 'view_count'].includes(dbKey)) {
        if (value !== null && value !== undefined && value !== '') {
          cleanData[dbKey] = Number(value);
        } else {
          cleanData[dbKey] = null;
        }
      } else {
        cleanData[dbKey] = value;
      }
    } else {
      console.warn(`[PROPERTY_REPOSITORY] Skipping invalid field: ${key} (db: ${dbKey})`);
    }
  }

  // Ensure required fields are present
  if (!cleanData.title || !cleanData.address || !cleanData.owner_id) {
    const missing = [];
    if (!cleanData.title) missing.push('title');
    if (!cleanData.address) missing.push('address');
    if (!cleanData.owner_id) missing.push('owner_id');

    console.error("[PROPERTY_REPOSITORY] Missing required fields:", missing);
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Set timestamps if not provided
  const now = new Date().toISOString();
  if (!cleanData.created_at) cleanData.created_at = now;
  if (!cleanData.updated_at) cleanData.updated_at = now;

  // Set default status if not provided
  if (!cleanData.status) cleanData.status = 'active';

  console.log("[PROPERTY_REPOSITORY] Creating property with data:", {
    cleanDataKeys: Object.keys(cleanData),
    title: cleanData.title,
    price: cleanData.price,
    bedrooms: cleanData.bedrooms,
    bathrooms: cleanData.bathrooms,
    ownerId: cleanData.owner_id,
  });

  try {
    const { data, error } = await supabase
      .from("properties")
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error("[PROPERTY_REPOSITORY] createProperty failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        ownerId: propertyData.owner_id,
        imageCount: propertyData.images?.length ?? 0,
        fieldCount: Object.keys(cleanData).length,
        fieldTypes: Object.entries(cleanData).map(([k, v]) => ({ 
          key: k, 
          type: typeof v, 
          value: v 
        })),
      });
      throw error;
    }

    console.log("[PROPERTY_REPOSITORY] createProperty success:", {
      propertyId: data?.id,
      title: data?.title,
    });

    return data;
  } catch (error: any) {
    console.error("[PROPERTY_REPOSITORY] createProperty exception:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      originalData: {
        title: propertyData.title,
        price: propertyData.price,
        ownerId: propertyData.owner_id,
      },
    });
    throw error;
  }
}

export async function updateProperty(
  id: string,
  updateData: Record<string, any>
) {
  const supabase = getSupabaseOrThrow();

  if (!id) {
    throw new Error("Property ID is required for update");
  }

  // Create a clean copy of the update data
  const cleanUpdateData: Record<string, any> = {};

  // Map camelCase to snake_case and handle numeric conversions
  const validFields: Record<string, string> = {
    'title': 'title',
    'description': 'description',
    'address': 'address',
    'city': 'city',
    'state': 'state',
    'zipCode': 'zip_code',
    'zip_code': 'zip_code',
    'price': 'price',
    'bedrooms': 'bedrooms',
    'bathrooms': 'bathrooms',
    'squareFeet': 'square_feet',
    'square_feet': 'square_feet',
    'propertyType': 'property_type',
    'property_type': 'property_type',
    'amenities': 'amenities',
    'images': 'images',
    'latitude': 'latitude',
    'longitude': 'longitude',
    'furnished': 'furnished',
    'petsAllowed': 'pets_allowed',
    'pets_allowed': 'pets_allowed',
    'leaseTerm': 'lease_term',
    'lease_term': 'lease_term',
    'utilitiesIncluded': 'utilities_included',
    'utilities_included': 'utilities_included',
    'status': 'status',
    'listing_agent_id': 'listing_agent_id',
    'listingAgentId': 'listing_agent_id',
    'agency_id': 'agency_id',
    'agencyId': 'agency_id',
    'viewCount': 'view_count',
    'view_count': 'view_count',
    'deposit': 'deposit',
    'hoaFee': 'hoa_fee',
    'hoa_fee': 'hoa_fee',
    'yearBuilt': 'year_built',
    'year_built': 'year_built',
    'expiresAt': 'expires_at',
    'expires_at': 'expires_at',
    'publishAt': 'publish_at',
    'publish_at': 'publish_at'
  };

  const numericFields = ['price', 'bedrooms', 'bathrooms', 'square_feet', 'squareFeet', 'view_count', 'viewCount', 'deposit', 'hoa_fee', 'hoaFee', 'year_built', 'yearBuilt'];

  for (const [key, value] of Object.entries(updateData)) {
    if (value === undefined) continue;
    
    const dbKey = validFields[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    
    // Final check against known valid columns (to avoid Supabase errors)
  const knownColumns = [
    'title', 'description', 'address', 'city', 'state', 'zip_code',
    'price', 'bedrooms', 'bathrooms', 'square_feet', 'property_type',
    'amenities', 'images', 'latitude', 'longitude', 'furnished',
    'pets_allowed', 'lease_term', 'utilities_included', 'status', 'view_count',
    'listing_agent_id', 'agency_id',
    'deposit', 'hoa_fee', 'year_built', 'expires_at', 'publish_at',
    'updated_at'
  ];

    if (knownColumns.includes(dbKey)) {
      if (numericFields.includes(key) || numericFields.includes(dbKey)) {
        cleanUpdateData[dbKey] = (value === '' || value === null || isNaN(Number(value))) ? null : Number(value);
      } else {
        cleanUpdateData[dbKey] = value;
      }
    }
  }

  cleanUpdateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("properties")
    .update(cleanUpdateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[PROPERTY_REPOSITORY] updateProperty failed:", error);
    throw error;
  }

  return data;
}

export async function deleteProperty(id: string) {
  const supabase = getSupabaseOrThrow();

  console.log("[PROPERTY_REPOSITORY] deleteProperty called:", { id });

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[PROPERTY_REPOSITORY] deleteProperty failed:", {
      propertyId: id,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw error;
  }

  console.log("[PROPERTY_REPOSITORY] deleteProperty success:", { id });

  return null;
}

/* ------------------------------------------------ */
/* Analytics */
/* ------------------------------------------------ */

export async function incrementPropertyViews(propertyId: string) {
  const supabase = getSupabaseOrThrow();

  console.log("[PROPERTY_REPOSITORY] incrementPropertyViews called:", { propertyId });

  const { error } = await supabase.rpc("increment_property_views", {
    property_id: propertyId,
  });

  if (!error) {
    console.log("[PROPERTY_REPOSITORY] incrementPropertyViews RPC success:", { propertyId });
    return;
  }

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

  console.log("[PROPERTY_REPOSITORY] incrementPropertyViews fallback success:", {
    propertyId,
    newCount: currentViews + 1,
  });
}