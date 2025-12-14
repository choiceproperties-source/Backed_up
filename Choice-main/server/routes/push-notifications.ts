import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";

export function registerPushNotificationRoutes(app: Express): void {
  app.post("/api/push/subscribe", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", req.user!.id)
        .eq("endpoint", endpoint)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("push_subscriptions")
          .update({
            p256dh: keys.p256dh,
            auth: keys.auth,
            user_agent: req.headers["user-agent"] || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        return res.json(success({ subscribed: true }, "Push subscription updated"));
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .insert([{
          user_id: req.user!.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: req.headers["user-agent"] || null,
        }]);

      if (error) throw error;
      return res.json(success({ subscribed: true }, "Push subscription created"));
    } catch (err: any) {
      console.error("[PUSH] Subscribe error:", err);
      return res.status(500).json(errorResponse("Failed to subscribe to push notifications"));
    }
  });

  app.post("/api/push/unsubscribe", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is required" });
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", req.user!.id)
        .eq("endpoint", endpoint);

      if (error) throw error;
      return res.json(success({ unsubscribed: true }, "Push subscription removed"));
    } catch (err: any) {
      console.error("[PUSH] Unsubscribe error:", err);
      return res.status(500).json(errorResponse("Failed to unsubscribe from push notifications"));
    }
  });

  app.get("/api/push/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, created_at")
        .eq("user_id", req.user!.id);

      if (error) throw error;
      return res.json(success({ 
        subscribed: data && data.length > 0,
        subscriptions: data?.length || 0
      }, "Push status retrieved"));
    } catch (err: any) {
      console.error("[PUSH] Status error:", err);
      return res.status(500).json(errorResponse("Failed to get push status"));
    }
  });

  app.get("/api/agencies/:id/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const agencyId = req.params.id;

      const [agentsResult, transactionsResult, propertiesResult] = await Promise.all([
        supabase
          .from("users")
          .select("id, total_sales, rating")
          .eq("agency_id", agencyId)
          .is("deleted_at", null),
        supabase
          .from("transactions")
          .select("*")
          .eq("agency_id", agencyId),
        supabase
          .from("properties")
          .select("id, status")
          .eq("agency_id", agencyId)
          .is("deleted_at", null),
      ]);

      const agents = agentsResult.data || [];
      const transactions = transactionsResult.data || [];
      const properties = propertiesResult.data || [];

      const completedTransactions = transactions.filter(t => t.status === "completed");
      const totalRevenue = completedTransactions.reduce((acc, t) => acc + parseFloat(t.agency_commission || "0"), 0);
      const totalCommissions = completedTransactions.reduce((acc, t) => acc + parseFloat(t.commission_amount || "0"), 0);

      const stats = {
        totalAgents: agents.length,
        totalProperties: properties.length,
        activeListings: properties.filter(p => p.status === "active").length,
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        pendingTransactions: transactions.filter(t => t.status === "pending").length,
        totalRevenue,
        totalCommissions,
        averageAgentRating: agents.length > 0 
          ? agents.reduce((acc, a) => acc + parseFloat(a.rating || "0"), 0) / agents.length 
          : 0,
        totalSales: agents.reduce((acc, a) => acc + (a.total_sales || 0), 0),
      };

      return res.json(success(stats, "Agency stats fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch agency stats"));
    }
  });
}
