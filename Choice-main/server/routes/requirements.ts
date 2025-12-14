import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, optionalAuth, requireRole, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertRequirementSchema } from "@shared/schema";

export function registerRequirementRoutes(app: Express): void {
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
}
