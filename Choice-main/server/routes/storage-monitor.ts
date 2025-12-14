import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";

export function registerStorageMonitorRoutes(app: Express): void {
  app.get("/api/admin/storage-metrics", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Admin access only"));
      }

      const { data: photos, error } = await supabase
        .from("photos")
        .select("file_size_bytes, view_count, archived")
        .eq("archived", false);

      if (error) throw error;

      const totalImages = photos?.length || 0;
      const totalStorageUsed = photos?.reduce((sum, p) => sum + (p.file_size_bytes || 0), 0) || 0;
      const estimatedBandwidthUsed = photos?.reduce((sum, p) => sum + ((p.file_size_bytes || 0) * (p.view_count || 0)), 0) || 0;

      const FREE_TIER_STORAGE_BYTES = 100 * 1024 * 1024 * 1024;
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
}
