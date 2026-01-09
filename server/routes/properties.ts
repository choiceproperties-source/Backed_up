import type { Express } from "express";
import { getSupabaseOrThrow, isSupabaseConfigured } from "../supabase";
import { authenticateToken, requireOwnership, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertPropertySchema } from "@shared/schema";
import { cache, CACHE_TTL } from "../cache";

function getSupabase() {
  return getSupabaseOrThrow();
}

import * as propertyService from "../modules/properties/property.service";

export function registerPropertyRoutes(app: Express): void {
  app.get("/api/properties", async (req, res) => {
    try {
      const params = {
        propertyType: req.query.propertyType as string,
        city: req.query.city as string,
        minPrice: req.query.minPrice as string,
        maxPrice: req.query.maxPrice as string,
        status: req.query.status as string,
        page: req.query.page as string,
        limit: req.query.limit as string
      };

      const result = await propertyService.getProperties(params);
      return res.json(success(result, "Properties fetched successfully"));
    } catch (err: any) {
      console.error("[ROUTES] GET /api/properties error:", err);
      return res.status(500).json(errorResponse("Failed to fetch properties"));
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const data = await propertyService.getPropertyById(req.params.id);
      if (!data) {
        return res.status(404).json(errorResponse("Property not found"));
      }
      return res.json(success(data, "Property fetched successfully"));
    } catch (err: any) {
      console.error("[ROUTES] GET /api/properties/:id error:", err);
      return res.status(500).json(errorResponse("Failed to fetch property"));
    }
  });

  app.post("/api/properties", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertPropertySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const propertyData = {
        ...validation.data,
        owner_id: req.user!.id,
      };

      const { data, error } = await getSupabase()
        .from("properties")
        .insert([propertyData])
        .select();

      if (error) throw error;
      
      cache.invalidate("properties:");
      
      return res.json(success(data[0], "Property created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create property"));
    }
  });

  app.patch("/api/properties/:id", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await getSupabase()
        .from("properties")
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      cache.invalidate("properties:");
      
      return res.json(success(data[0], "Property updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update property"));
    }
  });

  app.delete("/api/properties/:id", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { error } = await getSupabase()
        .from("properties")
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      cache.invalidate("properties:");
      
      return res.json(success(null, "Property deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete property"));
    }
  });

  app.get("/api/properties/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await getSupabase()
        .from("properties")
        .select("*")
        .eq("owner_id", req.params.userId);

      if (error) throw error;
      return res.json(success(data, "User properties fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user properties"));
    }
  });

  app.patch("/api/properties/:id/status", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { listingStatus, visibility } = req.body;
      
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (listingStatus) {
        updateData.listing_status = listingStatus;
        if (listingStatus === "available") {
          updateData.listed_at = new Date().toISOString();
        }
      }
      
      if (visibility) {
        updateData.visibility = visibility;
      }

      const { data, error } = await getSupabase()
        .from("properties")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      cache.invalidate("properties:");
      
      return res.json(success(data[0], "Property status updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update property status"));
    }
  });

  app.patch("/api/properties/:id/expiration", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { expirationDays, autoUnpublish } = req.body;
      
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (expirationDays !== undefined) {
        updateData.expiration_days = expirationDays;
        const baseDate = new Date();
        updateData.expires_at = new Date(baseDate.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString();
      }
      
      if (autoUnpublish !== undefined) {
        updateData.auto_unpublish = autoUnpublish;
      }

      const { data, error } = await getSupabase()
        .from("properties")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      
      return res.json(success(data[0], "Expiration settings updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update expiration settings"));
    }
  });

  app.patch("/api/properties/:id/price", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { price } = req.body;
      
      if (!price) {
        return res.status(400).json(errorResponse("Price is required"));
      }

      const { data: currentProperty, error: fetchError } = await getSupabase()
        .from("properties")
        .select("price, price_history")
        .eq("id", req.params.id)
        .single();

      if (fetchError) throw fetchError;

      const priceHistory = currentProperty.price_history || [];
      priceHistory.push({
        price: currentProperty.price,
        changedAt: new Date().toISOString(),
        changedBy: req.user!.id
      });

      const { data, error } = await getSupabase()
        .from("properties")
        .update({ 
          price,
          price_history: priceHistory,
          updated_at: new Date().toISOString() 
        })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      cache.invalidate("properties:");
      
      return res.json(success(data[0], "Price updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update price"));
    }
  });

  app.get("/api/properties/:id/analytics", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data: property, error: propertyError } = await getSupabase()
        .from("properties")
        .select("view_count, save_count, application_count, listed_at, price_history")
        .eq("id", req.params.id)
        .single();

      if (propertyError) throw propertyError;

      const { data: applications, error: appError } = await getSupabase()
        .from("applications")
        .select("status, created_at")
        .eq("property_id", req.params.id);

      if (appError) throw appError;

      const analytics = {
        views: property.view_count || 0,
        saves: property.save_count || 0,
        applicationCount: applications?.length || 0,
        applicationsByStatus: applications?.reduce((acc: Record<string, number>, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {}),
        listedAt: property.listed_at,
        priceHistory: property.price_history || [],
      };

      return res.json(success(analytics, "Property analytics fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch property analytics"));
    }
  });

  app.post("/api/properties/:id/view", async (req, res) => {
    try {
      const { error } = await getSupabase().rpc('increment_property_views', { property_id: req.params.id });
      
      if (error) {
        const { data: property } = await getSupabase()
          .from("properties")
          .select("view_count")
          .eq("id", req.params.id)
          .single();
        
        await getSupabase()
          .from("properties")
          .update({ view_count: (property?.view_count || 0) + 1 })
          .eq("id", req.params.id);
      }

      return res.json(success(null, "View recorded"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to record view"));
    }
  });

  app.get("/api/properties/:id/notes", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await getSupabase()
        .from("property_notes")
        .select("*, user:users(full_name, email)")
        .eq("property_id", req.params.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.json(success(data, "Notes fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch notes"));
    }
  });

  app.post("/api/properties/:id/notes", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { content, noteType = "general", isPinned = false } = req.body;
      
      if (!content) {
        return res.status(400).json(errorResponse("Note content is required"));
      }

      const { data, error } = await getSupabase()
        .from("property_notes")
        .insert({
          property_id: req.params.id,
          user_id: req.user!.id,
          content,
          note_type: noteType,
          is_pinned: isPinned
        })
        .select("*, user:users(full_name, email)");

      if (error) throw error;

      return res.json(success(data[0], "Note added successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to add note"));
    }
  });

  app.patch("/api/properties/:propertyId/notes/:noteId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { content, isPinned } = req.body;
      
      const { data: note, error: noteError } = await getSupabase()
        .from("property_notes")
        .select("user_id")
        .eq("id", req.params.noteId)
        .single();

      if (noteError || !note) {
        return res.status(404).json(errorResponse("Note not found"));
      }

      if (note.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Not authorized to edit this note"));
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (content !== undefined) updateData.content = content;
      if (isPinned !== undefined) updateData.is_pinned = isPinned;

      const { data, error } = await getSupabase()
        .from("property_notes")
        .update(updateData)
        .eq("id", req.params.noteId)
        .select("*, user:users(full_name, email)");

      if (error) throw error;

      return res.json(success(data[0], "Note updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update note"));
    }
  });

  app.delete("/api/properties/:propertyId/notes/:noteId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: note, error: noteError } = await getSupabase()
        .from("property_notes")
        .select("user_id")
        .eq("id", req.params.noteId)
        .single();

      if (noteError || !note) {
        return res.status(404).json(errorResponse("Note not found"));
      }

      if (note.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Not authorized to delete this note"));
      }

      const { error } = await getSupabase()
        .from("property_notes")
        .delete()
        .eq("id", req.params.noteId);

      if (error) throw error;

      return res.json(success(null, "Note deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete note"));
    }
  });

  app.get("/api/property-templates", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await getSupabase()
        .from("property_templates")
        .select("*")
        .eq("user_id", req.user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Templates fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch templates"));
    }
  });

  app.post("/api/property-templates", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, description, templateData } = req.body;
      
      if (!name) {
        return res.status(400).json(errorResponse("Template name is required"));
      }

      const { data, error } = await getSupabase()
        .from("property_templates")
        .insert({
          user_id: req.user!.id,
          name,
          description: description || null,
          template_data: templateData || {}
        })
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Template created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create template"));
    }
  });

  app.patch("/api/property-templates/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: template, error: templateError } = await getSupabase()
        .from("property_templates")
        .select("user_id")
        .eq("id", req.params.id)
        .single();

      if (templateError || !template) {
        return res.status(404).json(errorResponse("Template not found"));
      }

      if (template.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Not authorized to edit this template"));
      }

      const { name, description, templateData } = req.body;
      const updateData: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (templateData !== undefined) updateData.template_data = templateData;

      const { data, error } = await getSupabase()
        .from("property_templates")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Template updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update template"));
    }
  });

  app.delete("/api/property-templates/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: template, error: templateError } = await getSupabase()
        .from("property_templates")
        .select("user_id")
        .eq("id", req.params.id)
        .single();

      if (templateError || !template) {
        return res.status(404).json(errorResponse("Template not found"));
      }

      if (template.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Not authorized to delete this template"));
      }

      const { error } = await getSupabase()
        .from("property_templates")
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;
      return res.json(success(null, "Template deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete template"));
    }
  });

  app.post("/api/geocode", async (req, res) => {
    try {
      const { address, city, state, zipCode } = req.body;
      
      if (!address) {
        return res.status(400).json(errorResponse("Address is required"));
      }

      const fullAddress = [address, city, state, zipCode].filter(Boolean).join(", ");
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        {
          headers: {
            'User-Agent': 'ChoiceProperties/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to geocode address");
      }

      const results = await response.json();
      
      if (!results || results.length === 0) {
        return res.json(success({
          verified: false,
          message: "Address could not be verified"
        }, "Address verification complete"));
      }

      const result = results[0];
      return res.json(success({
        verified: true,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
        message: "Address verified successfully"
      }, "Address verified successfully"));
    } catch (err: any) {
      console.error("Geocoding error:", err);
      return res.status(500).json(errorResponse("Failed to verify address"));
    }
  });

  app.patch("/api/properties/:id/verify-address", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { latitude, longitude, addressVerified } = req.body;
      
      const updateData: any = { 
        address_verified: addressVerified ?? true,
        updated_at: new Date().toISOString() 
      };
      
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;

      const { data, error } = await getSupabase()
        .from("properties")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      
      return res.json(success(data[0], "Address verified successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to verify address"));
    }
  });
}
