import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertTransactionSchema } from "@shared/schema";

export function registerTransactionRoutes(app: Express): void {
  app.get("/api/transactions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;

      let query = supabase
        .from("transactions")
        .select(`
          *,
          property:property_id (id, title, address, city, state),
          agent:agent_id (id, full_name, email),
          agency:agency_id (id, name),
          buyer:buyer_id (id, full_name, email)
        `);

      if (role === "agent") {
        query = query.eq("agent_id", userId);
      } else if (role !== "admin") {
        const { data: userAgency } = await supabase
          .from("agencies")
          .select("id")
          .eq("owner_id", userId)
          .single();

        if (userAgency) {
          query = query.eq("agency_id", userAgency.id);
        } else {
          query = query.eq("agent_id", userId);
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Transactions fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch transactions"));
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = insertTransactionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(errorResponse(validation.error.errors[0].message));
      }

      const transactionAmount = parseFloat(req.body.transactionAmount || "0");
      const commissionRate = parseFloat(req.body.commissionRate || "3");
      const agentSplit = parseFloat(req.body.agentSplit || "70");

      const commissionAmount = (transactionAmount * commissionRate) / 100;
      const agentCommission = (commissionAmount * agentSplit) / 100;
      const agencyCommission = commissionAmount - agentCommission;

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          ...validation.data,
          commission_amount: commissionAmount,
          agent_commission: agentCommission,
          agency_commission: agencyCommission,
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Transaction created successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to create transaction"));
    }
  });

  app.patch("/api/transactions/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      if (status === "completed" && data.agent_id) {
        const { data: agent } = await supabase
          .from("users")
          .select("total_sales")
          .eq("id", data.agent_id)
          .single();

        await supabase
          .from("users")
          .update({ total_sales: (agent?.total_sales || 0) + 1 })
          .eq("id", data.agent_id);
      }

      return res.json(success(data, "Transaction status updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update transaction status"));
    }
  });
}
