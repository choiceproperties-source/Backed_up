import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { LeaseService } from "./lease.service";
import { createLeasePdfStream } from "../../services/leaseAgreementPdf";

const leaseService = new LeaseService();

export function registerLeaseRoutes(app: Express): void {
  // PATCH /api/v2/leases/:id/autosave - Autosave lease draft
  app.patch("/api/v2/leases/:id/autosave", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { step, data } = req.body;
      const { data: updated, error } = await supabase
        .from("applications") // Leases are currently tracked via applications table status in this project
        .update({
          ...data,
          last_saved_step: step,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(updated, "Lease autosaved"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Autosave failed"));
    }
  });

  // GET /api/v2/leases/:applicationId/download-signed-pdf - Download signed lease PDF
  app.get("/api/v2/leases/:applicationId/download-signed-pdf", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.applicationId;
      const application = await leaseService.getSignatures(applicationId); // Simplified auth check or add proper ownership check here
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=signed-lease-${applicationId}.pdf`);
      
      await createLeasePdfStream(applicationId, res, true);
    } catch (err: any) {
      console.error("[LEASES] Download PDF error:", err);
      return res.status(500).json(errorResponse("Failed to generate signed lease PDF"));
    }
  });

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

  // POST /api/v2/leases/:applicationId/sign - Sign lease agreement
  app.post("/api/v2/leases/:applicationId/sign", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await leaseService.signLease(
        req.params.applicationId,
        req.user!.id,
        req.user!.role,
        req.body,
        req
      );

      return res.json(success(result, "Lease signed successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[LEASES] Sign lease error:", err);
      return res.status(500).json(errorResponse("Failed to sign lease"));
    }
  });

  // GET /api/v2/leases/:applicationId/signatures - Get audit data for admins
  app.get("/api/v2/leases/:applicationId/signatures", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json(errorResponse("Only admins can access lease audit data"));
      }

      const result = await leaseService.getSignatures(req.params.applicationId);
      return res.json(success(result, "Lease audit data retrieved successfully"));
    } catch (err: any) {
      console.error("[LEASES] Audit data error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve lease audit data"));
    }
  });
}
