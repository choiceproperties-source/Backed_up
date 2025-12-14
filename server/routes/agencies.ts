import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertAgencySchema } from "@shared/schema";

export function registerAgencyRoutes(app: Express): void {
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
}
