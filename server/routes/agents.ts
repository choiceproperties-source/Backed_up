import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertAgentReviewSchema } from "@shared/schema";

export function registerAgentRoutes(app: Express): void {
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
}
