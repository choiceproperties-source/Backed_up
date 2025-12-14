import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./supabase";
import imagekit from "./imagekit";
import { authenticateToken, optionalAuth, requireRole, requireOwnership, preventTenantPropertyEdit, type AuthenticatedRequest } from "./auth-middleware";
import { success, error as errorResponse } from "./response";
import {
  sendEmail,
  getAgentInquiryEmailTemplate,
  getApplicationConfirmationEmailTemplate,
} from "./email";
import { 
  notifyOwnerOfNewApplication,
  sendPaymentReceivedNotification,
  sendPaymentVerifiedNotification,
  sendDepositRequiredNotification,
  sendRentDueSoonNotification
} from "./notification-service";
import { generateSignedImageURL, canAccessPrivateImage } from "./image-transform";
import { archivePhoto, replacePhoto, reorderPhotos } from "./image-management";
import { logImageAudit } from "./image-audit";
import {
  signupSchema,
  loginSchema,
  insertPropertySchema,
  insertApplicationSchema,
  insertInquirySchema,
  insertRequirementSchema,
  insertReviewSchema,
  insertFavoriteSchema,
  insertSavedSearchSchema,
  insertNewsletterSubscriberSchema,
  insertContactMessageSchema,
  insertAgencySchema,
  insertTransactionSchema,
  insertAgentReviewSchema,
  insertPaymentVerificationSchema,
  PAYMENT_VERIFICATION_METHODS,
  leaseStatusUpdateSchema,
  LEASE_STATUS_TRANSITIONS,
  LEASE_STATUSES,
  insertLeaseTemplateSchema,
  insertLeaseDraftSchema,
  updateLeaseDraftSchema,
  leaseSendSchema,
  leaseAcceptSchema,
  leaseDeclineSchema,
  leaseSignatureEnableSchema,
  leaseSignSchema,
  leaseCounstersignSchema,
  moveInPrepareSchema,
  moveInChecklistUpdateSchema,
  insertPhotoSchema,
  PHOTO_CATEGORIES,
} from "@shared/schema";
import { authLimiter, signupLimiter, inquiryLimiter, newsletterLimiter } from "./rate-limit";
import { cache, CACHE_TTL } from "./cache";
import { registerSecurityRoutes } from "./security/routes";
import { logAuditEvent, logPropertyChange, logApplicationChange, logSecurityEvent, logLeaseAction, logPaymentAction, getAuditLogs, getPaymentAuditLogs } from "./security/audit-logger";
import { checkPropertyImageLimit, validateFileSize, MAX_IMAGES_PER_PROPERTY, MAX_FILE_SIZE_MB } from "./upload-limits";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Register security routes (2FA, audit logs, encryption, file validation)
  registerSecurityRoutes(app);

  // ===== AUTHENTICATION =====
  app.post("/api/auth/signup", signupLimiter, async (req, res) => {
    try {
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, password, fullName, phone, role = 'renter' } = validation.data;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        phone: phone || undefined,
        user_metadata: { full_name: fullName, phone: phone || null, role },
      });

      if (error) {
        if (error.message?.includes("duplicate") || error.message?.includes("already exists")) {
          return res.status(400).json({ error: "An account with this email already exists. Please sign in instead." });
        }
        console.error("[AUTH] Signup error:", error.message);
        return res.status(400).json({ error: error.message || "Signup failed. Please try again." });
      }

      // Store user data in users table
      if (data.user) {
        try {
          await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: email,
              full_name: fullName,
              phone: phone || null,
              role
            }, { onConflict: 'id' });
        } catch (profileError) {
          console.error('Failed to save user profile:', profileError);
        }
      }

      res.json({ success: true, user: data.user });
    } catch (err: any) {
      console.error("[AUTH] Signup exception:", err);
      res.status(500).json({ error: err.message || "Signup failed. Please try again." });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, password } = validation.data;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AUTH] Login error:", error.message);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({ success: true, session: data.session });
    } catch (err: any) {
      console.error("[AUTH] Login exception:", err);
      res.status(500).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      res.json({ success: true });
    } catch (err: any) {
      console.error("[AUTH] Logout exception:", err);
      res.status(500).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/resend-verification", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.email) {
        return res.status(400).json({ error: "No email address found" });
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: req.user.email,
      });

      if (error) {
        console.error("[AUTH] Resend verification error:", error.message);
        return res.status(400).json({ error: error.message || "Failed to resend verification email" });
      }

      res.json({ success: true, message: "Verification email sent" });
    } catch (err: any) {
      console.error("[AUTH] Resend verification exception:", err);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", req.user!.id)
        .single();

      if (error) throw error;
      return res.json(success(data, "User fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user"));
    }
  });

  // ===== PROPERTIES =====
  app.get("/api/properties", async (req, res) => {
    try {
      const { propertyType, city, minPrice, maxPrice, status, page = "1", limit = "20" } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNum - 1) * limitNum;

      const cacheKey = `properties:${propertyType || ''}:${city || ''}:${minPrice || ''}:${maxPrice || ''}:${status || 'active'}:${pageNum}:${limitNum}`;
      const cached = cache.get<{ properties: any; pagination: any }>(cacheKey);
      if (cached) {
        return res.json(success(cached, "Properties fetched successfully"));
      }

      let query = supabase.from("properties").select("*", { count: "exact" });

      if (propertyType) query = query.eq("property_type", propertyType);
      if (city) query = query.ilike("city", `%${city}%`);
      if (minPrice) query = query.gte("price", minPrice);
      if (maxPrice) query = query.lte("price", maxPrice);
      if (status) {
        query = query.eq("status", status);
      } else {
        query = query.eq("status", "active");
      }

      query = query.order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      
      const totalPages = Math.ceil((count || 0) / limitNum);
      
      const result = {
        properties: data,
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

      return res.json(success(result, "Properties fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch properties"));
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const cacheKey = `property:${req.params.id}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(success(cached, "Property fetched successfully"));
      }

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (error) throw error;
      
      cache.set(cacheKey, data, CACHE_TTL.PROPERTY_DETAIL);
      
      return res.json(success(data, "Property fetched successfully"));
    } catch (err: any) {
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

      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", req.params.userId);

      if (error) throw error;
      return res.json(success(data, "User properties fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user properties"));
    }
  });

  // ===== PROPERTY MANAGEMENT =====
  // Update property listing status
  app.patch("/api/properties/:id/status", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { listingStatus, visibility } = req.body;
      
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (listingStatus) {
        updateData.listing_status = listingStatus;
        // Set listedAt when publishing
        if (listingStatus === "available") {
          updateData.listed_at = new Date().toISOString();
        }
      }
      
      if (visibility) {
        updateData.visibility = visibility;
      }

      const { data, error } = await supabase
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

  // Update property expiration settings
  app.patch("/api/properties/:id/expiration", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { expirationDays, autoUnpublish } = req.body;
      
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (expirationDays !== undefined) {
        updateData.expiration_days = expirationDays;
        // Calculate new expiration date from listed_at or now
        const baseDate = new Date();
        updateData.expires_at = new Date(baseDate.getTime() + expirationDays * 24 * 60 * 60 * 1000).toISOString();
      }
      
      if (autoUnpublish !== undefined) {
        updateData.auto_unpublish = autoUnpublish;
      }

      const { data, error } = await supabase
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

  // Track property price history
  app.patch("/api/properties/:id/price", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { price } = req.body;
      
      if (!price) {
        return res.status(400).json(errorResponse("Price is required"));
      }

      // Get current property to append to price history
      const { data: currentProperty, error: fetchError } = await supabase
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

      const { data, error } = await supabase
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

  // Get property analytics (views, saves, applications)
  app.get("/api/properties/:id/analytics", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("view_count, save_count, application_count, listed_at, price_history")
        .eq("id", req.params.id)
        .single();

      if (propertyError) throw propertyError;

      // Get application stats
      const { data: applications, error: appError } = await supabase
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

  // Increment property view count
  app.post("/api/properties/:id/view", async (req, res) => {
    try {
      const { error } = await supabase.rpc('increment_property_views', { property_id: req.params.id });
      
      if (error) {
        // Fallback to manual increment if RPC doesn't exist
        const { data: property } = await supabase
          .from("properties")
          .select("view_count")
          .eq("id", req.params.id)
          .single();
        
        await supabase
          .from("properties")
          .update({ view_count: (property?.view_count || 0) + 1 })
          .eq("id", req.params.id);
      }

      return res.json(success(null, "View recorded"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to record view"));
    }
  });

  // ===== PROPERTY NOTES =====
  // Get notes for a property
  app.get("/api/properties/:id/notes", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
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

  // Add a note to a property
  app.post("/api/properties/:id/notes", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { content, noteType = "general", isPinned = false } = req.body;
      
      if (!content) {
        return res.status(400).json(errorResponse("Note content is required"));
      }

      const { data, error } = await supabase
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

  // Update a note
  app.patch("/api/properties/:propertyId/notes/:noteId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { content, isPinned } = req.body;
      
      // Verify ownership
      const { data: note, error: noteError } = await supabase
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

      const { data, error } = await supabase
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

  // Delete a note
  app.delete("/api/properties/:propertyId/notes/:noteId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Verify ownership
      const { data: note, error: noteError } = await supabase
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

      const { error } = await supabase
        .from("property_notes")
        .delete()
        .eq("id", req.params.noteId);

      if (error) throw error;

      return res.json(success(null, "Note deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete note"));
    }
  });

  // ===== PROPERTY TEMPLATES =====
  // Get all templates for a user
  app.get("/api/property-templates", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
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

  // Create a property template
  app.post("/api/property-templates", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, description, templateData } = req.body;
      
      if (!name) {
        return res.status(400).json(errorResponse("Template name is required"));
      }

      const { data, error } = await supabase
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

  // Update a property template
  app.patch("/api/property-templates/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Verify ownership
      const { data: template, error: templateError } = await supabase
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

      const { data, error } = await supabase
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

  // Delete a property template
  app.delete("/api/property-templates/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Verify ownership
      const { data: template, error: templateError } = await supabase
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

      const { error } = await supabase
        .from("property_templates")
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;
      return res.json(success(null, "Template deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete template"));
    }
  });

  // ===== ADDRESS VERIFICATION (GEOCODING) =====
  // Geocode an address using OpenStreetMap Nominatim API
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

  // Update property with verified address
  app.patch("/api/properties/:id/verify-address", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { latitude, longitude, addressVerified } = req.body;
      
      const updateData: any = { 
        address_verified: addressVerified ?? true,
        updated_at: new Date().toISOString() 
      };
      
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;

      const { data, error } = await supabase
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

  // ===== SCHEDULED PUBLISHING =====
  // Schedule a property for future publishing
  app.patch("/api/properties/:id/schedule-publish", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { scheduledPublishAt } = req.body;
      
      const updateData: any = { 
        updated_at: new Date().toISOString() 
      };

      if (scheduledPublishAt) {
        const scheduledDate = new Date(scheduledPublishAt);
        if (scheduledDate <= new Date()) {
          return res.status(400).json(errorResponse("Scheduled date must be in the future"));
        }
        updateData.scheduled_publish_at = scheduledDate.toISOString();
        updateData.listing_status = "coming_soon";
      } else {
        // Clear scheduled publish
        updateData.scheduled_publish_at = null;
      }

      const { data, error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      
      cache.invalidate(`property:${req.params.id}`);
      cache.invalidate("properties:");
      
      return res.json(success(data[0], scheduledPublishAt 
        ? "Property scheduled for publishing" 
        : "Scheduled publish cleared"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to schedule publish"));
    }
  });

  // ===== APPLICATIONS =====
  // Mock payment processing endpoint
  app.post("/api/payments/process", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, amount, cardToken } = req.body;
      
      if (!applicationId || !amount) {
        return res.status(400).json({ error: "Missing applicationId or amount" });
      }

      // Simulate payment processing (in real app, would call Stripe/PayPal/etc)
      const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockTransactionId = `txn_${Date.now()}`;

      // In production, verify amount matches application fee
      // For now, mock success after 100ms delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));

      return res.json(success({
        paymentId: mockPaymentId,
        transactionId: mockTransactionId,
        amount,
        status: "completed",
        timestamp: new Date().toISOString(),
        message: "[MOCK PAYMENT] In production, this would process with real payment provider"
      }, "Payment processed successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to process payment"));
    }
  });

  // Record payment attempt for an application
  app.post("/api/applications/:id/payment-attempt", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { referenceId, status, amount, errorMessage } = req.body;
      
      if (!referenceId || !status || !amount) {
        return res.status(400).json({ error: "Missing required fields: referenceId, status, amount" });
      }

      // Verify application exists and user has access
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select("id, user_id, payment_attempts, payment_status")
        .eq("id", req.params.id)
        .single();

      if (appError || !application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify user owns this application or is admin
      if (application.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Create new payment attempt record
      const newAttempt = {
        referenceId,
        timestamp: new Date().toISOString(),
        status,
        amount,
        errorMessage: errorMessage || null,
      };

      // Append to existing attempts or create new array
      const existingAttempts = application.payment_attempts || [];
      const updatedAttempts = [...existingAttempts, newAttempt];

      // Determine new payment status based on attempt status
      let newPaymentStatus = application.payment_status;
      if (status === 'success') {
        newPaymentStatus = 'paid';
      } else if (status === 'failed' && application.payment_status !== 'paid') {
        newPaymentStatus = 'failed';
      }

      // Update application with new payment attempt
      const updateData: any = {
        payment_attempts: updatedAttempts,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      };

      // Set payment_paid_at if successful
      if (status === 'success') {
        updateData.payment_paid_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Payment attempt recorded"));
    } catch (err: any) {
      console.error("[PAYMENT] Record attempt error:", err);
      return res.status(500).json(errorResponse("Failed to record payment attempt"));
    }
  });

  // Manual payment verification endpoint (landlord/admin only)
  app.post("/api/applications/:id/verify-payment", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount, paymentMethod, receivedAt, internalNote, confirmationChecked } = req.body;
      
      // Validate required fields
      if (!amount || !paymentMethod || !receivedAt) {
        return res.status(400).json(errorResponse("Missing required fields: amount, paymentMethod, receivedAt"));
      }

      // Validate confirmation checkbox
      if (!confirmationChecked) {
        return res.status(400).json(errorResponse("You must confirm the application fee has been received"));
      }

      // Validate payment method
      if (!PAYMENT_VERIFICATION_METHODS.includes(paymentMethod)) {
        return res.status(400).json(errorResponse("Invalid payment method"));
      }

      // Get application with property owner info
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select(`
          *,
          properties:property_id(id, owner_id, title, address, listing_agent_id),
          users:user_id(id, full_name, email)
        `)
        .eq("id", req.params.id)
        .single();

      if (appError || !application) {
        return res.status(404).json(errorResponse("Application not found"));
      }

      // Check if payment already verified
      if (application.manual_payment_verified || application.payment_status === 'paid' || application.payment_status === 'manually_verified') {
        return res.status(400).json(errorResponse("Payment has already been verified for this application"));
      }

      // Check user authorization (must be property owner, listing agent, or admin)
      const isOwner = application.properties?.owner_id === req.user!.id;
      const isAgent = application.properties?.listing_agent_id === req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      
      if (!isOwner && !isAgent && !isAdmin) {
        return res.status(403).json(errorResponse("Not authorized to verify payments for this application"));
      }

      // Generate reference ID for manual verification
      const referenceId = `MV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create payment verification record
      const { data: verification, error: verifyError } = await supabase
        .from("payment_verifications")
        .insert([{
          application_id: req.params.id,
          verified_by: req.user!.id,
          amount,
          payment_method: paymentMethod,
          received_at: receivedAt,
          reference_id: referenceId,
          internal_note: internalNote || null,
          confirmation_checked: true,
          previous_payment_status: application.payment_status,
        }])
        .select()
        .single();

      if (verifyError) throw verifyError;

      // Build status history entry
      const statusHistoryEntry = {
        status: 'payment_verified',
        changedAt: new Date().toISOString(),
        changedBy: req.user!.id,
        reason: `Manual payment verified via ${paymentMethod}. Amount: $${amount}`
      };

      const existingHistory = application.status_history || [];

      // Update application with manual verification info
      const { data: updatedApp, error: updateError } = await supabase
        .from("applications")
        .update({
          payment_status: 'manually_verified',
          status: 'payment_verified',
          previous_status: application.status,
          status_history: [...existingHistory, statusHistoryEntry],
          manual_payment_verified: true,
          manual_payment_verified_at: new Date().toISOString(),
          manual_payment_verified_by: req.user!.id,
          manual_payment_amount: amount,
          manual_payment_method: paymentMethod,
          manual_payment_received_at: receivedAt,
          manual_payment_note: internalNote || null,
          manual_payment_reference_id: referenceId,
          payment_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        action: 'payment_verify_manual',
        resourceType: 'application',
        resourceId: req.params.id,
        metadata: {
          previousPaymentStatus: application.payment_status,
          newPaymentStatus: 'manually_verified',
          amount,
          paymentMethod,
          referenceId,
        },
        req,
      });

      // Insert system message in the conversation if exists
      if (application.conversation_id) {
        await supabase
          .from("messages")
          .insert([{
            conversation_id: application.conversation_id,
            sender_id: req.user!.id,
            content: `System: Application fee verified ($${amount} via ${paymentMethod}). Application moved to review stage. Reference: ${referenceId}`,
            message_type: "system",
          }]);
      }

      // Create notification for tenant
      await supabase
        .from("application_notifications")
        .insert([{
          application_id: req.params.id,
          user_id: application.user_id,
          notification_type: "payment_verified",
          channel: "in_app",
          subject: "Application Fee Verified",
          content: `Your application fee of $${amount} has been verified. Your application is now under review.`,
          status: "pending",
        }]);

      return res.json(success({
        application: updatedApp,
        verification,
        referenceId,
      }, "Payment verified successfully. Application moved to review stage."));
    } catch (err: any) {
      console.error("[PAYMENT] Manual verification error:", err);
      return res.status(500).json(errorResponse("Failed to verify payment"));
    }
  });

  // Get payment verification history for an application
  app.get("/api/applications/:id/payment-verifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get application with property info
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select(`*, properties:property_id(owner_id, listing_agent_id)`)
        .eq("id", req.params.id)
        .single();

      if (appError || !application) {
        return res.status(404).json(errorResponse("Application not found"));
      }

      // Check authorization
      const isOwner = application.properties?.owner_id === req.user!.id;
      const isAgent = application.properties?.listing_agent_id === req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const isApplicant = application.user_id === req.user!.id;

      if (!isOwner && !isAgent && !isAdmin && !isApplicant) {
        return res.status(403).json(errorResponse("Not authorized to view payment verifications"));
      }

      // Get payment verifications
      const { data: verifications, error } = await supabase
        .from("payment_verifications")
        .select(`*, users:verified_by(id, full_name, email)`)
        .eq("application_id", req.params.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For tenants, hide internal notes
      const sanitizedVerifications = verifications?.map(v => {
        if (isApplicant && !isOwner && !isAgent && !isAdmin) {
          return { ...v, internal_note: null };
        }
        return v;
      });

      return res.json(success({
        verifications: sanitizedVerifications || [],
        paymentAttempts: application.payment_attempts || [],
        currentStatus: application.payment_status,
        manuallyVerified: application.manual_payment_verified,
      }, "Payment history fetched successfully"));
    } catch (err: any) {
      console.error("[PAYMENT] Get verifications error:", err);
      return res.status(500).json(errorResponse("Failed to fetch payment verifications"));
    }
  });

  // Application review actions (approve, reject, request info)
  app.post("/api/applications/:id/review-action", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { action, reason, conditionalRequirements, dueDate } = req.body;
      
      const validActions = ['approve', 'reject', 'conditional_approve', 'request_info', 'submit_for_review'];
      if (!validActions.includes(action)) {
        return res.status(400).json(errorResponse("Invalid action. Must be: approve, reject, conditional_approve, request_info, or submit_for_review"));
      }

      // Get application with property info
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select(`
          *,
          properties:property_id(id, owner_id, title, address, listing_agent_id),
          users:user_id(id, full_name, email)
        `)
        .eq("id", req.params.id)
        .single();

      if (appError || !application) {
        return res.status(404).json(errorResponse("Application not found"));
      }

      // Check authorization for landlord/agent actions
      const isOwner = application.properties?.owner_id === req.user!.id;
      const isAgent = application.properties?.listing_agent_id === req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const isApplicant = application.user_id === req.user!.id;

      // For submit_for_review, applicant can do it
      if (action === 'submit_for_review') {
        if (!isApplicant && !isAdmin) {
          return res.status(403).json(errorResponse("Only the applicant can submit for review"));
        }
        // Check if payment is verified
        if (application.payment_status !== 'manually_verified' && application.payment_status !== 'paid') {
          return res.status(400).json(errorResponse("Payment must be verified before submitting for review"));
        }
      } else {
        // For other actions, must be owner/agent/admin
        if (!isOwner && !isAgent && !isAdmin) {
          return res.status(403).json(errorResponse("Not authorized to perform this action"));
        }
      }

      // Determine new status and validation
      let newStatus = application.status;
      let updateData: any = {
        updated_at: new Date().toISOString(),
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString(),
      };

      switch (action) {
        case 'submit_for_review':
          if (application.status !== 'payment_verified' && application.status !== 'draft') {
            return res.status(400).json(errorResponse("Application cannot be submitted for review in its current state"));
          }
          newStatus = 'submitted';
          break;
          
        case 'approve':
          if (!['submitted', 'under_review', 'info_requested', 'conditional_approval'].includes(application.status)) {
            return res.status(400).json(errorResponse("Application cannot be approved in its current state"));
          }
          newStatus = 'approved';
          updateData.lease_status = 'preparing';
          break;
          
        case 'reject':
          if (!reason) {
            return res.status(400).json(errorResponse("Rejection reason is required"));
          }
          if (!['submitted', 'under_review', 'info_requested'].includes(application.status)) {
            return res.status(400).json(errorResponse("Application cannot be rejected in its current state"));
          }
          newStatus = 'rejected';
          updateData.rejection_reason = reason;
          updateData.rejection_details = { explanation: reason, appealable: true, categories: [] };
          break;
          
        case 'conditional_approve':
          if (!conditionalRequirements) {
            return res.status(400).json(errorResponse("Conditional requirements are required"));
          }
          if (!['submitted', 'under_review', 'info_requested'].includes(application.status)) {
            return res.status(400).json(errorResponse("Application cannot be conditionally approved in its current state"));
          }
          newStatus = 'conditional_approval';
          updateData.conditional_approval_reason = typeof conditionalRequirements === 'string' 
            ? conditionalRequirements 
            : JSON.stringify(conditionalRequirements);
          updateData.conditional_approval_at = new Date().toISOString();
          updateData.conditional_approval_by = req.user!.id;
          if (Array.isArray(conditionalRequirements)) {
            updateData.conditional_requirements = conditionalRequirements.map((req: any, index: number) => ({
              id: `req-${Date.now()}-${index}`,
              type: req.type || 'information',
              description: req.description || req,
              required: req.required !== false,
              satisfied: false,
            }));
          }
          if (dueDate) {
            updateData.conditional_approval_due_date = dueDate;
          }
          break;
          
        case 'request_info':
          if (!reason) {
            return res.status(400).json(errorResponse("Information request reason is required"));
          }
          if (!['submitted', 'under_review'].includes(application.status)) {
            return res.status(400).json(errorResponse("Cannot request info in the current state"));
          }
          newStatus = 'info_requested';
          updateData.info_requested_reason = reason;
          updateData.info_requested_at = new Date().toISOString();
          updateData.info_requested_by = req.user!.id;
          if (dueDate) {
            updateData.info_requested_due_date = dueDate;
          }
          break;
      }

      // Build status history
      const statusHistoryEntry = {
        status: newStatus,
        changedAt: new Date().toISOString(),
        changedBy: req.user!.id,
        reason: reason || `Application ${action.replace('_', ' ')}`,
      };

      const existingHistory = application.status_history || [];
      
      updateData.status = newStatus;
      updateData.previous_status = application.status;
      updateData.status_history = [...existingHistory, statusHistoryEntry];

      // Update application
      const { data: updatedApp, error: updateError } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        action: `application_${action}`,
        resourceType: 'application',
        resourceId: req.params.id,
        metadata: {
          previousStatus: application.status,
          newStatus,
          reason,
        },
        req,
      });

      // Send system message if conversation exists
      if (application.conversation_id) {
        let messageContent = '';
        switch (action) {
          case 'submit_for_review':
            messageContent = 'System: Application has been submitted for review.';
            break;
          case 'approve':
            messageContent = 'System: Congratulations! Your application has been approved.';
            break;
          case 'reject':
            messageContent = `System: Your application has been declined. Reason: ${reason}`;
            break;
          case 'conditional_approve':
            messageContent = `System: Your application has been conditionally approved. Additional requirements: ${conditionalRequirements}`;
            break;
          case 'request_info':
            messageContent = `System: Additional information has been requested: ${reason}`;
            break;
        }
        
        if (messageContent) {
          await supabase
            .from("messages")
            .insert([{
              conversation_id: application.conversation_id,
              sender_id: req.user!.id,
              content: messageContent,
              message_type: "system",
            }]);
        }
      }

      // Create notification for the appropriate party
      const notificationUserId = action === 'submit_for_review' 
        ? application.properties?.owner_id 
        : application.user_id;

      if (notificationUserId) {
        await supabase
          .from("application_notifications")
          .insert([{
            application_id: req.params.id,
            user_id: notificationUserId,
            notification_type: `application_${action}`,
            channel: "in_app",
            subject: `Application ${action.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
            content: reason || `Application has been ${action.replace('_', ' ')}`,
            status: "pending",
          }]);
      }

      return res.json(success(updatedApp, `Application ${action.replace('_', ' ')} successfully`));
    } catch (err: any) {
      console.error("[APPLICATION] Review action error:", err);
      return res.status(500).json(errorResponse("Failed to process application action"));
    }
  });

  // Get application audit trail
  app.get("/api/applications/:id/audit-trail", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Get application with property info
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select(`*, properties:property_id(owner_id, listing_agent_id)`)
        .eq("id", req.params.id)
        .single();

      if (appError || !application) {
        return res.status(404).json(errorResponse("Application not found"));
      }

      // Check authorization
      const isOwner = application.properties?.owner_id === req.user!.id;
      const isAgent = application.properties?.listing_agent_id === req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const isApplicant = application.user_id === req.user!.id;

      if (!isOwner && !isAgent && !isAdmin && !isApplicant) {
        return res.status(403).json(errorResponse("Not authorized to view audit trail"));
      }

      // Get audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from("audit_logs")
        .select(`*, users:user_id(id, full_name, email)`)
        .eq("resource_type", "application")
        .eq("resource_id", req.params.id)
        .order("created_at", { ascending: false });

      if (auditError) throw auditError;

      // Get payment verifications
      const { data: paymentVerifications, error: pvError } = await supabase
        .from("payment_verifications")
        .select(`*, users:verified_by(id, full_name)`)
        .eq("application_id", req.params.id)
        .order("created_at", { ascending: false });

      if (pvError) throw pvError;

      // Get application comments
      const { data: comments, error: commentsError } = await supabase
        .from("application_comments")
        .select(`*, users:user_id(id, full_name)`)
        .eq("application_id", req.params.id)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      // For tenants, filter out internal comments and notes
      let filteredComments = comments || [];
      let filteredVerifications = paymentVerifications || [];
      
      if (isApplicant && !isOwner && !isAgent && !isAdmin) {
        filteredComments = filteredComments.filter(c => !c.is_internal);
        filteredVerifications = filteredVerifications.map(v => ({
          ...v,
          internal_note: null,
        }));
      }

      return res.json(success({
        statusHistory: application.status_history || [],
        paymentAttempts: application.payment_attempts || [],
        paymentVerifications: filteredVerifications,
        auditLogs: auditLogs || [],
        comments: filteredComments,
        currentStatus: application.status,
        paymentStatus: application.payment_status,
      }, "Audit trail fetched successfully"));
    } catch (err: any) {
      console.error("[APPLICATION] Audit trail error:", err);
      return res.status(500).json(errorResponse("Failed to fetch audit trail"));
    }
  });

  // Endpoint for guest and authenticated users to submit applications
  app.post("/api/applications/guest", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertApplicationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const guestEmail = (req.body as any).guestEmail;
      const guestName = (req.body as any).guestName;
      const propertyId = validation.data.propertyId;

      // Check for duplicate application (guest or authenticated)
      if (req.user) {
        const { data: existing } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", req.user.id)
          .eq("property_id", propertyId)
          .single();
        
        if (existing) {
          return res.status(409).json({ error: "You have already applied for this property" });
        }
      }

      let userId = req.user?.id || null;

      // Create guest user if not authenticated
      if (!userId && guestEmail) {
        // Generate secure temporary password for guest
        const tempPassword = Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
        
        const { data: guestUser, error: guestError } = await supabase
          .from("users")
          .insert([{
            email: guestEmail,
            full_name: guestName || "Guest User",
            role: "renter",
            password_hash: tempPassword, // Temporary secure hash
          }])
          .select("id")
          .single();

        if (guestUser?.id) {
          userId = guestUser.id;
        }
      }

      const applicationData = {
        ...validation.data,
        user_id: userId,
        status: "submitted", // Set status to submitted instead of draft
      };

      const { data, error } = await supabase
        .from("applications")
        .insert([applicationData])
        .select();

      if (error) throw error;

      const appId = data[0]?.id;

      // Get property owner ID to create conversation
      const { data: propertyData } = await supabase
        .from("properties")
        .select("owner_id, title")
        .eq("id", propertyId)
        .single();

      // Create conversation linking tenant and landlord
      if (appId && propertyData?.owner_id && userId) {
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .insert([{
            property_id: propertyId,
            application_id: appId,
            subject: `Application for ${propertyData.title}`,
          }])
          .select()
          .single();

        if (conversation && !convError) {
          // Add both participants
          await supabase.from("conversation_participants").insert([
            { conversation_id: conversation.id, user_id: userId },
            { conversation_id: conversation.id, user_id: propertyData.owner_id },
          ]);

          // Update application with conversation_id
          await supabase
            .from("applications")
            .update({ conversation_id: conversation.id })
            .eq("id", appId);
        }
      }

      // Send confirmation email to authenticated user or guest
      const emailTo = req.user ? 
        (await supabase.from("users").select("email, full_name").eq("id", req.user.id).single()).data :
        { email: guestEmail, full_name: guestName };

      if (emailTo?.email) {
        sendEmail({
          to: emailTo.email,
          subject: "Your Application Has Been Received",
          html: getApplicationConfirmationEmailTemplate({
            applicantName: emailTo.full_name || "Applicant",
            propertyTitle: propertyData?.title || "Your Property",
          }),
        }).catch((err) => console.error("Email send error:", err));
      }

      // Notify property owner of new application
      if (appId) {
        notifyOwnerOfNewApplication(appId).catch((err) => 
          console.error("Owner notification error:", err)
        );
      }

      return res.json(success(data[0], "Application submitted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to submit application"));
    }
  });

  app.post("/api/applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertApplicationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const propertyId = validation.data.propertyId;

      // Prevent duplicate applications per property per user
      const { data: existing, error: checkError } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", req.user!.id)
        .eq("property_id", propertyId)
        .single();
      
      if (existing) {
        return res.status(409).json({ error: "You have already applied for this property. Please check your existing applications." });
      }

      const applicationData = {
        ...validation.data,
        user_id: req.user!.id,
        status: "submitted", // Set status to submitted instead of draft
      };

      const { data, error } = await supabase
        .from("applications")
        .insert([applicationData])
        .select();

      if (error) throw error;

      const appId = data[0]?.id;

      const { data: userData } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", req.user!.id)
        .single();

      const { data: propertyData } = await supabase
        .from("properties")
        .select("title, owner_id")
        .eq("id", propertyId)
        .single();

      // Create conversation linking tenant and landlord
      if (appId && propertyData?.owner_id) {
        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .insert([{
            property_id: propertyId,
            application_id: appId,
            subject: `Application for ${propertyData.title}`,
          }])
          .select()
          .single();

        if (conversation && !convError) {
          // Add both participants
          await supabase.from("conversation_participants").insert([
            { conversation_id: conversation.id, user_id: req.user!.id },
            { conversation_id: conversation.id, user_id: propertyData.owner_id },
          ]);

          // Update application with conversation_id
          await supabase
            .from("applications")
            .update({ conversation_id: conversation.id })
            .eq("id", appId);
        }
      }

      if (userData?.email) {
        // Fire-and-forget email sending (don't block request)
        sendEmail({
          to: userData.email,
          subject: "Your Application Has Been Received",
          html: getApplicationConfirmationEmailTemplate({
            applicantName: userData.full_name || "Applicant",
            propertyTitle: propertyData?.title || "Your Property",
          }),
        }).catch((err) => console.error("Email send error:", err));
      }

      // Notify property owner of new application
      if (appId) {
        notifyOwnerOfNewApplication(appId).catch((err) => 
          console.error("Owner notification error:", err)
        );
      }

      return res.json(success(data[0], "Application submitted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to submit application"));
    }
  });

  app.get("/api/applications/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("applications")
        .select("*, properties(*)")
        .eq("user_id", req.params.userId);

      if (error) throw error;
      return res.json(success(data, "User applications fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user applications"));
    }
  });

  app.get("/api/applications/owner", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Allow owners, agents, and admins to access this endpoint
      if (req.user!.role !== "owner" && req.user!.role !== "agent" && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized - property owners/agents/admins only" });
      }

      const { data: ownedProperties, error: propError } = await supabase
        .from("properties")
        .select("id")
        .eq("owner_id", req.user!.id);

      if (propError) throw propError;

      if (!ownedProperties || ownedProperties.length === 0) {
        return res.json(success([], "No applications found"));
      }

      const propertyIds = ownedProperties.map(p => p.id);

      const { data, error } = await supabase
        .from("applications")
        .select("*, users(id, full_name, email, phone), properties(id, title, address, city, state)")
        .in("property_id", propertyIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Owner applications fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch owner applications"));
    }
  });

  app.get("/api/applications/property/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", req.params.propertyId)
        .single();

      if (propertyError || !property) {
        return res.status(404).json(errorResponse("Property not found"));
      }

      if (property.owner_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("applications")
        .select("*, users(id, full_name, email, phone)")
        .eq("property_id", req.params.propertyId);

      if (error) throw error;
      return res.json(success(data, "Property applications fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch property applications"));
    }
  });

  app.patch("/api/applications/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isOwner = application.user_id === req.user!.id;
      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isOwner && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("applications")
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Application updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update application"));
    }
  });

  // ===== DRAFT AUTO-SAVE ENDPOINT =====
  // Save draft application data (auto-save) - only for draft status applications
  app.patch("/api/applications/:id/draft", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { step, personalInfo, rentalHistory, employment, references, disclosures, documents, customAnswers } = req.body;

      // Get current application and verify ownership
      const { data: application, error: fetchError } = await supabase
        .from("applications")
        .select("user_id, status")
        .eq("id", req.params.id)
        .single();

      if (fetchError || !application) {
        return res.status(404).json(errorResponse("Application not found"));
      }

      // Only the applicant can save their draft
      if (application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to edit this application" });
      }

      // Only allow saving drafts for applications in draft status
      if (application.status !== "draft") {
        return res.status(400).json({ error: "Cannot modify a submitted application. Only draft applications can be edited." });
      }

      // Build update object with only provided fields
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (step !== undefined) {
        updateData.step = step;
        updateData.last_saved_step = step;
      }
      if (personalInfo !== undefined) updateData.personal_info = personalInfo;
      if (rentalHistory !== undefined) updateData.rental_history = rentalHistory;
      if (employment !== undefined) updateData.employment = employment;
      if (references !== undefined) updateData.references = references;
      if (disclosures !== undefined) updateData.disclosures = disclosures;
      if (documents !== undefined) updateData.documents = documents;
      if (customAnswers !== undefined) updateData.custom_answers = customAnswers;

      const { data, error } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Draft saved successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to save draft"));
    }
  });

  // Create or get draft application for a property
  app.post("/api/applications/:propertyId/draft", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = req.params.propertyId;

      // Check if user already has an application for this property
      const { data: existing, error: checkError } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", req.user!.id)
        .eq("property_id", propertyId)
        .single();
      
      if (existing) {
        // Return existing application
        return res.json(success(existing, "Existing application found"));
      }

      // Create new draft application
      const { data, error } = await supabase
        .from("applications")
        .insert([{
          property_id: propertyId,
          user_id: req.user!.id,
          status: "draft",
          step: 0,
          last_saved_step: 0
        }])
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Draft application created"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create draft application"));
    }
  });

  // ===== PROPERTY CUSTOM QUESTIONS =====
  // Get custom questions for a property (public - for application form)
  app.get("/api/properties/:propertyId/questions", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("property_questions")
        .select("*")
        .eq("property_id", req.params.propertyId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return res.json(success(data || [], "Property questions fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch property questions"));
    }
  });

  // Get all questions for a property (including inactive - for property owner management)
  app.get("/api/properties/:propertyId/questions/all", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("property_questions")
        .select("*")
        .eq("property_id", req.params.propertyId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return res.json(success(data || [], "All property questions fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch property questions"));
    }
  });

  // Create a custom question for a property
  app.post("/api/properties/:propertyId/questions", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { question, questionType = "text", options, required = false, displayOrder = 0 } = req.body;

      if (!question || question.trim() === "") {
        return res.status(400).json(errorResponse("Question text is required"));
      }

      const { data, error } = await supabase
        .from("property_questions")
        .insert([{
          property_id: req.params.propertyId,
          question: question.trim(),
          question_type: questionType,
          options: options || null,
          required,
          display_order: displayOrder,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Question created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create question"));
    }
  });

  // Update a custom question
  app.patch("/api/properties/:propertyId/questions/:questionId", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { question, questionType, options, required, displayOrder, isActive } = req.body;

      const updateData: any = { updated_at: new Date().toISOString() };
      if (question !== undefined) updateData.question = question.trim();
      if (questionType !== undefined) updateData.question_type = questionType;
      if (options !== undefined) updateData.options = options;
      if (required !== undefined) updateData.required = required;
      if (displayOrder !== undefined) updateData.display_order = displayOrder;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data, error } = await supabase
        .from("property_questions")
        .update(updateData)
        .eq("id", req.params.questionId)
        .eq("property_id", req.params.propertyId)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Question updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update question"));
    }
  });

  // Delete a custom question
  app.delete("/api/properties/:propertyId/questions/:questionId", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { error } = await supabase
        .from("property_questions")
        .delete()
        .eq("id", req.params.questionId)
        .eq("property_id", req.params.propertyId);

      if (error) throw error;
      return res.json(success(null, "Question deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete question"));
    }
  });

  // Reorder questions for a property
  app.patch("/api/properties/:propertyId/questions/reorder", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
    try {
      const { questionIds } = req.body; // Array of question IDs in new order

      if (!Array.isArray(questionIds)) {
        return res.status(400).json(errorResponse("questionIds must be an array"));
      }

      // Update display_order for each question
      const updates = questionIds.map((id: string, index: number) => 
        supabase
          .from("property_questions")
          .update({ display_order: index, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("property_id", req.params.propertyId)
      );

      await Promise.all(updates);

      // Fetch updated questions
      const { data, error } = await supabase
        .from("property_questions")
        .select("*")
        .eq("property_id", req.params.propertyId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return res.json(success(data, "Questions reordered successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to reorder questions"));
    }
  });

  // Get application with full details (co-applicants, comments, notifications)
  app.get("/api/applications/:id/full", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { getApplicationWithDetails } = await import("./application-service");
      const application = await getApplicationWithDetails(req.params.id);
      
      if (!application) {
        return res.status(404).json(errorResponse("Application not found"));
      }

      // Check authorization
      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isApplicant = application.user_id === req.user!.id;
      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isApplicant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Filter out internal comments for applicants
      if (isApplicant && !isPropertyOwner && !isAdmin) {
        application.comments = application.comments.filter((c: any) => !c.is_internal);
      }

      return res.json(success(application, "Application details fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch application details"));
    }
  });

  // Update application status with validation
  app.patch("/api/applications/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, rejectionCategory, rejectionReason, rejectionDetails, reason } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Verify authorization
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id, status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isApplicant = application.user_id === req.user!.id;
      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      // Only applicant can withdraw, only property owner/admin can approve/reject
      if (status === "withdrawn" && !isApplicant) {
        return res.status(403).json({ error: "Only applicant can withdraw application" });
      }
      
      if (["approved", "rejected", "under_review", "pending_verification"].includes(status) && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only property owner can update this status" });
      }

      const { updateApplicationStatus } = await import("./application-service");
      const result = await updateApplicationStatus(req.params.id, status, req.user!.id, {
        rejectionCategory,
        rejectionReason,
        rejectionDetails,
        reason,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(success(result.data, "Application status updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update application status"));
    }
  });

  // Calculate and update application score
  app.post("/api/applications/:id/score", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Verify authorization - only property owner or admin can score
      const { data: application } = await supabase
        .from("applications")
        .select("*, properties(owner_id)")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = (application.properties as any)?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only property owner can score applications" });
      }

      const { calculateApplicationScore } = await import("./application-service");
      const scoreBreakdown = calculateApplicationScore({
        personalInfo: application.personal_info,
        employment: application.employment,
        rentalHistory: application.rental_history,
        documents: application.documents,
        documentStatus: application.document_status,
      });

      const { data, error } = await supabase
        .from("applications")
        .update({
          score: scoreBreakdown.totalScore,
          score_breakdown: scoreBreakdown,
          scored_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      return res.json(success({ application: data, scoreBreakdown }, "Application scored successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to score application"));
    }
  });

  // Compare applications for a property
  app.get("/api/applications/compare/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", req.params.propertyId)
        .single();

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const isPropertyOwner = property.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only property owner can compare applications" });
      }

      const { compareApplications } = await import("./application-service");
      const comparisons = await compareApplications(req.params.propertyId);

      return res.json(success(comparisons, "Applications compared successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to compare applications"));
    }
  });

  // ===== CO-APPLICANTS =====
  app.post("/api/applications/:applicationId/co-applicants", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id, personal_info")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Only applicant can add co-applicants" });
      }

      const { email, fullName, phone, relationship, personalInfo, employment, income } = req.body;

      if (!email || !fullName) {
        return res.status(400).json({ error: "Email and full name are required" });
      }

      const { data, error } = await supabase
        .from("co_applicants")
        .insert([{
          application_id: req.params.applicationId,
          email,
          full_name: fullName,
          phone,
          relationship,
          personal_info: personalInfo,
          employment,
          income,
        }])
        .select();

      if (error) throw error;

      // Get property info for email
      const { data: propertyData } = await supabase
        .from("properties")
        .select("title")
        .eq("id", application.property_id)
        .single();

      // Get main applicant name from personal info
      const mainApplicantName = (application.personal_info as any)?.firstName || "Applicant";

      // Send invitation email (fire-and-forget)
      const { getCoApplicantInvitationEmailTemplate } = await import("./email");
      sendEmail({
        to: email,
        subject: `You've Been Invited as a Co-Applicant - ${propertyData?.title || 'Choice Properties'}`,
        html: getCoApplicantInvitationEmailTemplate({
          coApplicantName: fullName,
          mainApplicantName: mainApplicantName,
          propertyTitle: propertyData?.title || "the property",
          invitationLink: `${process.env.PUBLIC_URL || 'https://choice-properties.replit.dev'}/applications/${req.params.applicationId}`,
        }),
      }).catch((err) => console.error("Failed to send co-applicant invitation email:", err));

      return res.json(success(data[0], "Co-applicant added successfully and invitation email sent"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to add co-applicant"));
    }
  });

  app.get("/api/applications/:applicationId/co-applicants", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isApplicant = application.user_id === req.user!.id;
      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isApplicant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("co_applicants")
        .select("*")
        .eq("application_id", req.params.applicationId);

      if (error) throw error;

      return res.json(success(data, "Co-applicants fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch co-applicants"));
    }
  });

  app.delete("/api/co-applicants/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: coApplicant } = await supabase
        .from("co_applicants")
        .select("application_id")
        .eq("id", req.params.id)
        .single();

      if (!coApplicant) {
        return res.status(404).json({ error: "Co-applicant not found" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", coApplicant.application_id)
        .single();

      if (application?.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only applicant can remove co-applicants" });
      }

      const { error } = await supabase
        .from("co_applicants")
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;

      return res.json(success(null, "Co-applicant removed successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to remove co-applicant"));
    }
  });

  // Delete co-applicant (alternative path that matches frontend)
  app.delete("/api/applications/:applicationId/co-applicants/:coApplicantId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: coApplicant } = await supabase
        .from("co_applicants")
        .select("application_id")
        .eq("id", req.params.coApplicantId)
        .eq("application_id", req.params.applicationId)
        .single();

      if (!coApplicant) {
        return res.status(404).json({ error: "Co-applicant not found" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", req.params.applicationId)
        .single();

      if (application?.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only applicant can remove co-applicants" });
      }

      const { error } = await supabase
        .from("co_applicants")
        .delete()
        .eq("id", req.params.coApplicantId);

      if (error) throw error;

      return res.json(success(null, "Co-applicant removed successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to remove co-applicant"));
    }
  });

  // Resend co-applicant invitation
  app.post("/api/applications/:applicationId/co-applicants/:coApplicantId/resend", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: coApplicant } = await supabase
        .from("co_applicants")
        .select("*, applications(user_id, property_id, users(full_name)), properties:applications(properties(title))")
        .eq("id", req.params.coApplicantId)
        .eq("application_id", req.params.applicationId)
        .single();

      if (!coApplicant) {
        return res.status(404).json({ error: "Co-applicant not found" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", req.params.applicationId)
        .single();

      if (application?.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only applicant can resend invitations" });
      }

      // Update invited_at timestamp
      await supabase
        .from("co_applicants")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", req.params.coApplicantId);

      // In a real implementation, this would send an email
      // For now, we just update the timestamp and return success
      console.log(`[CO-APPLICANT] Resent invitation to ${coApplicant.email}`);

      return res.json(success(null, "Invitation resent successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to resend invitation"));
    }
  });

  // ===== LEASE STATUS MANAGEMENT =====
  // Update lease status with role-based validation
  app.patch("/api/applications/:applicationId/lease-status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseStatusUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { leaseStatus, leaseDocumentUrl, leaseVersion, moveInDate } = validation.data;

      // Get application and property to check authorization
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select("*, properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (appError || !application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Only landlord/agent (property owner) or admin can update lease status
      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can update lease status" });
      }

      // Validate status transition
      const currentStatus = application.lease_status || "lease_preparation";
      const allowedTransitions = LEASE_STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(leaseStatus)) {
        return res.status(400).json({
          error: `Invalid lease status transition from '${currentStatus}' to '${leaseStatus}'. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`
        });
      }

      // Update application with new lease status
      const updateData: any = {
        lease_status: leaseStatus,
        updated_at: new Date().toISOString()
      };

      if (leaseDocumentUrl) updateData.lease_document_url = leaseDocumentUrl;
      if (leaseVersion) updateData.lease_version = leaseVersion;
      if (moveInDate) updateData.move_in_date = moveInDate;

      // Set acceptance timestamp if status is lease_accepted
      if (leaseStatus === "lease_accepted") {
        updateData.lease_accepted_at = new Date().toISOString();
      }

      // Set signed timestamp if status is lease_signed (if needed in future)
      if (leaseStatus === "completed") {
        updateData.lease_signed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", req.params.applicationId)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Lease status updated successfully"));
    } catch (err: any) {
      console.error("[LEASE] Status update error:", err);
      return res.status(500).json(errorResponse("Failed to update lease status"));
    }
  });

  // ===== LEASE DRAFT MANAGEMENT =====
  // Create lease draft from template or application
  app.post("/api/applications/:applicationId/lease-draft", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { templateId, rentAmount, leaseStartDate, leaseEndDate, securityDeposit, customClauses } = req.body;

      // Get application and verify authorization
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select("*, properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (appError || !application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can create lease drafts" });
      }

      // Get template if provided
      let template = null;
      if (templateId) {
        const { data: tmpl } = await supabase
          .from("lease_templates")
          .select("*")
          .eq("id", templateId)
          .single();
        template = tmpl;
      }

      const draftData = {
        application_id: req.params.applicationId,
        template_id: templateId || null,
        created_by: req.user!.id,
        rent_amount: rentAmount || (template?.rent_amount ?? 0),
        security_deposit: securityDeposit || template?.security_deposit,
        lease_start_date: leaseStartDate,
        lease_end_date: leaseEndDate,
        content: template?.content || "",
        custom_clauses: customClauses || template?.custom_clauses || [],
        changes: [{
          version: 1,
          changedBy: req.user!.id,
          changedAt: new Date().toISOString(),
          changeDescription: "Initial draft created"
        }],
        status: "draft"
      };

      const { data, error } = await supabase
        .from("lease_drafts")
        .insert([draftData])
        .select();

      if (error) throw error;

      // Log audit event
      await logLeaseAction(
        req.user!.id,
        req.params.applicationId,
        "lease_created",
        undefined,
        "draft",
        "Lease draft created from template",
        req
      );

      return res.json(success(data[0], "Lease draft created successfully"));
    } catch (err: any) {
      console.error("[LEASE_DRAFT] Create error:", err);
      return res.status(500).json(errorResponse("Failed to create lease draft"));
    }
  });

  // Get lease draft
  app.get("/api/applications/:applicationId/lease-draft", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Only tenant, landlord/agent (property owner), or admin can view
      const isTenant = application.user_id === req.user!.id;
      const isPropertyOwner = (application as any).properties?.[0]?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view draft" });
      }

      const { data: draft, error } = await supabase
        .from("lease_drafts")
        .select("*, created_by_user:users(full_name, email)")
        .eq("application_id", req.params.applicationId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return res.status(404).json({ error: "No lease draft found" });
      }

      // Tenants cannot see draft status - only landlord can
      if (isTenant && draft.status === "draft") {
        return res.status(403).json({ error: "Draft lease not yet ready" });
      }

      return res.json(success(draft, "Lease draft retrieved"));
    } catch (err: any) {
      console.error("[LEASE_DRAFT] Get error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve lease draft"));
    }
  });

  // Update lease draft
  app.patch("/api/applications/:applicationId/lease-draft", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = updateLeaseDraftSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("properties(owner_id), lease_status")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = (application.properties as any)?.[0]?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can edit lease drafts" });
      }

      // Prevent edits after lease acceptance
      if (application.lease_status === "lease_accepted") {
        return res.status(400).json({ error: "Cannot edit accepted lease" });
      }

      // Get current draft
      const { data: currentDraft } = await supabase
        .from("lease_drafts")
        .select("*")
        .eq("application_id", req.params.applicationId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (!currentDraft) {
        return res.status(404).json({ error: "No lease draft found" });
      }

      // Track changes
      const changes = currentDraft.changes || [];
      const previousValues: Record<string, any> = {};
      if (req.body.rentAmount && req.body.rentAmount !== currentDraft.rent_amount) previousValues.rentAmount = currentDraft.rent_amount;
      if (req.body.securityDeposit && req.body.securityDeposit !== currentDraft.security_deposit) previousValues.securityDeposit = currentDraft.security_deposit;
      if (req.body.leaseStartDate && req.body.leaseStartDate !== currentDraft.lease_start_date) previousValues.leaseStartDate = currentDraft.lease_start_date;
      if (req.body.leaseEndDate && req.body.leaseEndDate !== currentDraft.lease_end_date) previousValues.leaseEndDate = currentDraft.lease_end_date;

      changes.push({
        version: currentDraft.version + 1,
        changedBy: req.user!.id,
        changedAt: new Date().toISOString(),
        changeDescription: validation.data.changeDescription,
        previousValues: Object.keys(previousValues).length > 0 ? previousValues : undefined
      });

      const updateData: any = { updated_at: new Date().toISOString(), changes };
      if (validation.data.rentAmount) updateData.rent_amount = validation.data.rentAmount;
      if (validation.data.securityDeposit !== undefined) updateData.security_deposit = validation.data.securityDeposit;
      if (validation.data.leaseStartDate) updateData.lease_start_date = validation.data.leaseStartDate;
      if (validation.data.leaseEndDate) updateData.lease_end_date = validation.data.leaseEndDate;
      if (validation.data.content) updateData.content = validation.data.content;
      if (validation.data.customClauses) updateData.custom_clauses = validation.data.customClauses;
      if (validation.data.status) updateData.status = validation.data.status;
      updateData.version = currentDraft.version + 1;

      const { data, error } = await supabase
        .from("lease_drafts")
        .update(updateData)
        .eq("id", currentDraft.id)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Lease draft updated successfully"));
    } catch (err: any) {
      console.error("[LEASE_DRAFT] Update error:", err);
      return res.status(500).json(errorResponse("Failed to update lease draft"));
    }
  });

  // Get lease draft version history
  app.get("/api/applications/:applicationId/lease-draft/history", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data: drafts, error } = await supabase
        .from("lease_drafts")
        .select("id, version, status, created_at, updated_at, changes")
        .eq("application_id", req.params.applicationId)
        .order("version", { ascending: false });

      if (error) throw error;

      return res.json(success(drafts, "Lease draft history retrieved"));
    } catch (err: any) {
      console.error("[LEASE_DRAFT] History error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve history"));
    }
  });

  // ===== LEASE DELIVERY & TENANT REVIEW =====
  // Send lease to tenant
  app.post("/api/applications/:applicationId/lease-draft/send", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseSendSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id, properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can send lease" });
      }

      // Get current draft
      const { data: draft } = await supabase
        .from("lease_drafts")
        .select("*")
        .eq("application_id", req.params.applicationId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (!draft) {
        return res.status(404).json({ error: "No lease draft found" });
      }

      // Update draft status to sent
      const { error: draftError } = await supabase
        .from("lease_drafts")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", draft.id);

      if (draftError) throw draftError;

      // Update application lease status and timestamps
      const { error: appError } = await supabase
        .from("applications")
        .update({
          lease_status: "lease_sent",
          lease_sent_at: new Date().toISOString(),
          lease_sent_by: req.user!.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.applicationId);

      if (appError) throw appError;

      // Log audit event
      await logLeaseAction(
        req.user!.id,
        req.params.applicationId,
        "lease_sent",
        "draft",
        "lease_sent",
        `Lease version ${draft.version} sent to tenant`,
        req
      );

      // Create notification for tenant (check for duplicates)
      const { data: existingNotif } = await supabase
        .from("application_notifications")
        .select("id")
        .eq("application_id", req.params.applicationId)
        .eq("notification_type", "lease_sent")
        .limit(1)
        .single();

      if (!existingNotif) {
        await supabase
          .from("application_notifications")
          .insert([{
            application_id: req.params.applicationId,
            user_id: application.user_id,
            notification_type: "lease_sent",
            channel: "email",
            subject: "Your lease is ready for review",
            content: "The landlord has sent you a lease for review. Please review and respond.",
            status: "pending"
          }]);
      }

      return res.json(success({ leaseStatus: "lease_sent" }, "Lease sent to tenant successfully"));
    } catch (err: any) {
      console.error("[LEASE] Send error:", err);
      return res.status(500).json(errorResponse("Failed to send lease"));
    }
  });

  // Get lease for tenant review
  app.get("/api/applications/:applicationId/lease", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, lease_status, properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isTenant = application.user_id === req.user!.id;
      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view lease" });
      }

      const { data: draft, error } = await supabase
        .from("lease_drafts")
        .select("*, created_by_user:users(full_name, email)")
        .eq("application_id", req.params.applicationId)
        .eq("status", "sent")
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return res.status(404).json({ error: "No lease found" });
      }

      return res.json(success(draft, "Lease retrieved successfully"));
    } catch (err: any) {
      console.error("[LEASE] Get error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve lease"));
    }
  });

  // Tenant accepts lease
  app.post("/api/applications/:applicationId/lease/accept", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseAcceptSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id, lease_status")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Only tenant can accept lease" });
      }

      if (application.lease_status !== "lease_sent") {
        return res.status(400).json({ error: "Lease not in correct state for acceptance" });
      }

      // Update application lease status
      const updateData: any = {
        lease_status: "lease_accepted",
        lease_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (validation.data.moveInDate) {
        updateData.move_in_date = validation.data.moveInDate;
      }

      // Log audit event before update
      await logLeaseAction(
        req.user!.id,
        req.params.applicationId,
        "lease_accepted",
        "lease_sent",
        "lease_accepted",
        "Tenant accepted lease terms",
        req
      );

      const { error: appError } = await supabase
        .from("applications")
        .update(updateData)
        .eq("id", req.params.applicationId);

      if (appError) throw appError;

      // Create security deposit payment record
      // Get the lease draft to retrieve security deposit amount and rent
      const { data: leaseDraft } = await supabase
        .from("lease_drafts")
        .select("security_deposit, lease_start_date, rent_amount")
        .eq("application_id", req.params.applicationId)
        .eq("status", "sent")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (leaseDraft?.security_deposit) {
        // Get application details for tenant and property info
        const { data: appInfo } = await supabase
          .from("applications")
          .select("user_id, property_id, properties(owner_id, title)")
          .eq("id", req.params.applicationId)
          .limit(1)
          .maybeSingle();

        if (appInfo) {
          // Check if a lease record exists, create one if not
          const { data: existingLease } = await supabase
            .from("leases")
            .select("id")
            .eq("application_id", req.params.applicationId)
            .limit(1)
            .maybeSingle();

          let leaseId = existingLease?.id;
          let hasExistingDeposit = false;

          // Check for existing security deposit if lease exists
          if (leaseId) {
            const { data: existingDeposit } = await supabase
              .from("payments")
              .select("id")
              .eq("lease_id", leaseId)
              .eq("type", "security_deposit")
              .limit(1)
              .maybeSingle();
            hasExistingDeposit = !!existingDeposit;
          }

          if (!leaseId) {
            // Create lease record - use rent_amount for monthly_rent, fallback to security_deposit
            const monthlyRent = leaseDraft.rent_amount || leaseDraft.security_deposit;
            const { data: newLease, error: leaseError } = await supabase
              .from("leases")
              .insert({
                application_id: req.params.applicationId,
                property_id: appInfo.property_id,
                tenant_id: appInfo.user_id,
                landlord_id: (appInfo.properties as any)?.owner_id,
                monthly_rent: monthlyRent,
                security_deposit_amount: leaseDraft.security_deposit,
                rent_due_day: 1,
                lease_start_date: leaseDraft.lease_start_date || new Date().toISOString(),
                lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                status: "active"
              })
              .select("id")
              .single();

            if (!leaseError && newLease) {
              leaseId = newLease.id;
            }
          }

          // Create payment only if we have a lease and no existing deposit
          if (leaseId && !hasExistingDeposit) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);

            await supabase
              .from("payments")
              .insert({
                lease_id: leaseId,
                tenant_id: appInfo.user_id,
                amount: leaseDraft.security_deposit,
                type: "security_deposit",
                status: "pending",
                due_date: dueDate.toISOString()
              });
          }

          // Send deposit required notification to tenant
          try {
            const propertyTitle = (appInfo.properties as any)?.title || "Property";
            await sendDepositRequiredNotification(
              appInfo.user_id,
              leaseDraft.security_deposit.toString(),
              propertyTitle
            );
          } catch (notifErr) {
            console.error("[LEASE] Failed to send deposit notification:", notifErr);
          }
        }
      }

      // Create notification for landlord (check for duplicates)
      const { data: appData } = await supabase
        .from("applications")
        .select("properties(owner_id, users(id)), conversation_id")
        .eq("id", req.params.applicationId)
        .single();

      if (appData?.properties?.owner_id) {
        const { data: existingLandlordNotif } = await supabase
          .from("application_notifications")
          .select("id")
          .eq("application_id", req.params.applicationId)
          .eq("notification_type", "lease_accepted")
          .limit(1)
          .single();

        if (!existingLandlordNotif) {
          await supabase
            .from("application_notifications")
            .insert([{
              application_id: req.params.applicationId,
              user_id: (appData.properties as any)?.[0]?.owner_id,
              notification_type: "lease_accepted",
              channel: "email",
              subject: "Lease has been accepted",
              content: "The tenant has accepted the lease and is ready to move in.",
              status: "pending"
            }]);
        }
      }

      // Create system message in conversation
      if (appData?.conversation_id) {
        await supabase
          .from("messages")
          .insert([{
            conversation_id: appData.conversation_id,
            sender_id: req.user!.id,
            content: "Lease accepted by tenant.",
            message_type: "system"
          }]);
      }

      return res.json(success({ leaseStatus: "lease_accepted" }, "Lease accepted successfully"));
    } catch (err: any) {
      console.error("[LEASE] Accept error:", err);
      return res.status(500).json(errorResponse("Failed to accept lease"));
    }
  });

  // Enable/disable digital signatures for lease
  app.patch("/api/applications/:applicationId/lease-draft/signature-enable", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseSignatureEnableSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can enable signatures" });
      }

      const { data, error } = await supabase
        .from("lease_drafts")
        .update({ signature_enabled: validation.data.signatureEnabled, updated_at: new Date().toISOString() })
        .eq("application_id", req.params.applicationId)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Signature setting updated successfully"));
    } catch (err: any) {
      console.error("[LEASE] Signature enable error:", err);
      return res.status(500).json(errorResponse("Failed to update signature setting"));
    }
  });

  // Tenant signs lease
  app.post("/api/applications/:applicationId/lease/sign", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseSignSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id, lease_status")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Only tenant can sign lease" });
      }

      if (application.lease_status !== "lease_accepted") {
        return res.status(400).json({ error: "Lease must be accepted before signing" });
      }

      // Check if signatures enabled
      const { data: draft } = await supabase
        .from("lease_drafts")
        .select("signature_enabled")
        .eq("application_id", req.params.applicationId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (!draft?.signature_enabled) {
        return res.status(400).json({ error: "Digital signatures not enabled for this lease" });
      }

      // Record tenant signature
      const { data: sig, error: sigError } = await supabase
        .from("lease_signatures")
        .insert([{
          application_id: req.params.applicationId,
          signer_id: req.user!.id,
          signer_role: "tenant",
          signature_data: validation.data.signatureData,
          document_hash: validation.data.documentHash || null
        }])
        .select();

      if (sigError) throw sigError;

      // Update lease_signed_at timestamp
      await supabase
        .from("applications")
        .update({ lease_signed_at: new Date().toISOString() })
        .eq("id", req.params.applicationId);

      // Notify landlord of signature (check for duplicates)
      const { data: appData } = await supabase
        .from("applications")
        .select("properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (appData?.properties?.owner_id) {
        const { data: existingSignNotif } = await supabase
          .from("application_notifications")
          .select("id")
          .eq("application_id", req.params.applicationId)
          .eq("notification_type", "lease_signed_tenant")
          .limit(1)
          .single();

        if (!existingSignNotif) {
          await supabase
            .from("application_notifications")
            .insert([{
              application_id: req.params.applicationId,
              user_id: (appData.properties as any)?.[0]?.owner_id,
              notification_type: "lease_signed_tenant",
              channel: "email",
              subject: "Tenant has signed the lease",
              content: "The tenant has digitally signed the lease.",
              status: "pending"
            }]);
        }
      }

      return res.json(success(sig[0], "Lease signed successfully"));
    } catch (err: any) {
      console.error("[LEASE] Sign error:", err);
      return res.status(500).json(errorResponse("Failed to sign lease"));
    }
  });

  // Landlord countersigns lease
  app.post("/api/applications/:applicationId/lease/countersign", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseCounstersignSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can countersign" });
      }

      // Check if tenant already signed
      const { data: tenantSig } = await supabase
        .from("lease_signatures")
        .select("id")
        .eq("application_id", req.params.applicationId)
        .eq("signer_role", "tenant")
        .limit(1)
        .single();

      if (!tenantSig) {
        return res.status(400).json({ error: "Tenant must sign first before landlord countersigns" });
      }

      // Record landlord signature
      const { data: sig, error: sigError } = await supabase
        .from("lease_signatures")
        .insert([{
          application_id: req.params.applicationId,
          signer_id: req.user!.id,
          signer_role: "landlord",
          signature_data: validation.data.signatureData,
          document_hash: validation.data.documentHash || null
        }])
        .select();

      if (sigError) throw sigError;

      return res.json(success(sig[0], "Lease countersigned successfully"));
    } catch (err: any) {
      console.error("[LEASE] Countersign error:", err);
      return res.status(500).json(errorResponse("Failed to countersign lease"));
    }
  });

  // Get lease signatures for an application
  app.get("/api/applications/:applicationId/lease/signatures", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isTenant = application.user_id === req.user!.id;
      const isPropertyOwner = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data: signatures, error } = await supabase
        .from("lease_signatures")
        .select("*, signer:users(full_name, email)")
        .eq("application_id", req.params.applicationId)
        .order("signed_at", { ascending: false });

      if (error) throw error;

      return res.json(success(signatures, "Lease signatures retrieved successfully"));
    } catch (err: any) {
      console.error("[LEASE] Get signatures error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve signatures"));
    }
  });

  // ===== MOVE-IN PREPARATION =====
  // Landlord sets move-in instructions
  app.post("/api/applications/:applicationId/move-in/prepare", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = moveInPrepareSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("properties(owner_id), lease_status")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isPropertyOwner = (application.properties as any)?.[0]?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only landlord/agent can set move-in details" });
      }

      if (application.lease_status !== "lease_accepted") {
        return res.status(400).json({ error: "Lease must be accepted before move-in preparation" });
      }

      const moveInInstructions: any = {};
      if (validation.data.keyPickup) moveInInstructions.keyPickup = validation.data.keyPickup;
      if (validation.data.accessDetails) moveInInstructions.accessDetails = validation.data.accessDetails;
      if (validation.data.utilityNotes) moveInInstructions.utilityNotes = validation.data.utilityNotes;
      if (validation.data.checklistItems) moveInInstructions.checklistItems = validation.data.checklistItems;

      const { data, error } = await supabase
        .from("applications")
        .update({
          move_in_instructions: moveInInstructions,
          lease_status: "move_in_ready",
          move_in_date: validation.data.moveInDate || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.applicationId)
        .select();

      if (error) throw error;

      // Notify tenant of move-in details (check for duplicates)
      const { data: appData } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", req.params.applicationId)
        .single();

      if (appData?.user_id) {
        const { data: existingMoveInNotif } = await supabase
          .from("application_notifications")
          .select("id")
          .eq("application_id", req.params.applicationId)
          .eq("notification_type", "move_in_ready")
          .limit(1)
          .single();

        if (!existingMoveInNotif) {
          await supabase
            .from("application_notifications")
            .insert([{
              application_id: req.params.applicationId,
              user_id: appData.user_id,
              notification_type: "move_in_ready",
              channel: "email",
              subject: "Move-in details ready",
              content: "Your landlord has provided move-in instructions and next steps.",
              status: "pending"
            }]);
        }
      }

      return res.json(success(data[0], "Move-in details saved successfully"));
    } catch (err: any) {
      console.error("[MOVE_IN] Prepare error:", err);
      return res.status(500).json(errorResponse("Failed to save move-in details"));
    }
  });

  // Tenant views move-in instructions
  app.get("/api/applications/:applicationId/move-in/instructions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application, error } = await supabase
        .from("applications")
        .select("user_id, move_in_instructions, move_in_date, lease_status")
        .eq("id", req.params.applicationId)
        .single();

      if (error) throw error;

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.user_id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      return res.json(success({
        leaseStatus: application.lease_status,
        moveInDate: application.move_in_date,
        instructions: application.move_in_instructions
      }, "Move-in instructions retrieved successfully"));
    } catch (err: any) {
      console.error("[MOVE_IN] Get instructions error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve move-in instructions"));
    }
  });

  // Tenant updates move-in checklist
  app.patch("/api/applications/:applicationId/move-in/checklist", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = moveInChecklistUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id, move_in_instructions")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Only tenant can update their checklist" });
      }

      const instructions = application.move_in_instructions || {};
      const checklistItems = instructions.checklistItems || [];

      // Update checked items
      validation.data.checklistItems.forEach(update => {
        const item = checklistItems.find((i: any) => i.id === update.id);
        if (item) item.completed = update.completed;
      });

      const { data, error } = await supabase
        .from("applications")
        .update({
          move_in_instructions: { ...instructions, checklistItems },
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.applicationId)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Checklist updated successfully"));
    } catch (err: any) {
      console.error("[MOVE_IN] Checklist error:", err);
      return res.status(500).json(errorResponse("Failed to update checklist"));
    }
  });

  // Tenant declines lease
  app.post("/api/applications/:applicationId/lease/decline", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = leaseDeclineSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("user_id, lease_status")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Only tenant can decline lease" });
      }

      if (application.lease_status !== "lease_sent") {
        return res.status(400).json({ error: "Lease not in correct state for decline" });
      }

      // Update application lease status
      const { error: appError } = await supabase
        .from("applications")
        .update({
          lease_status: "lease_declined",
          lease_decline_reason: validation.data.reason || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.applicationId);

      if (appError) throw appError;

      // Create notification for landlord (check for duplicates)
      const { data: appData } = await supabase
        .from("applications")
        .select("properties(owner_id)")
        .eq("id", req.params.applicationId)
        .single();

      if (appData?.properties?.owner_id) {
        const { data: existingDeclineNotif } = await supabase
          .from("application_notifications")
          .select("id")
          .eq("application_id", req.params.applicationId)
          .eq("notification_type", "lease_declined")
          .limit(1)
          .single();

        if (!existingDeclineNotif) {
          await supabase
            .from("application_notifications")
            .insert([{
              application_id: req.params.applicationId,
              user_id: (appData.properties as any)?.[0]?.owner_id,
              notification_type: "lease_declined",
              channel: "email",
              subject: "Lease has been declined",
              content: `The tenant has declined the lease. Reason: ${validation.data.reason || "Not provided"}`,
              status: "pending"
            }]);
        }
      }

      return res.json(success({ leaseStatus: "lease_declined" }, "Lease declined successfully"));
    } catch (err: any) {
      console.error("[LEASE] Decline error:", err);
      return res.status(500).json(errorResponse("Failed to decline lease"));
    }
  });

  // ===== APPLICATION COMMENTS =====
  app.post("/api/applications/:applicationId/comments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isApplicant = application.user_id === req.user!.id;
      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isApplicant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { comment, commentType, isInternal } = req.body;

      if (!comment) {
        return res.status(400).json({ error: "Comment is required" });
      }

      // Applicants can only add non-internal comments
      const actualIsInternal = isApplicant && !isPropertyOwner && !isAdmin ? false : (isInternal ?? true);

      const { data, error } = await supabase
        .from("application_comments")
        .insert([{
          application_id: req.params.applicationId,
          user_id: req.user!.id,
          comment,
          comment_type: commentType || "note",
          is_internal: actualIsInternal,
        }])
        .select("*, users(id, full_name)");

      if (error) throw error;

      return res.json(success(data[0], "Comment added successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to add comment"));
    }
  });

  app.get("/api/applications/:applicationId/comments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id")
        .eq("id", req.params.applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isApplicant = application.user_id === req.user!.id;
      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isApplicant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Not authorized" });
      }

      let query = supabase
        .from("application_comments")
        .select("*, users(id, full_name)")
        .eq("application_id", req.params.applicationId)
        .order("created_at", { ascending: true });

      // Filter out internal comments for applicants
      if (isApplicant && !isPropertyOwner && !isAdmin) {
        query = query.eq("is_internal", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.json(success(data, "Comments fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch comments"));
    }
  });

  // ===== APPLICATION NOTIFICATIONS =====
  app.get("/api/applications/:applicationId/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", req.params.applicationId)
        .single();

      if (!application || application.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("application_notifications")
        .select("*")
        .eq("application_id", req.params.applicationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.json(success(data, "Notifications fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch notifications"));
    }
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: notification } = await supabase
        .from("application_notifications")
        .select("user_id")
        .eq("id", req.params.id)
        .single();

      if (!notification || notification.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("application_notifications")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Notification marked as read"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to mark notification as read"));
    }
  });

  // Get all user notifications
  app.get("/api/user/notifications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("application_notifications")
        .select("*, applications(id, property_id, properties(title))")
        .eq("user_id", req.user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return res.json(success(data, "User notifications fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user notifications"));
    }
  });

  // Document status update
  app.patch("/api/applications/:id/documents/:docType", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, property_id, document_status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only property owner can verify documents" });
      }

      const { verified, notes } = req.body;
      const docType = req.params.docType;

      const currentDocStatus = application.document_status || {};
      const updatedDocStatus = {
        ...currentDocStatus,
        [docType]: {
          ...currentDocStatus[docType],
          verified: verified ?? false,
          verifiedAt: verified ? new Date().toISOString() : undefined,
          verifiedBy: verified ? req.user!.id : undefined,
          notes,
        },
      };

      const { data, error } = await supabase
        .from("applications")
        .update({ document_status: updatedDocStatus })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;

      return res.json(success(data[0], "Document status updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update document status"));
    }
  });

  // Set application expiration
  app.patch("/api/applications/:id/expiration", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: application } = await supabase
        .from("applications")
        .select("property_id")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: property } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", application.property_id)
        .single();

      const isPropertyOwner = property?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isPropertyOwner && !isAdmin) {
        return res.status(403).json({ error: "Only property owner can set expiration" });
      }

      const { setApplicationExpiration } = await import("./application-service");
      const daysUntilExpiration = req.body.daysUntilExpiration || 30;
      const result = await setApplicationExpiration(req.params.id, daysUntilExpiration);

      if (!result) {
        return res.status(500).json(errorResponse("Failed to set expiration"));
      }

      return res.json(success(null, `Application expires in ${daysUntilExpiration} days`));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to set application expiration"));
    }
  });

  // ===== INQUIRIES =====
  app.post("/api/inquiries", inquiryLimiter, async (req, res) => {
    try {
      const validation = insertInquirySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data, error } = await supabase
        .from("inquiries")
        .insert([validation.data])
        .select();

      if (error) throw error;

      // Get admin email from settings, fallback to admin user
      let adminEmail = null;
      const { data: adminSetting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_email")
        .single();
      
      if (adminSetting?.value) {
        adminEmail = adminSetting.value;
      } else {
        // Fallback: get first admin user's email
        const { data: adminUser } = await supabase
          .from("users")
          .select("email")
          .eq("role", "admin")
          .limit(1)
          .single();
        adminEmail = adminUser?.email;
      }

      // Get agent/persona name for context
      let agentName = "Unknown Agent";
      if (validation.data.agentId) {
        const { data: agentData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", validation.data.agentId)
          .single();
        agentName = agentData?.full_name || "Unknown Agent";
      }

      // Always send to admin email (centralized management)
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `New Inquiry for ${agentName} - Choice Properties`,
          html: getAgentInquiryEmailTemplate({
            senderName: validation.data.senderName,
            senderEmail: validation.data.senderEmail,
            senderPhone: validation.data.senderPhone || "",
            message: validation.data.message || "",
            propertyTitle: agentName ? `(Agent: ${agentName})` : undefined,
          }),
        });
      }

      return res.json(success(data[0], "Inquiry submitted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to submit inquiry"));
    }
  });

  app.get("/api/inquiries/agent/:agentId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.agentId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("inquiries")
        .select("*, properties(id, title, address)")
        .eq("agent_id", req.params.agentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Agent inquiries fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agent inquiries"));
    }
  });

  app.patch("/api/inquiries/:id", authenticateToken, requireOwnership("inquiry"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("inquiries")
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Inquiry updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update inquiry"));
    }
  });

  // ===== REQUIREMENTS =====
  app.post("/api/requirements", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertRequirementSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const requirementData = {
        ...validation.data,
        user_id: req.user?.id || null,
      };

      const { data, error } = await supabase
        .from("requirements")
        .insert([requirementData])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Requirement created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create requirement"));
    }
  });

  app.get("/api/requirements/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "agent") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("requirements")
        .select("*")
        .eq("user_id", req.params.userId);

      if (error) throw error;
      return res.json(success(data, "User requirements fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user requirements"));
    }
  });

  app.get("/api/requirements", authenticateToken, requireRole("admin", "agent"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("requirements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Requirements fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch requirements"));
    }
  });

  // ===== FAVORITES =====
  app.post("/api/favorites", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertFavoriteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const favoriteData = {
        ...validation.data,
        user_id: req.user!.id,
      };

      const { data, error } = await supabase
        .from("favorites")
        .insert([favoriteData])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Favorite created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create favorite"));
    }
  });

  app.delete("/api/favorites/:id", authenticateToken, requireOwnership("favorite"), async (req: AuthenticatedRequest, res) => {
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;
      return res.json(success(null, "Favorite deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete favorite"));
    }
  });

  app.get("/api/favorites/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("*, properties(*)")
        .eq("user_id", req.params.userId);

      if (error) throw error;
      return res.json(success(data, "User favorites fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user favorites"));
    }
  });

  // ===== REVIEWS =====
  app.get("/api/reviews/property/:propertyId", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, users(id, full_name, profile_image)")
        .eq("property_id", req.params.propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Reviews fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch reviews"));
    }
  });

  app.post("/api/reviews", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertReviewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const reviewData = {
        ...validation.data,
        user_id: req.user!.id,
      };

      const { data, error } = await supabase
        .from("reviews")
        .insert([reviewData])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Review created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create review"));
    }
  });

  app.patch("/api/reviews/:id", authenticateToken, requireOwnership("review"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Review updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update review"));
    }
  });

  app.delete("/api/reviews/:id", authenticateToken, requireOwnership("review"), async (req: AuthenticatedRequest, res) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", req.params.id);

      if (error) throw error;
      return res.json(success(null, "Review deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete review"));
    }
  });

  // ===== USERS (Admin only) =====
  app.get("/api/users", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, phone, role, profile_image, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Users fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch users"));
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const { data, error: dbError } = await supabase
        .from("users")
        .select("id, full_name, profile_image, bio")
        .eq("id", req.params.id)
        .single();

      if (dbError || !data) {
        return res.status(404).json(errorResponse("User not found"));
      }

      return res.json(success(data, "User fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user"));
    }
  });

  app.patch("/api/users/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.id !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const allowedFields = ["full_name", "phone", "profile_image", "bio"];
      const updates: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (req.user!.role === "admin" && req.body.role !== undefined) {
        updates.role = req.body.role;
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "User updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update user"));
    }
  });

  // ===== SAVED SEARCHES =====
  app.post("/api/saved-searches", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertSavedSearchSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const searchData = {
        ...validation.data,
        user_id: req.user!.id,
      };

      const { data, error } = await supabase
        .from("saved_searches")
        .insert([searchData])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Saved search created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create saved search"));
    }
  });

  app.get("/api/saved-searches/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.params.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", req.params.userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Saved searches fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch saved searches"));
    }
  });

  app.patch("/api/saved-searches/:id", authenticateToken, requireOwnership("saved_search"), async (req: AuthenticatedRequest, res) => {
    try {
      // Validate and extract only allowed fields (name and filters)
      const updateSchema = insertSavedSearchSchema.partial().pick({ name: true, filters: true });
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data, error } = await supabase
        .from("saved_searches")
        .update({ ...validation.data, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Saved search updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update saved search"));
    }
  });

  app.delete("/api/saved-searches/:id", authenticateToken, requireOwnership("saved_search"), async (req: AuthenticatedRequest, res) => {
    try {
      const { error: delError } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", req.params.id);

      if (delError) throw delError;
      return res.json(success(null, "Saved search deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete saved search"));
    }
  });

  // ===== NEWSLETTER =====
  app.post("/api/newsletter/subscribe", newsletterLimiter, async (req, res) => {
    try {
      const validation = insertNewsletterSubscriberSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .insert([validation.data])
        .select();

      if (error) {
        if (error.code === "23505") {
          return res.json(success(null, "Already subscribed"));
        }
        throw error;
      }

      return res.json(success(data[0], "Subscribed successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to subscribe to newsletter"));
    }
  });

  app.get("/api/newsletter/subscribers", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Newsletter subscribers fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch newsletter subscribers"));
    }
  });

  // ===== CONTACT MESSAGES =====
  app.post("/api/messages", inquiryLimiter, async (req, res) => {
    try {
      const validation = insertContactMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data, error } = await supabase
        .from("contact_messages")
        .insert([validation.data])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Message sent successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to send message"));
    }
  });

  app.get("/api/messages", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Contact messages fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch contact messages"));
    }
  });

  app.patch("/api/messages/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .update({ read: req.body.read })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Message updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update message"));
    }
  });

  // ===== CONTACT (alias for messages) =====
  app.post("/api/contact", inquiryLimiter, async (req, res) => {
    try {
      const validation = insertContactMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(errorResponse(validation.error.errors[0].message));
      }

      const { data, error } = await supabase
        .from("contact_messages")
        .insert([validation.data])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Message sent successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to send message"));
    }
  });

  // ===== HEALTH CHECK =====
  app.get("/api/health", (_req, res) => {
    return res.json(success({ status: "ok", timestamp: new Date().toISOString() }, "Server is healthy"));
  });

  // ===== USER DASHBOARD (All user activities in one call) =====
  app.get("/api/user/dashboard", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Fetch all user activities in parallel
      const [applicationsResult, favoritesResult, savedSearchesResult, requirementsResult, reviewsResult, propertiesResult] = await Promise.all([
        // Applications with property details
        supabase
          .from("applications")
          .select(`
            *,
            properties:property_id (
              id, title, address, city, state, price, bedrooms, bathrooms, images, status, property_type
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        // Favorites with property details
        supabase
          .from("favorites")
          .select(`
            id,
            property_id,
            created_at,
            properties:property_id (
              id, title, address, city, state, price, bedrooms, bathrooms, images, status, property_type, square_feet
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        // Saved searches
        supabase
          .from("saved_searches")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        // Requirements
        supabase
          .from("requirements")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        // User's reviews
        supabase
          .from("reviews")
          .select(`
            *,
            properties:property_id (id, title, address, city)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        // User's properties (if owner/agent)
        supabase
          .from("properties")
          .select("*")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
      ]);

      // Transform data to include property info properly
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

      // Calculate stats
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

  // ===== PROPERTY WITH OWNER =====
  app.get("/api/properties/:id/full", async (req, res) => {
    try {
      // Fetch property
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", req.params.id)
        .single();

      if (propertyError) {
        console.error("[PROPERTY] Supabase property error:", propertyError);
        throw propertyError;
      }

      // Fetch owner if owner_id exists
      let ownerData = null;
      if (propertyData?.owner_id) {
        const { data: owner, error: ownerError } = await supabase
          .from("users")
          .select("id, full_name, email, phone, profile_image, bio")
          .eq("id", propertyData.owner_id)
          .single();

        if (ownerError) {
          console.error("[PROPERTY] Supabase owner error:", ownerError);
          // Don't throw - owner is optional
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

  // ===== AGENCIES =====
  app.get("/api/agencies", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Agencies fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agencies"));
    }
  });

  app.get("/api/agencies/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select(`
          *,
          agents:users!users_agency_id_fkey (
            id, full_name, email, phone, profile_image, bio, 
            license_number, license_verified, specialties, 
            years_experience, total_sales, rating, review_count, location
          )
        `)
        .eq("id", req.params.id)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return res.json(success(data, "Agency fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agency"));
    }
  });

  app.post("/api/agencies", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertAgencySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(errorResponse(validation.error.errors[0].message));
      }

      const agencyData = {
        ...validation.data,
        owner_id: req.user?.id,
      };

      const { data, error } = await supabase
        .from("agencies")
        .insert(agencyData)
        .select()
        .single();

      if (error) throw error;

      // Update the creator's agency_id
      if (data && req.user?.id) {
        await supabase
          .from("users")
          .update({ agency_id: data.id })
          .eq("id", req.user.id);
      }

      return res.json(success(data, "Agency created successfully"));
    } catch (err: any) {
      console.error("[AGENCY] Create error:", err);
      return res.status(500).json(errorResponse("Failed to create agency"));
    }
  });

  app.patch("/api/agencies/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Check ownership
      const { data: agency } = await supabase
        .from("agencies")
        .select("owner_id")
        .eq("id", req.params.id)
        .single();

      if (!agency || (agency.owner_id !== req.user?.id && req.user?.role !== "admin")) {
        return res.status(403).json(errorResponse("Not authorized to update this agency"));
      }

      const { data, error } = await supabase
        .from("agencies")
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Agency updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update agency"));
    }
  });

  app.delete("/api/agencies/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: agency } = await supabase
        .from("agencies")
        .select("owner_id")
        .eq("id", req.params.id)
        .single();

      if (!agency || (agency.owner_id !== req.user?.id && req.user?.role !== "admin")) {
        return res.status(403).json(errorResponse("Not authorized to delete this agency"));
      }

      const { error } = await supabase
        .from("agencies")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", req.params.id);

      if (error) throw error;
      return res.json(success(null, "Agency deleted successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to delete agency"));
    }
  });

  // Get agency's agents
  app.get("/api/agencies/:id/agents", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, profile_image, bio, license_number, license_verified, specialties, years_experience, total_sales, rating, review_count, location, role")
        .eq("agency_id", req.params.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Agency agents fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agency agents"));
    }
  });

  // Add agent to agency
  app.post("/api/agencies/:id/agents", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: agency } = await supabase
        .from("agencies")
        .select("owner_id")
        .eq("id", req.params.id)
        .single();

      if (!agency || (agency.owner_id !== req.user?.id && req.user?.role !== "admin")) {
        return res.status(403).json(errorResponse("Not authorized to add agents to this agency"));
      }

      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json(errorResponse("Agent ID is required"));
      }

      const { data, error } = await supabase
        .from("users")
        .update({ agency_id: req.params.id })
        .eq("id", agentId)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Agent added to agency successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to add agent to agency"));
    }
  });

  // Remove agent from agency
  app.delete("/api/agencies/:id/agents/:agentId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: agency } = await supabase
        .from("agencies")
        .select("owner_id")
        .eq("id", req.params.id)
        .single();

      if (!agency || (agency.owner_id !== req.user?.id && req.user?.role !== "admin")) {
        return res.status(403).json(errorResponse("Not authorized to remove agents from this agency"));
      }

      const { error } = await supabase
        .from("users")
        .update({ agency_id: null })
        .eq("id", req.params.agentId)
        .eq("agency_id", req.params.id);

      if (error) throw error;
      return res.json(success(null, "Agent removed from agency successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to remove agent from agency"));
    }
  });

  // ===== AGENTS (Database-driven) =====
  app.get("/api/agents", async (req, res) => {
    try {
      const { specialty, search, location } = req.query;
      
      let query = supabase
        .from("users")
        .select(`
          id, full_name, email, phone, profile_image, bio,
          license_number, license_state, license_expiry, license_verified,
          specialties, years_experience, total_sales, rating, review_count, location,
          agency:agency_id (id, name, logo)
        `)
        .eq("role", "agent")
        .is("deleted_at", null);

      if (location) {
        query = query.ilike("location", `%${location}%`);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,location.ilike.%${search}%`);
      }

      const { data, error } = await query.order("rating", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Filter by specialty if provided (handled client-side since jsonb array filtering is complex)
      let filteredData = data || [];
      if (specialty && specialty !== "all") {
        filteredData = filteredData.filter((agent: any) => 
          agent.specialties?.includes(specialty)
        );
      }

      return res.json(success(filteredData, "Agents fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agents"));
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, full_name, email, phone, profile_image, bio,
          license_number, license_state, license_expiry, license_verified,
          specialties, years_experience, total_sales, rating, review_count, location,
          agency:agency_id (id, name, logo, website, phone, email)
        `)
        .eq("id", req.params.id)
        .eq("role", "agent")
        .single();

      if (error) throw error;
      return res.json(success(data, "Agent fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agent"));
    }
  });

  // Update agent profile (self)
  app.patch("/api/agents/:id/profile", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.id !== req.params.id && req.user?.role !== "admin") {
        return res.status(403).json(errorResponse("Not authorized to update this profile"));
      }

      const allowedFields = [
        "bio", "profile_image", "phone", "location",
        "license_number", "license_state", "license_expiry",
        "specialties", "years_experience"
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Agent profile updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update agent profile"));
    }
  });

  // Get agent's properties (listings)
  app.get("/api/agents/:id/properties", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("listing_agent_id", req.params.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Agent properties fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agent properties"));
    }
  });

  // Get agent's reviews
  app.get("/api/agents/:id/reviews", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("agent_reviews")
        .select(`
          *,
          reviewer:reviewer_id (id, full_name, profile_image)
        `)
        .eq("agent_id", req.params.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Agent reviews fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agent reviews"));
    }
  });

  // Submit agent review
  app.post("/api/agents/:id/reviews", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertAgentReviewSchema.safeParse({
        ...req.body,
        agentId: req.params.id,
        reviewerId: req.user?.id,
      });

      if (!validation.success) {
        return res.status(400).json(errorResponse(validation.error.errors[0].message));
      }

      const { data, error } = await supabase
        .from("agent_reviews")
        .insert({
          agent_id: req.params.id,
          reviewer_id: req.user?.id,
          rating: req.body.rating,
          title: req.body.title,
          comment: req.body.comment,
          would_recommend: req.body.wouldRecommend ?? true,
          transaction_id: req.body.transactionId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return res.status(400).json(errorResponse("You have already reviewed this agent"));
        }
        throw error;
      }

      // Update agent's rating
      const { data: reviews } = await supabase
        .from("agent_reviews")
        .select("rating")
        .eq("agent_id", req.params.id);

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        await supabase
          .from("users")
          .update({ 
            rating: avgRating.toFixed(2), 
            review_count: reviews.length 
          })
          .eq("id", req.params.id);
      }

      return res.json(success(data, "Review submitted successfully"));
    } catch (err: any) {
      console.error("[AGENT REVIEW] Error:", err);
      return res.status(500).json(errorResponse("Failed to submit review"));
    }
  });

  // ===== TRANSACTIONS =====
  app.get("/api/transactions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;

      let query = supabase
        .from("transactions")
        .select(`
          *,
          property:property_id (id, title, address, city, state),
          agent:agent_id (id, full_name, email),
          agency:agency_id (id, name),
          buyer:buyer_id (id, full_name, email)
        `);

      // Filter based on role
      if (role === "agent") {
        query = query.eq("agent_id", userId);
      } else if (role !== "admin") {
        // Agency owner or broker sees all agency transactions
        const { data: userAgency } = await supabase
          .from("agencies")
          .select("id")
          .eq("owner_id", userId)
          .single();

        if (userAgency) {
          query = query.eq("agency_id", userAgency.id);
        } else {
          query = query.eq("agent_id", userId);
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Transactions fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch transactions"));
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(errorResponse(validation.error.errors[0].message));
      }

      // Calculate commissions
      const transactionAmount = parseFloat(req.body.transactionAmount || "0");
      const commissionRate = parseFloat(req.body.commissionRate || "3");
      const agentSplit = parseFloat(req.body.agentSplit || "70");

      const commissionAmount = (transactionAmount * commissionRate) / 100;
      const agentCommission = (commissionAmount * agentSplit) / 100;
      const agencyCommission = commissionAmount - agentCommission;

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          ...validation.data,
          commission_amount: commissionAmount,
          agent_commission: agentCommission,
          agency_commission: agencyCommission,
        })
        .select()
        .single();

      if (error) throw error;

      // Update agent's total sales
      if (req.body.agentId && req.body.status === "completed") {
        await supabase.rpc("increment_agent_sales", { agent_id: req.body.agentId });
      }

      return res.json(success(data, "Transaction created successfully"));
    } catch (err: any) {
      console.error("[TRANSACTION] Create error:", err);
      return res.status(500).json(errorResponse("Failed to create transaction"));
    }
  });

  app.patch("/api/transactions/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      const updateData: any = { status, updated_at: new Date().toISOString() };

      if (status === "completed") {
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      // Update agent's total sales when completed
      if (status === "completed" && data.agent_id) {
        const { data: agent } = await supabase
          .from("users")
          .select("total_sales")
          .eq("id", data.agent_id)
          .single();

        await supabase
          .from("users")
          .update({ total_sales: (agent?.total_sales || 0) + 1 })
          .eq("id", data.agent_id);
      }

      return res.json(success(data, "Transaction status updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update transaction status"));
    }
  });

  // ===== ADMIN PERSONA MANAGEMENT =====
  // Get all managed personas (agents, landlords, property managers controlled by admin)
  app.get("/api/admin/personas", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_managed_profile", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Personas fetched successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Get personas error:", err);
      return res.status(500).json(errorResponse("Failed to fetch personas"));
    }
  });

  // Create a new managed persona
  app.post("/api/admin/personas", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { fullName, email, displayEmail, displayPhone, role, bio, profileImage, location, specialties, yearsExperience } = req.body;

      if (!fullName || !email) {
        return res.status(400).json(errorResponse("Full name and email are required"));
      }

      // Create the managed profile
      const { data, error } = await supabase
        .from("users")
        .insert({
          email,
          full_name: fullName,
          display_email: displayEmail || email,
          display_phone: displayPhone || null,
          role: role || "agent",
          bio: bio || null,
          profile_image: profileImage || null,
          location: location || null,
          specialties: specialties || null,
          years_experience: yearsExperience || null,
          is_managed_profile: true,
          managed_by: req.user!.id,
          password_hash: "managed_profile_no_login", // Managed profiles can't login
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Persona created successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Create persona error:", err);
      if (err.message?.includes("duplicate") || err.code === "23505") {
        return res.status(400).json(errorResponse("A user with this email already exists"));
      }
      return res.status(500).json(errorResponse("Failed to create persona"));
    }
  });

  // Update a managed persona
  app.patch("/api/admin/personas/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const personaId = req.params.id;

      // Verify this is a managed profile
      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id, is_managed_profile, managed_by")
        .eq("id", personaId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json(errorResponse("Persona not found"));
      }

      if (!existing.is_managed_profile) {
        return res.status(400).json(errorResponse("This user is not a managed persona"));
      }

      const { fullName, displayEmail, displayPhone, role, bio, profileImage, location, specialties, yearsExperience } = req.body;

      const updateData: any = { updated_at: new Date().toISOString() };
      if (fullName !== undefined) updateData.full_name = fullName;
      if (displayEmail !== undefined) updateData.display_email = displayEmail;
      if (displayPhone !== undefined) updateData.display_phone = displayPhone;
      if (role !== undefined) updateData.role = role;
      if (bio !== undefined) updateData.bio = bio;
      if (profileImage !== undefined) updateData.profile_image = profileImage;
      if (location !== undefined) updateData.location = location;
      if (specialties !== undefined) updateData.specialties = specialties;
      if (yearsExperience !== undefined) updateData.years_experience = yearsExperience;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", personaId)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Persona updated successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Update persona error:", err);
      return res.status(500).json(errorResponse("Failed to update persona"));
    }
  });

  // Delete a managed persona
  app.delete("/api/admin/personas/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const personaId = req.params.id;

      // Verify this is a managed profile before deleting
      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id, is_managed_profile")
        .eq("id", personaId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json(errorResponse("Persona not found"));
      }

      if (!existing.is_managed_profile) {
        return res.status(400).json(errorResponse("Cannot delete a non-managed user from this endpoint"));
      }

      // Soft delete the persona
      const { error } = await supabase
        .from("users")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", personaId);

      if (error) throw error;
      return res.json(success(null, "Persona deleted successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Delete persona error:", err);
      return res.status(500).json(errorResponse("Failed to delete persona"));
    }
  });

  // Get admin settings
  app.get("/api/admin/settings", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");

      if (error) throw error;

      // Convert to key-value object
      const settings: Record<string, string> = {};
      (data || []).forEach((item: any) => {
        settings[item.key] = item.value;
      });

      return res.json(success(settings, "Settings fetched successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Get settings error:", err);
      return res.status(500).json(errorResponse("Failed to fetch settings"));
    }
  });

  // Update admin settings
  app.post("/api/admin/settings", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { key, value } = req.body;

      if (!key) {
        return res.status(400).json(errorResponse("Setting key is required"));
      }

      // Upsert the setting
      const { data, error } = await supabase
        .from("admin_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Setting saved successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Save setting error:", err);
      return res.status(500).json(errorResponse("Failed to save setting"));
    }
  });

  // ===== MESSAGING =====
  // Get user's conversations
  app.get("/api/conversations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", req.user!.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        return res.json(success([], "No conversations found"));
      }

      const conversationIds = participations.map(p => p.conversation_id);

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(`
          *,
          properties:property_id(id, title, address, images),
          conversation_participants(user_id, last_read_at, users:user_id(id, full_name, email, profile_image)),
          messages(id, content, sender_id, created_at)
        `)
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const enrichedConversations = (conversations || []).map((conv: any) => {
        const lastMessage = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const myParticipation = conv.conversation_participants?.find((p: any) => p.user_id === req.user!.id);
        const unreadCount = conv.messages?.filter((m: any) => 
          m.sender_id !== req.user!.id && 
          (!myParticipation?.last_read_at || new Date(m.created_at) > new Date(myParticipation.last_read_at))
        ).length || 0;

        return {
          ...conv,
          lastMessage,
          unreadCount,
          participants: conv.conversation_participants?.map((p: any) => p.users).filter(Boolean),
        };
      });

      return res.json(success(enrichedConversations, "Conversations fetched successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Get conversations error:", err);
      return res.status(500).json(errorResponse("Failed to fetch conversations"));
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: participation } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", req.params.id)
        .eq("user_id", req.user!.id)
        .single();

      if (!participation) {
        return res.status(403).json(errorResponse("Not authorized to view this conversation"));
      }

      const { data: conversation, error } = await supabase
        .from("conversations")
        .select(`
          *,
          properties:property_id(id, title, address, images),
          conversation_participants(user_id, last_read_at, users:user_id(id, full_name, email, profile_image)),
          messages(id, content, sender_id, message_type, attachments, created_at, users:sender_id(id, full_name, profile_image))
        `)
        .eq("id", req.params.id)
        .single();

      if (error) throw error;

      if (conversation?.messages) {
        conversation.messages = conversation.messages.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return res.json(success(conversation, "Conversation fetched successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Get conversation error:", err);
      return res.status(500).json(errorResponse("Failed to fetch conversation"));
    }
  });

  // Create new conversation
  app.post("/api/conversations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { propertyId, applicationId, recipientId, subject, initialMessage } = req.body;

      if (!recipientId) {
        return res.status(400).json(errorResponse("Recipient is required"));
      }

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert([{ property_id: propertyId, application_id: applicationId, subject }])
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from("conversation_participants").insert([
        { conversation_id: conversation.id, user_id: req.user!.id },
        { conversation_id: conversation.id, user_id: recipientId },
      ]);

      if (initialMessage) {
        await supabase.from("messages").insert([{
          conversation_id: conversation.id,
          sender_id: req.user!.id,
          content: initialMessage,
        }]);
      }

      return res.json(success(conversation, "Conversation created successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Create conversation error:", err);
      return res.status(500).json(errorResponse("Failed to create conversation"));
    }
  });

  // Send message
  app.post("/api/conversations/:id/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: participation } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", req.params.id)
        .eq("user_id", req.user!.id)
        .single();

      if (!participation) {
        return res.status(403).json(errorResponse("Not authorized to send messages to this conversation"));
      }

      const { content, messageType, attachments } = req.body;

      if (!content?.trim()) {
        return res.status(400).json(errorResponse("Message content is required"));
      }

      const { data: message, error } = await supabase
        .from("messages")
        .insert([{
          conversation_id: req.params.id,
          sender_id: req.user!.id,
          content: content.trim(),
          message_type: messageType || "text",
          attachments: attachments || null,
        }])
        .select(`*, users:sender_id(id, full_name, profile_image)`)
        .single();

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", req.params.id);

      return res.json(success(message, "Message sent successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Send message error:", err);
      return res.status(500).json(errorResponse("Failed to send message"));
    }
  });

  // Mark conversation as read
  app.patch("/api/conversations/:id/read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", req.params.id)
        .eq("user_id", req.user!.id);

      if (error) throw error;
      return res.json(success(null, "Conversation marked as read"));
    } catch (err: any) {
      console.error("[MESSAGING] Mark read error:", err);
      return res.status(500).json(errorResponse("Failed to mark conversation as read"));
    }
  });

  // ===== PUSH NOTIFICATIONS =====
  // Subscribe to push notifications
  app.post("/api/push/subscribe", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", req.user!.id)
        .eq("endpoint", endpoint)
        .single();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from("push_subscriptions")
          .update({
            p256dh: keys.p256dh,
            auth: keys.auth,
            user_agent: req.headers["user-agent"] || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        return res.json(success({ subscribed: true }, "Push subscription updated"));
      }

      // Create new subscription
      const { error } = await supabase
        .from("push_subscriptions")
        .insert([{
          user_id: req.user!.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: req.headers["user-agent"] || null,
        }]);

      if (error) throw error;
      return res.json(success({ subscribed: true }, "Push subscription created"));
    } catch (err: any) {
      console.error("[PUSH] Subscribe error:", err);
      return res.status(500).json(errorResponse("Failed to subscribe to push notifications"));
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is required" });
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", req.user!.id)
        .eq("endpoint", endpoint);

      if (error) throw error;
      return res.json(success({ unsubscribed: true }, "Push subscription removed"));
    } catch (err: any) {
      console.error("[PUSH] Unsubscribe error:", err);
      return res.status(500).json(errorResponse("Failed to unsubscribe from push notifications"));
    }
  });

  // Check push subscription status
  app.get("/api/push/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, created_at")
        .eq("user_id", req.user!.id);

      if (error) throw error;
      return res.json(success({ 
        subscribed: data && data.length > 0,
        subscriptions: data?.length || 0
      }, "Push status retrieved"));
    } catch (err: any) {
      console.error("[PUSH] Status error:", err);
      return res.status(500).json(errorResponse("Failed to get push status"));
    }
  });

  // Agency dashboard stats
  app.get("/api/agencies/:id/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = req.params.id;

      const [agentsResult, transactionsResult, propertiesResult] = await Promise.all([
        supabase
          .from("users")
          .select("id, total_sales, rating")
          .eq("agency_id", agencyId)
          .is("deleted_at", null),
        supabase
          .from("transactions")
          .select("*")
          .eq("agency_id", agencyId),
        supabase
          .from("properties")
          .select("id, status")
          .eq("agency_id", agencyId)
          .is("deleted_at", null),
      ]);

      const agents = agentsResult.data || [];
      const transactions = transactionsResult.data || [];
      const properties = propertiesResult.data || [];

      const completedTransactions = transactions.filter(t => t.status === "completed");
      const totalRevenue = completedTransactions.reduce((acc, t) => acc + parseFloat(t.agency_commission || "0"), 0);
      const totalCommissions = completedTransactions.reduce((acc, t) => acc + parseFloat(t.commission_amount || "0"), 0);

      const stats = {
        totalAgents: agents.length,
        totalProperties: properties.length,
        activeListings: properties.filter(p => p.status === "active").length,
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        pendingTransactions: transactions.filter(t => t.status === "pending").length,
        totalRevenue,
        totalCommissions,
        averageAgentRating: agents.length > 0 
          ? agents.reduce((acc, a) => acc + parseFloat(a.rating || "0"), 0) / agents.length 
          : 0,
        totalSales: agents.reduce((acc, a) => acc + (a.total_sales || 0), 0),
      };

      return res.json(success(stats, "Agency stats fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agency stats"));
    }
  });

  // ===== PAYMENT ENDPOINTS =====
  
  // Get payments for an application (tenant sees their payments, landlord sees all)
  app.get("/api/applications/:applicationId/payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.applicationId;
      
      // Get application to verify access
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, properties(owner_id)")
        .eq("id", applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isTenant = application.user_id === req.user!.id;
      const isLandlord = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view payments" });
      }

      // Get lease for this application
      const { data: lease } = await supabase
        .from("leases")
        .select("id")
        .eq("application_id", applicationId)
        .single();

      if (!lease) {
        return res.json(success([], "No lease found for this application"));
      }

      // Get payments for the lease
      const { data: payments, error } = await supabase
        .from("payments")
        .select("*, verified_by_user:users!payments_verified_by_fkey(full_name)")
        .eq("lease_id", lease.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Mark overdue payments (past due date and not verified/paid)
      const now = new Date();
      const enrichedPayments = (payments || []).map((p: any) => {
        const dueDate = new Date(p.due_date);
        const isOverdue = p.status === 'pending' && dueDate < now;
        return {
          ...p,
          status: isOverdue ? 'overdue' : p.status
        };
      });

      return res.json(success(enrichedPayments, "Payments retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Get error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payments"));
    }
  });

  // Get security deposit status for dashboard display
  app.get("/api/applications/:applicationId/security-deposit", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.applicationId;
      
      // Get application to verify access
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, lease_status, properties(owner_id)")
        .eq("id", applicationId)
        .limit(1)
        .maybeSingle();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isTenant = application.user_id === req.user!.id;
      const isLandlord = (application.properties as any)?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view deposit status" });
      }

      // Get lease for this application
      const { data: lease } = await supabase
        .from("leases")
        .select("id, security_deposit_amount")
        .eq("application_id", applicationId)
        .limit(1)
        .maybeSingle();

      if (!lease) {
        return res.json(success({
          required: false,
          leaseStatus: application.lease_status,
          message: "No lease found - deposit not required yet"
        }, "Deposit status retrieved"));
      }

      // Get security deposit payment
      const { data: payment } = await supabase
        .from("payments")
        .select("id, amount, status, due_date, paid_at, verified_at, verified_by")
        .eq("lease_id", lease.id)
        .eq("type", "security_deposit")
        .limit(1)
        .maybeSingle();

      return res.json(success({
        required: true,
        leaseStatus: application.lease_status,
        securityDepositAmount: lease.security_deposit_amount,
        payment: payment || null,
        message: payment ? `Security deposit is ${payment.status}` : "Security deposit payment not found"
      }, "Deposit status retrieved"));
    } catch (err: any) {
      console.error("[PAYMENTS] Security deposit status error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve deposit status"));
    }
  });

  // Verify a payment manually (landlord/admin only)
  app.post("/api/payments/:paymentId/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;
      const { amount, method, dateReceived } = req.body;

      // Validate required fields
      if (!amount || !method || !dateReceived) {
        return res.status(400).json({ error: "Amount, method, and date received are required" });
      }

      // Get payment with lease info
      const { data: payment } = await supabase
        .from("payments")
        .select("*, leases(landlord_id, application_id, tenant_id)")
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const isLandlord = payment.leases?.landlord_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Only landlord or admin can verify payments" });
      }

      if (payment.status === "verified") {
        return res.status(400).json({ error: "Payment already verified" });
      }

      // Update payment status to verified with manual verification details
      const { error } = await supabase
        .from("payments")
        .update({
          status: "verified",
          verified_by: req.user!.id,
          verified_at: new Date().toISOString(),
          paid_at: new Date(dateReceived).toISOString(),
          manual_payment_method: method,
          amount: parseFloat(amount),
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Log payment audit event
      await logPaymentAction(
        req.user!.id,
        paymentId,
        "payment_verified",
        payment.status,
        "verified",
        { 
          method, 
          amount, 
          dateReceived,
          type: payment.type,
          verifiedByRole: req.user!.role
        },
        req
      );

      // Send notification to tenant that payment was verified
      try {
        const { data: tenantData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", payment.leases?.tenant_id)
          .single();
        
        if (tenantData?.full_name) {
          await sendPaymentVerifiedNotification(
            paymentId,
            payment.leases?.tenant_id,
            payment.type === 'rent' ? 'Rent' : 'Security Deposit',
            amount.toString()
          );
        }
      } catch (notificationErr) {
        console.error("[PAYMENTS] Failed to send verification notification:", notificationErr);
        // Continue with response even if notification fails
      }

      return res.json(success(
        { status: "verified", message: "Payment verified." },
        "Payment verified successfully"
      ));
    } catch (err: any) {
      console.error("[PAYMENTS] Verify error:", err);
      return res.status(500).json(errorResponse("Failed to verify payment"));
    }
  });

  // Mark payment as paid (tenant action)
  app.post("/api/payments/:paymentId/mark-paid", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;
      const { referenceId, notes } = req.body;

      // Get payment
      const { data: payment } = await supabase
        .from("payments")
        .select("*, leases(tenant_id)")
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const isTenant = payment.leases?.tenant_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isAdmin) {
        return res.status(403).json({ error: "Only tenant can mark their own payment as paid" });
      }

      if (payment.status === "verified" || payment.status === "paid") {
        return res.status(400).json({ error: "Payment already processed" });
      }

      // Update payment status to paid (awaiting verification)
      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          reference_id: referenceId || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Log payment audit event
      await logPaymentAction(
        req.user!.id,
        paymentId,
        "payment_marked_paid",
        payment.status,
        "paid",
        { 
          referenceId,
          notes,
          amount: payment.amount,
          type: payment.type
        },
        req
      );

      // Send notification to landlord that payment was marked as paid
      try {
        const { data: tenantData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", req.user!.id)
          .single();
        
        if (tenantData?.full_name) {
          await sendPaymentReceivedNotification(
            paymentId,
            tenantData.full_name,
            payment.type === 'rent' ? 'Rent' : 'Security Deposit',
            payment.amount.toString()
          );
        }
      } catch (notificationErr) {
        console.error("[PAYMENTS] Failed to send notification:", notificationErr);
        // Continue with response even if notification fails
      }

      return res.json(success({ status: "paid" }, "Payment marked as paid - awaiting verification"));
    } catch (err: any) {
      console.error("[PAYMENTS] Mark paid error:", err);
      return res.status(500).json(errorResponse("Failed to mark payment as paid"));
    }
  });

  // Get receipt details for a payment (for download/print)
  app.get("/api/payments/:paymentId/receipt", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;

      // Get payment with full details
      const { data: payment } = await supabase
        .from("payments")
        .select(`
          id,
          type,
          amount,
          due_date,
          paid_at,
          verified_at,
          reference_id,
          status,
          created_at,
          leases(
            id,
            application_id,
            monthly_rent,
            security_deposit_amount,
            applications(
              id,
              property_id,
              tenant_id,
              properties(title, address),
              users(full_name, email)
            )
          ),
          verified_by_user:users!payments_verified_by_fkey(full_name, email)
        `)
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Authorization: tenant or landlord
      const isTenant = (payment as any).leases?.[0]?.applications?.[0]?.tenant_id === req.user!.id;
      const isLandlord = (payment as any).leases?.[0]?.applications?.[0]?.properties?.[0]?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view this receipt" });
      }

      // Format receipt data
      const paymentAny = payment as any;
      const receipt = {
        receiptNumber: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
        paymentId: payment.id,
        type: payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit',
        amount: parseFloat(payment.amount.toString()),
        dueDate: payment.due_date,
        paidDate: payment.paid_at || payment.verified_at,
        verificationDate: payment.verified_at,
        status: payment.status,
        referenceId: payment.reference_id,
        property: {
          title: paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.title,
          address: paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.address
        },
        tenant: {
          name: paymentAny.leases?.[0]?.applications?.[0]?.users?.[0]?.full_name,
          email: paymentAny.leases?.[0]?.applications?.[0]?.users?.[0]?.email
        },
        verifiedBy: paymentAny.verified_by_user?.full_name || 'Pending verification',
        createdAt: payment.created_at
      };

      return res.json(success(receipt, "Receipt retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Receipt error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve receipt"));
    }
  });

  // Get lease payment history for landlord
  app.get("/api/leases/:leaseId/payment-history", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const leaseId = req.params.leaseId;

      // Get lease with authorization check
      const { data: lease } = await supabase
        .from("leases")
        .select("id, landlord_id, tenant_id, monthly_rent, security_deposit_amount, applications(property_id, properties(title, address))")
        .eq("id", leaseId)
        .single();

      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const isLandlord = lease.landlord_id === req.user!.id;
      const isTenant = lease.tenant_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isLandlord && !isTenant && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view payment history" });
      }

      // Get all payments for this lease
      const { data: payments, error } = await supabase
        .from("payments")
        .select("*, verified_by_user:users!payments_verified_by_fkey(full_name)")
        .eq("lease_id", leaseId)
        .order("due_date", { ascending: false });

      if (error) throw error;

      // Mark overdue payments
      const now = new Date();
      const enrichedPayments = (payments || []).map((p: any) => {
        const dueDate = new Date(p.due_date);
        const isOverdue = p.status === 'pending' && dueDate < now;
        return {
          ...p,
          status: isOverdue ? 'overdue' : p.status
        };
      });

      // Calculate summary
      const summary = {
        totalPayments: enrichedPayments.length,
        verified: enrichedPayments.filter((p: any) => p.status === 'verified').length,
        paid: enrichedPayments.filter((p: any) => p.status === 'paid').length,
        pending: enrichedPayments.filter((p: any) => p.status === 'pending').length,
        overdue: enrichedPayments.filter((p: any) => p.status === 'overdue').length,
        totalVerifiedAmount: enrichedPayments
          .filter((p: any) => p.status === 'verified')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0),
        totalOutstandingAmount: enrichedPayments
          .filter((p: any) => ['pending', 'overdue'].includes(p.status))
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0)
      };

      return res.json(success({
        lease: {
          id: lease.id,
          property: lease.applications?.properties,
          monthlyRent: lease.monthly_rent,
          securityDepositAmount: lease.security_deposit_amount
        },
        payments: enrichedPayments,
        summary
      }, "Payment history retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] History error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payment history"));
    }
  });

  // Generate monthly rent payment records for a lease
  app.post("/api/leases/:leaseId/generate-rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const leaseId = req.params.leaseId;
      const { gracePeriodDays = 0 } = req.body;

      // Get lease with authorization check
      const { data: lease, error: leaseError } = await supabase
        .from("leases")
        .select("id, tenant_id, landlord_id, monthly_rent, rent_due_day, lease_start_date, lease_end_date")
        .eq("id", leaseId)
        .single();

      if (leaseError || !lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      // Authorization: tenant, landlord, or admin
      const isTenant = lease.tenant_id === req.user!.id;
      const isLandlord = lease.landlord_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to generate rent payments" });
      }

      const startDate = new Date(lease.lease_start_date);
      const endDate = new Date(lease.lease_end_date);
      const rentDueDay = lease.rent_due_day || 1;
      const rentAmount = parseFloat(lease.monthly_rent.toString());
      const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;

      // Generate monthly rent payment dates
      const paymentsToCreate = [];
      const currentDate = new Date(startDate);

      while (currentDate < endDate) {
        // Calculate the due date for this month (rentDueDay of current month)
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), rentDueDay);
        
        // If the due date is before the lease start, set it to next month
        if (dueDate < startDate) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        // Only add if due date is within lease period
        if (dueDate <= endDate) {
          paymentsToCreate.push({
            lease_id: leaseId,
            tenant_id: lease.tenant_id,
            amount: rentAmount,
            type: "rent",
            status: "pending",
            due_date: dueDate.toISOString()
          });
        }

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (paymentsToCreate.length === 0) {
        return res.json(success({ created: 0, message: "No rent payments to create for lease period" }, "No payments generated"));
      }

      // Check for existing rent payments to prevent duplicates
      const { data: existingPayments, error: existingError } = await supabase
        .from("payments")
        .select("due_date, type")
        .eq("lease_id", leaseId)
        .eq("type", "rent");

      if (existingError) throw existingError;

      // Filter out duplicate payment dates
      const existingDates = new Set(existingPayments?.map(p => new Date(p.due_date).toDateString()) || []);
      const newPayments = paymentsToCreate.filter(p => 
        !existingDates.has(new Date(p.due_date).toDateString())
      );

      if (newPayments.length === 0) {
        return res.json(success({ created: 0, message: "All rent payments already exist" }, "No duplicate payments created"));
      }

      // Insert new rent payments
      const { data: inserted, error: insertError } = await supabase
        .from("payments")
        .insert(newPayments)
        .select();

      if (insertError) throw insertError;

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        action: "create",
        resourceType: "payment",
        resourceId: leaseId,
        previousData: {} as Record<string, any>,
        newData: { count: inserted?.length || 0, type: "rent" },
        req
      });

      return res.json(success({
        created: inserted?.length || 0,
        payments: inserted || [],
        message: `Generated ${inserted?.length || 0} rent payment records`
      }, "Rent payments generated successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Generate rent error:", err);
      return res.status(500).json(errorResponse("Failed to generate rent payments"));
    }
  });

  // BLOCK: Prevent payment deletion - Payments cannot be deleted for audit compliance
  app.delete("/api/payments/:paymentId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    // Log the blocked deletion attempt
    await logPaymentAction(
      req.user!.id,
      req.params.paymentId,
      "payment_delete_blocked",
      undefined,
      undefined,
      { 
        attemptedBy: req.user!.id,
        role: req.user!.role,
        reason: "Payment deletion is blocked for financial accountability"
      },
      req
    );
    
    return res.status(403).json({ 
      error: "Payment records cannot be deleted for audit and compliance purposes",
      code: "PAYMENT_DELETE_BLOCKED"
    });
  });

  // Get payment audit logs (admin/landlord only)
  app.get("/api/payments/audit-logs", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = req.user!.role === "admin";
      const isLandlord = req.user!.role === "landlord";
      const isPropertyManager = req.user!.role === "property_manager";

      if (!isAdmin && !isLandlord && !isPropertyManager) {
        return res.status(403).json({ error: "Only admins, landlords, and property managers can view payment audit logs" });
      }

      const paymentId = req.query.paymentId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const { logs, total } = await getPaymentAuditLogs(paymentId, page, limit);

      return res.json(success({
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }, "Payment audit logs retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Audit logs error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payment audit logs"));
    }
  });

  // ===== MANAGER APPLICATION & LEASE MANAGEMENT =====
  // Get applications for manager (property manager assigned to property)
  app.get("/api/manager/applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can access this endpoint" });
      }

      const { propertyId, status, page = "1" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limit = 20;
      const offset = (pageNum - 1) * limit;

      let query = supabase
        .from("applications")
        .select("*, properties(owner_id, title), users(full_name, email)", { count: "exact" });

      if (propertyId) {
        // Check if manager is assigned to this property
        const { data: assignment } = await supabase
          .from("property_manager_assignments")
          .select("id")
          .eq("property_manager_id", req.user!.id)
          .eq("property_id", propertyId as string)
          .is("revoked_at", null)
          .single();

        if (!assignment) {
          return res.status(403).json({ error: "Not assigned to this property" });
        }

        query = query.eq("property_id", propertyId as string);
      } else {
        // Get all properties assigned to this manager
        const { data: assignments } = await supabase
          .from("property_manager_assignments")
          .select("property_id")
          .eq("property_manager_id", req.user!.id)
          .is("revoked_at", null);

        const propertyIds = assignments?.map(a => a.property_id) || [];
        if (propertyIds.length === 0) {
          return res.json(success({ applications: [], pagination: { page: pageNum, limit, total: 0, totalPages: 0 } }));
        }

        query = query.in("property_id", propertyIds);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);
      return res.json(success({
        applications: data,
        pagination: { page: pageNum, limit, total: count || 0, totalPages }
      }, "Applications fetched"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch applications"));
    }
  });

  // Manager review application (move to under_review)
  app.post("/api/manager/applications/:id/review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can review applications" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("property_id, status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify manager is assigned to property
      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", application.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      // Update status to under_review
      const { data, error } = await supabase
        .from("applications")
        .update({
          status: "under_review",
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      // Log action
      await logApplicationChange(
        req.user!.id,
        req.params.id,
        "status_change",
        { status: application.status },
        { status: "under_review" },
        req
      );

      return res.json(success(data, "Application moved to under review"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to review application"));
    }
  });

  // Manager approve application
  app.post("/api/manager/applications/:id/approve", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can approve applications" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("property_id, status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", application.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("applications")
        .update({
          status: "approved",
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      await logApplicationChange(
        req.user!.id,
        req.params.id,
        "status_change",
        { status: application.status },
        { status: "approved" },
        req
      );

      return res.json(success(data, "Application approved"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to approve application"));
    }
  });

  // Manager reject application
  app.post("/api/manager/applications/:id/reject", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can reject applications" });
      }

      const { rejectionCategory, rejectionReason } = req.body;

      if (!rejectionCategory || !rejectionReason) {
        return res.status(400).json({ error: "Rejection category and reason are required" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("property_id, status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", application.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("applications")
        .update({
          status: "rejected",
          rejection_category: rejectionCategory,
          rejection_reason: rejectionReason,
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      await logApplicationChange(
        req.user!.id,
        req.params.id,
        "status_change",
        { status: application.status },
        { status: "rejected" },
        req
      );

      return res.json(success(data, "Application rejected"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to reject application"));
    }
  });

  // Manager send lease to tenant
  app.post("/api/manager/leases/:leaseId/send", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can send leases" });
      }

      const { data: lease } = await supabase
        .from("leases")
        .select("application_id, property_id, status")
        .eq("id", req.params.leaseId)
        .single();

      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", lease.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("leases")
        .update({
          status: "lease_sent",
          sent_at: new Date().toISOString(),
          sent_by: req.user!.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.leaseId)
        .select()
        .single();

      if (error) throw error;

      await logLeaseAction(
        req.user!.id,
        lease.application_id,
        "lease_sent",
        undefined,
        undefined,
        `Manager sent lease to tenant`,
        req
      );

      return res.json(success(data, "Lease sent to tenant"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to send lease"));
    }
  });

  // Block property ownership changes for managers
  app.patch("/api/manager/applications/:id/application-fee", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // This endpoint explicitly blocks property managers from modifying application fees
      if (req.user!.role === "property_manager") {
        await logSecurityEvent(
          req.user!.id,
          "login",
          false,
          { reason: "Blocked: Manager attempted to modify application fee" },
          req
        );
        return res.status(403).json({ 
          error: "Property managers cannot modify application fees",
          code: "PERMISSION_DENIED"
        });
      }

      return res.status(403).json({ error: "Unauthorized" });
    } catch (err: any) {
      return res.status(500).json(errorResponse("Operation failed"));
    }
  });

  // Get rent payments for a lease (grouped by month)
  app.get("/api/leases/:leaseId/rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const leaseId = req.params.leaseId;

      // Get lease with authorization check
      const { data: lease } = await supabase
        .from("leases")
        .select("tenant_id, landlord_id")
        .eq("id", leaseId)
        .single();

      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const isTenant = lease.tenant_id === req.user!.id;
      const isLandlord = lease.landlord_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view rent payments" });
      }

      // Get all rent payments for this lease
      const { data: payments, error } = await supabase
        .from("payments")
        .select("*")
        .eq("lease_id", leaseId)
        .eq("type", "rent")
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Group by payment status
      const grouped = {
        pending: payments?.filter(p => p.status === "pending") || [],
        paid: payments?.filter(p => p.status === "paid") || [],
        verified: payments?.filter(p => p.status === "verified") || [],
        overdue: payments?.filter(p => p.status === "overdue") || []
      };

      const stats = {
        totalRent: payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0,
        pendingAmount: grouped.pending.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        paidAmount: grouped.paid.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        verifiedAmount: grouped.verified.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        overdueAmount: grouped.overdue.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
      };

      return res.json(success({ payments: grouped, stats }, "Rent payments retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Get rent payments error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve rent payments"));
    }
  });

  // ===== IMAGE KIT UPLOAD =====
  // Generate signed upload token for secure direct uploads to ImageKit
  app.post("/api/imagekit/upload-token", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!imagekit) {
        return res.status(503).json(errorResponse("ImageKit is not configured"));
      }

      const { category = "general" } = req.body;

      // Verify user has upload permissions
      const uploadRoles = ["admin", "owner", "agent", "landlord", "property_manager"];
      if (!uploadRoles.includes(req.user!.role)) {
        await logSecurityEvent(
          req.user!.id,
          "login",
          false,
          { reason: "Unauthorized upload attempt", role: req.user!.role },
          req
        );
        return res.status(403).json({ error: "Your role does not have permission to upload" });
      }

      // Generate token with 15 minute expiry
      const expirySeconds = 15 * 60; // 15 minutes
      const token = imagekit.getAuthenticationParameters(
        Math.floor(Date.now() / 1000) + expirySeconds
      );

      return res.json(success({
        token: token.token,
        signature: token.signature,
        expire: token.expire,
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        category
      }, "Upload token generated successfully"));
    } catch (err: any) {
      console.error("[IMAGEKIT] Upload token error:", err);
      return res.status(500).json(errorResponse("Failed to generate upload token"));
    }
  });

  // Save photo metadata to database
  app.post("/api/photos", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertPhotoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { imageKitFileId, url, thumbnailUrl, category, propertyId, maintenanceRequestId, metadata } = validation.data;

      // Validate category
      if (!PHOTO_CATEGORIES.includes(category as any)) {
        return res.status(400).json({ error: "Invalid photo category" });
      }

      // If propertyId provided, verify property exists and user has access
      if (propertyId) {
        const { data: property, error: propError } = await supabase
          .from("properties")
          .select("owner_id, listing_agent_id")
          .eq("id", propertyId)
          .single();

        if (propError || !property) {
          return res.status(404).json({ error: "Property not found" });
        }

        // Verify user has access to property (owner, agent, or admin)
        const hasAccess = 
          property.owner_id === req.user!.id ||
          property.listing_agent_id === req.user!.id ||
          req.user!.role === "admin" ||
          req.user!.role === "property_manager";

        if (!hasAccess) {
          await logSecurityEvent(
            req.user!.id,
            "unauthorized_access",
            false,
            { reason: "Unauthorized photo upload for property", propertyId },
            req
          );
          return res.status(403).json({ error: "You do not have access to this property" });
        }

        // Check image count limit for property
        const limitStatus = await checkPropertyImageLimit(supabase, propertyId);
        if (!limitStatus.allowed) {
          await logSecurityEvent(
            req.user!.id,
            "upload_limit_exceeded",
            false,
            { reason: "Image upload limit exceeded", propertyId, imageCount: limitStatus.imageCount },
            req
          );
          return res.status(400).json({ error: limitStatus.reason });
        }
      }

      // Validate file size if metadata contains fileSize
      if (metadata?.fileSize) {
        const sizeValidation = validateFileSize((metadata as any)?.[0]?.fileSize);
        if (!sizeValidation.valid) {
          await logSecurityEvent(
            req.user!.id,
            "upload_size_exceeded",
            false,
            { reason: "File size exceeds limit", fileSize: (metadata as any)?.[0]?.fileSize, propertyId },
            req
          );
          return res.status(400).json({ error: sizeValidation.reason });
        }
      }

      // If maintenanceRequestId provided, validate it exists (future-proofing)
      if (maintenanceRequestId) {
        // For now, we'll skip validation as maintenance_requests table may not exist yet
        // This can be enabled once maintenance request tracking is implemented
      }

      // Insert photo metadata
      const { data, error } = await supabase
        .from("photos")
        .insert([{
          imagekit_file_id: imageKitFileId,
          url,
          thumbnail_url: thumbnailUrl,
          category,
          uploader_id: req.user!.id,
          property_id: propertyId || null,
          maintenance_request_id: maintenanceRequestId || null,
          metadata: metadata,
        }])
        .select();

      if (error) throw error;

      // Log the action
      await logSecurityEvent(
        req.user!.id,
        "file_upload",
        true,
        { photoId: data[0].id, category, propertyId },
        req
      );

      // Log to image audit logs
      await logImageAudit(supabase, {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: "image_upload",
        photoId: data[0].id,
        propertyId: propertyId || undefined,
        metadata: { category, url }
      });

      return res.json(success(data[0], "Photo metadata saved successfully"));
    } catch (err: any) {
      console.error("[PHOTOS] Save metadata error:", err);
      return res.status(500).json(errorResponse("Failed to save photo metadata"));
    }
  });

  // Get photos for a property
  app.get("/api/photos/property/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Verify access to property
      const { data: property, error: propError } = await supabase
        .from("properties")
        .select("owner_id, listing_agent_id")
        .eq("id", req.params.propertyId)
        .single();

      if (propError || !property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const hasAccess = 
        property.owner_id === req.user!.id ||
        property.listing_agent_id === req.user!.id ||
        req.user!.role === "admin" ||
        req.user!.role === "property_manager";

      if (!hasAccess) {
        return res.status(403).json({ error: "You do not have access to this property" });
      }

      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("property_id", req.params.propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.json(success(data, "Photos fetched successfully"));
    } catch (err: any) {
      console.error("[PHOTOS] Fetch error:", err);
      return res.status(500).json(errorResponse("Failed to fetch photos"));
    }
  });

  // Get optimized images for property (public - no auth required, respects privacy)
  app.get("/api/images/property/:propertyId", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // If ImageKit isn't configured, return empty array gracefully
      const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "";
      if (!urlEndpoint) {
        return res.json(success([], "No optimized images available (ImageKit not configured)"));
      }

      const { data: photos, error } = await supabase
        .from("photos")
        .select("id, imagekit_file_id, thumbnail_url, category, created_at, is_private, uploader_id, property_id, order_index")
        .eq("property_id", req.params.propertyId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        // Handle schema cache miss gracefully - table may not be in PostgREST cache yet
        if (error.code === 'PGRST205') {
          console.log("[IMAGES] Photos table not in Supabase schema cache yet. Returning empty array.");
          return res.json(success([], "Photos table not available yet"));
        }
        throw error;
      }

      // Filter by privacy - only show public images or if user is authorized
      const visiblePhotos = (photos || []).filter((photo) => {
        if (!photo.is_private) return true; // Public images always visible
        
        // Private images: only show if authorized
        if (!req.user) return false;
        
        return canAccessPrivateImage({
          userId: req.user.id,
          userRole: req.user.role,
          uploaderId: photo.uploader_id,
          propertyId: photo.property_id,
        });
      });

      const optimizedPhotos = visiblePhotos.map((photo) => ({
        id: photo.id,
        category: photo.category,
        createdAt: photo.created_at,
        isPrivate: photo.is_private,
        imageUrls: {
          // Thumbnail: 300x200, 75% quality
          thumbnail: `${urlEndpoint}/${photo.imagekit_file_id}?tr=w-300,h-200,q-75,f-auto`,
          // Gallery: 800x600, 85% quality
          gallery: `${urlEndpoint}/${photo.imagekit_file_id}?tr=w-800,h-600,q-85,f-auto`,
          // Original: high quality
          original: `${urlEndpoint}/${photo.imagekit_file_id}?tr=q-90,f-auto`,
        },
      }));

      return res.json(success(optimizedPhotos, "Optimized images fetched successfully"));
    } catch (err: any) {
      console.error("[IMAGES] Fetch optimized error:", err);
      return res.status(500).json(errorResponse("Failed to fetch images"));
    }
  });

  // Generate signed URL for private image access
  app.post("/api/images/signed", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { photoId, expiresIn = 3600 } = req.body;

      if (!photoId) {
        return res.status(400).json(errorResponse("photoId is required"));
      }

      const { data: photo, error: photoError } = await supabase
        .from("photos")
        .select("id, imagekit_file_id, is_private, uploader_id, property_id")
        .eq("id", photoId)
        .single();

      if (photoError || !photo) {
        return res.status(404).json(errorResponse("Photo not found"));
      }

      // Check if user has access to this image
      if (photo.is_private) {
        const { data: property } = photo.property_id 
          ? await supabase
              .from("properties")
              .select("owner_id, listing_agent_id")
              .eq("id", photo.property_id)
              .single()
          : { data: null };

        const hasAccess = canAccessPrivateImage({
          userId: req.user!.id,
          userRole: req.user!.role,
          uploaderId: photo.uploader_id,
          propertyId: photo.property_id,
          propertyOwnerId: property?.owner_id,
          listingAgentId: property?.listing_agent_id,
        });

        if (!hasAccess) {
          await logSecurityEvent(
            req.user!.id,
            "unauthorized_access",
            false,
            { reason: "Attempted unauthorized access to private image", photoId },
            req
          );
          return res.status(403).json(errorResponse("You do not have access to this image"));
        }
      }

      // Generate signed URL
      const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "";
      const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";

      if (!urlEndpoint || !privateKey) {
        return res.status(500).json(errorResponse("ImageKit not configured"));
      }

      const signedUrl = generateSignedImageURL(
        photo.imagekit_file_id,
        urlEndpoint,
        privateKey,
        expiresIn
      );

      // Log the action
      await logSecurityEvent(
        req.user!.id,
        "signed_url_generated",
        true,
        { photoId, isPrivate: photo.is_private },
        req
      );

      return res.json(success({ url: signedUrl, expiresIn }, "Signed URL generated"));
    } catch (err: any) {
      console.error("[IMAGES] Signed URL error:", err);
      return res.status(500).json(errorResponse("Failed to generate signed URL"));
    }
  });

  // Reorder photos
  app.put("/api/photos/:photoId/order", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { orderIndex } = req.body;
      
      if (orderIndex === undefined || typeof orderIndex !== 'number') {
        return res.status(400).json(errorResponse("orderIndex must be a number"));
      }

      const { data: photo, error: photoError } = await supabase
        .from("photos")
        .select("id, property_id, uploader_id")
        .eq("id", req.params.photoId)
        .single();

      if (photoError || !photo) {
        return res.status(404).json(errorResponse("Photo not found"));
      }

      // Verify access
      const { data: property } = photo.property_id
        ? await supabase.from("properties").select("owner_id, listing_agent_id").eq("id", photo.property_id).single()
        : { data: null };

      const hasAccess = photo.uploader_id === req.user!.id || 
                       property?.owner_id === req.user!.id ||
                       property?.listing_agent_id === req.user!.id ||
                       req.user!.role === "admin";

      if (!hasAccess) {
        return res.status(403).json(errorResponse("Unauthorized"));
      }

      const { data, error } = await supabase
        .from("photos")
        .update({ order_index: orderIndex })
        .eq("id", req.params.photoId)
        .select();

      if (error) throw error;

      await logSecurityEvent(req.user!.id, "photo_reordered", true, { photoId: req.params.photoId }, req);
      
      // Log to image audit logs
      await logImageAudit(supabase, {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: "image_reorder",
        photoId: req.params.photoId,
        propertyId: photo.property_id,
        metadata: { orderIndex }
      });
      
      return res.json(success(data[0], "Photo reordered"));
    } catch (err: any) {
      console.error("[IMAGES] Reorder error:", err);
      return res.status(500).json(errorResponse("Failed to reorder photo"));
    }
  });

  // Delete/archive photo
  app.delete("/api/photos/:photoId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: photo, error: photoError } = await supabase
        .from("photos")
        .select("id, property_id, uploader_id, imagekit_file_id, archived")
        .eq("id", req.params.photoId)
        .single();

      if (photoError || !photo) {
        return res.status(404).json(errorResponse("Photo not found"));
      }

      if (photo.archived) {
        return res.status(400).json(errorResponse("Photo already archived"));
      }

      // Verify access
      const { data: property } = photo.property_id
        ? await supabase.from("properties").select("owner_id, listing_agent_id").eq("id", photo.property_id).single()
        : { data: null };

      const hasAccess = photo.uploader_id === req.user!.id || 
                       property?.owner_id === req.user!.id ||
                       property?.listing_agent_id === req.user!.id ||
                       req.user!.role === "admin";

      if (!hasAccess) {
        return res.status(403).json(errorResponse("Unauthorized"));
      }

      // Archive photo and delete from ImageKit with audit logging
      await archivePhoto(supabase, req.params.photoId, photo.imagekit_file_id, {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: "image_delete",
        photoId: req.params.photoId,
        propertyId: photo.property_id,
        metadata: { imageKitFileId: photo.imagekit_file_id }
      });

      await logSecurityEvent(req.user!.id, "photo_archived", true, { photoId: req.params.photoId }, req);
      return res.json(success(null, "Photo archived"));
    } catch (err: any) {
      console.error("[IMAGES] Delete error:", err);
      return res.status(500).json(errorResponse("Failed to delete photo"));
    }
  });

  // Get image audit logs (admin only)
  app.get("/api/admin/image-audit-logs", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { propertyId, action, limit = 100, offset = 0 } = req.query;

      let query = supabase
        .from("image_audit_logs")
        .select("id, actor_id, actor_role, action, photo_id, property_id, metadata, timestamp, users:actor_id(id, full_name, email, role)", { count: "exact" })
        .order("timestamp", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error, count } = await query.range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) throw error;

      return res.json(success({
        logs: data,
        pagination: {
          offset: Number(offset),
          limit: Number(limit),
          total: count || 0
        }
      }, "Image audit logs retrieved"));
    } catch (err: any) {
      console.error("[ADMIN] Image audit logs error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve image audit logs"));
    }
  });

  // Replace photo
  app.post("/api/photos/:photoId/replace", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { imageKitFileId, url, thumbnailUrl } = req.body;

      if (!imageKitFileId || !url) {
        return res.status(400).json(errorResponse("imageKitFileId and url are required"));
      }

      const { data: photo, error: photoError } = await supabase
        .from("photos")
        .select("id, property_id, uploader_id, archived")
        .eq("id", req.params.photoId)
        .single();

      if (photoError || !photo) {
        return res.status(404).json(errorResponse("Photo not found"));
      }

      if (photo.archived) {
        return res.status(400).json(errorResponse("Cannot replace archived photo"));
      }

      // Verify access
      const { data: property } = photo.property_id
        ? await supabase.from("properties").select("owner_id, listing_agent_id").eq("id", photo.property_id).single()
        : { data: null };

      const hasAccess = photo.uploader_id === req.user!.id || 
                       property?.owner_id === req.user!.id ||
                       property?.listing_agent_id === req.user!.id ||
                       req.user!.role === "admin";

      if (!hasAccess) {
        return res.status(403).json(errorResponse("Unauthorized"));
      }

      // Replace photo with audit logging
      const newPhoto = await replacePhoto(supabase, req.params.photoId, {
        imageKitFileId,
        url,
        thumbnailUrl,
      }, {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: "image_replace",
        photoId: req.params.photoId,
        propertyId: photo.property_id,
        metadata: { oldPhotoId: req.params.photoId, url }
      });

      await logSecurityEvent(req.user!.id, "photo_replaced", true, { oldPhotoId: req.params.photoId, newPhotoId: newPhoto?.id }, req);
      return res.json(success(newPhoto, "Photo replaced"));
    } catch (err: any) {
      console.error("[IMAGES] Replace error:", err);
      return res.status(500).json(errorResponse("Failed to replace photo"));
    }
  });

  // ===== ADMIN: STORAGE & BANDWIDTH MONITOR =====
  app.get("/api/admin/storage-metrics", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Check admin role
      if (req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Admin access only"));
      }

      // Get all photos with their file size and view count
      const { data: photos, error } = await supabase
        .from("photos")
        .select("file_size_bytes, view_count, archived")
        .eq("archived", false);

      if (error) throw error;

      // Calculate metrics
      const totalImages = photos?.length || 0;
      const totalStorageUsed = photos?.reduce((sum, p) => sum + (p.file_size_bytes || 0), 0) || 0;
      const estimatedBandwidthUsed = photos?.reduce((sum, p) => sum + ((p.file_size_bytes || 0) * (p.view_count || 0)), 0) || 0;

      // Free tier limits (100GB storage, 100GB bandwidth per month)
      const FREE_TIER_STORAGE_BYTES = 100 * 1024 * 1024 * 1024; // 100GB
      const storagePercentage = (totalStorageUsed / FREE_TIER_STORAGE_BYTES) * 100;

      return res.json(success({
        totalImages,
        totalStorageUsed,
        estimatedBandwidthUsed,
        storagePercentage
      }, "Storage metrics retrieved successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Storage metrics error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve storage metrics"));
    }
  });

  return httpServer;
}
