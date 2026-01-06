import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";

export function registerUserRoutes(app: Express): void {
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
        .select(`
          id, 
          full_name, 
          profile_image, 
          bio, 
          role, 
          location, 
          specialties, 
          years_experience, 
          total_sales, 
          rating, 
          review_count, 
          license_verified,
          display_email,
          display_phone,
          created_at
        `)
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
}
