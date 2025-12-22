import type { Express } from "express";
import { supabase } from "../supabase";
import imagekit from "../imagekit";
import { authenticateToken, optionalAuth, requireRole, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertPhotoSchema, PHOTO_CATEGORIES } from "@shared/schema";
import { logSecurityEvent } from "../security/audit-logger";
import { generateSignedImageURL, canAccessPrivateImage } from "../image-transform";
import { archivePhoto, replacePhoto } from "../image-management";
import { logImageAudit } from "../image-audit";
import { checkPropertyImageLimit, validateFileSize } from "../upload-limits";

export function registerImageKitRoutes(app: Express): void {
  app.post("/api/imagekit/upload-token", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!imagekit) {
        return res.status(503).json(errorResponse("ImageKit is not configured"));
      }

      const { category = "general" } = req.body;

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

      const expirySeconds = 15 * 60;
      const expireTimestamp = Math.floor(Date.now() / 1000) + expirySeconds;
      const token = imagekit.getAuthenticationParameters(expireTimestamp);

      return res.json(success({
        token: token.token,
        signature: token.signature,
        expire: token.expire,
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        urlEndpoint: "https://upload.imagekit.io",
        category
      }, "Upload token generated successfully"));
    } catch (err: any) {
      console.error("[IMAGEKIT] Upload token error:", err);
      return res.status(500).json(errorResponse("Failed to generate upload token"));
    }
  });

  app.post("/api/photos", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertPhotoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { imageKitFileId, url, thumbnailUrl, category, propertyId, maintenanceRequestId, metadata } = validation.data;

      if (!PHOTO_CATEGORIES.includes(category as any)) {
        return res.status(400).json({ error: "Invalid photo category" });
      }

      if (propertyId) {
        const { data: property, error: propError } = await supabase
          .from("properties")
          .select("owner_id, listing_agent_id")
          .eq("id", propertyId)
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
          await logSecurityEvent(
            req.user!.id,
            "unauthorized_access",
            false,
            { reason: "Unauthorized photo upload for property", propertyId },
            req
          );
          return res.status(403).json({ error: "You do not have access to this property" });
        }

        const limitStatus = await checkPropertyImageLimit(supabase, String(propertyId));
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

      const metadataObj = metadata as Record<string, unknown> | undefined;
      if (metadataObj?.fileSize) {
        const sizeValidation = validateFileSize(metadataObj.fileSize as number);
        if (!sizeValidation.valid) {
          await logSecurityEvent(
            req.user!.id,
            "upload_size_exceeded",
            false,
            { reason: "File size exceeds limit", fileSize: metadataObj.fileSize, propertyId },
            req
          );
          return res.status(400).json({ error: sizeValidation.reason });
        }
      }

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

      await logSecurityEvent(
        req.user!.id,
        "file_upload",
        true,
        { photoId: data[0].id, category, propertyId },
        req
      );

      await logImageAudit(supabase, {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: "image_upload",
        photoId: data[0].id,
        propertyId: propertyId ? String(propertyId) : undefined,
        metadata: { category, url }
      });

      return res.json(success(data[0], "Photo metadata saved successfully"));
    } catch (err: any) {
      console.error("[PHOTOS] Save metadata error:", err);
      return res.status(500).json(errorResponse("Failed to save photo metadata"));
    }
  });

  app.get("/api/photos/property/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
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

  app.get("/api/images/property/:propertyId", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
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
        if (error.code === 'PGRST205') {
          console.log("[IMAGES] Photos table not in Supabase schema cache yet. Returning empty array.");
          return res.json(success([], "Photos table not available yet"));
        }
        throw error;
      }

      const visiblePhotos = (photos || []).filter((photo) => {
        if (!photo.is_private) return true;
        
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
          thumbnail: `${urlEndpoint}/${photo.imagekit_file_id}?tr=w-300,h-200,q-75,f-auto`,
          gallery: `${urlEndpoint}/${photo.imagekit_file_id}?tr=w-800,h-600,q-85,f-auto`,
          original: `${urlEndpoint}/${photo.imagekit_file_id}?tr=q-90,f-auto`,
        },
      }));

      return res.json(success(optimizedPhotos, "Optimized images fetched successfully"));
    } catch (err: any) {
      console.error("[IMAGES] Fetch optimized error:", err);
      return res.status(500).json(errorResponse("Failed to fetch images"));
    }
  });

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
}
