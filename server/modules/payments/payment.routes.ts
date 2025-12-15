import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { PaymentService } from "./payment.service";
import { getPaymentAuditLogs } from "../../security/audit-logger";

const paymentService = new PaymentService();

export function registerPaymentRoutes(app: Express): void {
  // POST /api/v2/payments/process - Mock payment processing
  app.post("/api/v2/payments/process", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, amount, cardToken } = req.body;

      if (!applicationId || !amount) {
        return res.status(400).json({ error: "Missing applicationId or amount" });
      }

      const result = await paymentService.processPayment(applicationId, amount, cardToken);

      return res.json(success(result, "Payment processed successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Process error:", err);
      return res.status(500).json(errorResponse("Failed to process payment"));
    }
  });

  // POST /api/v2/payments/:paymentId/verify - Verify payment manually
  app.post("/api/v2/payments/:paymentId/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;
      const { amount, method, dateReceived } = req.body;

      // Validate required fields
      if (!amount || !method || !dateReceived) {
        return res.status(400).json({ error: "Amount, method, and date received are required" });
      }

      await paymentService.verifyPayment(
        paymentId,
        req.user!.id,
        req.user!.role,
        amount,
        method,
        dateReceived,
        req
      );

      return res.json(success({ status: "verified", message: "Payment verified." }, "Payment verified successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[PAYMENTS] Verify error:", err);
      return res.status(500).json(errorResponse("Failed to verify payment"));
    }
  });

  // POST /api/v2/payments/:paymentId/mark-paid - Mark payment as paid
  app.post("/api/v2/payments/:paymentId/mark-paid", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;
      const { referenceId, notes } = req.body;

      await paymentService.markPaymentPaid(
        paymentId,
        req.user!.id,
        req.user!.role,
        referenceId,
        notes,
        req
      );

      return res.json(success({ status: "paid" }, "Payment marked as paid - awaiting verification"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[PAYMENTS] Mark paid error:", err);
      return res.status(500).json(errorResponse("Failed to mark payment as paid"));
    }
  });

  // GET /api/v2/payments/:paymentId/receipt - Get payment receipt
  app.get("/api/v2/payments/:paymentId/receipt", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;

      const receipt = await paymentService.getReceipt(paymentId, req.user!.id, req.user!.role);

      return res.json(success(receipt, "Receipt retrieved successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[PAYMENTS] Receipt error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve receipt"));
    }
  });

  // DELETE /api/v2/payments/:paymentId - Block payment deletion
  app.delete("/api/v2/payments/:paymentId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      await paymentService.blockPaymentDeletion(req.params.paymentId, req.user!.id, req.user!.role, req);

      return res.status(403).json({
        error: "Payment records cannot be deleted for audit and compliance purposes",
        code: "PAYMENT_DELETE_BLOCKED",
      });
    } catch (err: any) {
      if (err.code === "PAYMENT_DELETE_BLOCKED") {
        return res.status(403).json({
          error: err.message || "Payment records cannot be deleted for audit and compliance purposes",
          code: "PAYMENT_DELETE_BLOCKED",
        });
      }
      console.error("[PAYMENTS] Delete error:", err);
      return res.status(500).json(errorResponse("Failed to process request"));
    }
  });

  // GET /api/v2/payments/audit-logs - Get payment audit logs
  app.get("/api/v2/payments/audit-logs", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = req.user!.role === "admin";
      const isLandlord = req.user!.role === "landlord";
      const isPropertyManager = req.user!.role === "property_manager";

      if (!isAdmin && !isLandlord && !isPropertyManager) {
        return res.status(403).json({ error: "Only admins, landlords, and property managers can view payment audit logs" });
      }

      const paymentId = req.query.paymentId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const { logs, total } = await getPaymentAuditLogs(paymentId, page, limit);

      return res.json(
        success(
          {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
          "Payment audit logs retrieved successfully"
        )
      );
    } catch (err: any) {
      console.error("[PAYMENTS] Audit logs error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payment audit logs"));
    }
  });
}
