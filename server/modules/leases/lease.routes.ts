import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { LeaseService } from "./lease.service";

const leaseService = new LeaseService();

export function registerLeaseRoutes(app: Express): void {
  // GET /api/v2/leases/:leaseId/payment-history - Get lease payment history
  app.get("/api/v2/leases/:leaseId/payment-history", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await leaseService.getPaymentHistory(req.params.leaseId, req.user!.id, req.user!.role);

      return res.json(success(result, "Payment history retrieved successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[LEASES] Payment history error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payment history"));
    }
  });

  // POST /api/v2/leases/:leaseId/generate-rent-payments - Generate rent payments
  app.post("/api/v2/leases/:leaseId/generate-rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { gracePeriodDays = 0 } = req.body;

      const result = await leaseService.generateRentPayments(
        req.params.leaseId,
        req.user!.id,
        req.user!.role,
        gracePeriodDays,
        req
      );

      return res.json(success(result, "Rent payments generated successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[LEASES] Generate rent error:", err);
      return res.status(500).json(errorResponse("Failed to generate rent payments"));
    }
  });

  // GET /api/v2/leases/:leaseId/rent-payments - Get rent payments
  app.get("/api/v2/leases/:leaseId/rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await leaseService.getRentPayments(req.params.leaseId, req.user!.id, req.user!.role);

      return res.json(success(result, "Rent payments retrieved successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[LEASES] Get rent payments error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve rent payments"));
    }
  });
}
