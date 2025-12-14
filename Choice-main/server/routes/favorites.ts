import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireOwnership, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertFavoriteSchema } from "@shared/schema";

export function registerFavoriteRoutes(app: Express): void {
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
}
