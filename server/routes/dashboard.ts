import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";

export function registerDashboardRoutes(app: Express): void {
  app.get("/api/health", (_req, res) => {
    return res.json(success({ status: "ok", timestamp: new Date().toISOString() }, "Server is healthy"));
  });

  app.get("/api/user/dashboard", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const [applicationsResult, favoritesResult, savedSearchesResult, requirementsResult, reviewsResult, propertiesResult] = await Promise.all([
        supabase
          .from("applications")
          .select(`*, properties:property_id (id, title, address, city, state, price, bedrooms, bathrooms, images, status, property_type)`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("favorites")
          .select(`id, property_id, created_at, properties:property_id (id, title, address, city, state, price, bedrooms, bathrooms, images, status, property_type, square_feet)`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("saved_searches")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("requirements")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select(`*, properties:property_id (id, title, address, city)`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("properties")
          .select("*")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
      ]);

      const applications = (applicationsResult.data || []).map(app => ({
        ...app,
        property: app.properties
      }));

      const favorites = (favoritesResult.data || []).map(fav => ({
        ...fav,
        property: fav.properties
      }));

      const reviews = (reviewsResult.data || []).map(review => ({
        ...review,
        property: review.properties
      }));

      const stats = {
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        approvedApplications: applications.filter(a => a.status === 'approved').length,
        rejectedApplications: applications.filter(a => a.status === 'rejected').length,
        totalFavorites: favorites.length,
        totalSavedSearches: savedSearchesResult.data?.length || 0,
        totalRequirements: requirementsResult.data?.length || 0,
        totalReviews: reviews.length,
        totalProperties: propertiesResult.data?.length || 0
      };

      return res.json(success({
        applications,
        favorites,
        savedSearches: savedSearchesResult.data || [],
        requirements: requirementsResult.data || [],
        reviews,
        properties: propertiesResult.data || [],
        stats
      }, "User dashboard data fetched successfully"));
    } catch (err: any) {
      console.error("[DASHBOARD] Error fetching user dashboard:", err);
      return res.status(500).json(errorResponse("Failed to fetch user dashboard data"));
    }
  });

  app.get("/api/properties/:id/full", async (req, res) => {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (propertyError) {
        console.error("[PROPERTY] Supabase property error:", propertyError);
        throw propertyError;
      }

      let ownerData = null;
      if (propertyData?.owner_id) {
        const { data: owner, error: ownerError } = await supabase
          .from("users")
          .select("id, full_name, email, phone, profile_image, bio")
          .eq("id", propertyData.owner_id)
          .single();

        if (ownerError) {
          console.error("[PROPERTY] Supabase owner error:", ownerError);
        } else {
          ownerData = owner;
        }
      }

      const result = { ...propertyData, owner: ownerData };
      return res.json(success(result, "Property with owner fetched successfully"));
    } catch (err: any) {
      console.error("[PROPERTY] Error fetching property:", err);
      return res.status(500).json(errorResponse("Failed to fetch property"));
    }
  });
}
