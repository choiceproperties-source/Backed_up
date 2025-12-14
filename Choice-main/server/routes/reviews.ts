import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireOwnership, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertReviewSchema } from "@shared/schema";

export function registerReviewRoutes(app: Express): void {
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
}
