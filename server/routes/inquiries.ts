import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireOwnership, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertInquirySchema } from "@shared/schema";
import { inquiryLimiter } from "../rate-limit";
import { sendEmail, getAgentInquiryEmailTemplate } from "../email";

export function registerInquiryRoutes(app: Express): void {
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

      let adminEmail = null;
      const { data: adminSetting } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_email")
        .single();
      
      if (adminSetting?.value) {
        adminEmail = adminSetting.value;
      } else {
        const { data: adminUser } = await supabase
          .from("users")
          .select("email")
          .eq("role", "admin")
          .limit(1)
          .single();
        adminEmail = adminUser?.email;
      }

      let agentName = "Unknown Agent";
      if (validation.data.agentId) {
        const { data: agentData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", validation.data.agentId)
          .single();
        agentName = agentData?.full_name || "Unknown Agent";
      }

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
}
