import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireOwnership, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertSavedSearchSchema } from "@shared/schema";

export function registerSavedSearchRoutes(app: Express): void {
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
}
