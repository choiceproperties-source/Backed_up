import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { logPaymentAction, logAuditEvent, getPaymentAuditLogs } from "../security/audit-logger";
import { sendPaymentReceivedNotification, sendPaymentVerifiedNotification } from "../notification-service";

export function registerPaymentRoutes(app: Express): void {
  app.get("/api/applications/:applicationId/payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.applicationId;
      
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, properties(owner_id)")
        .eq("id", applicationId)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isTenant = application.user_id === req.user!.id;
      const isLandlord = application.properties?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view payments" });
      }

      const { data: lease } = await supabase
        .from("leases")
        .select("id")
        .eq("application_id", applicationId)
        .single();

      if (!lease) {
        return res.json(success([], "No lease found for this application"));
      }

      const { data: payments, error } = await supabase
        .from("payments")
        .select("*, verified_by_user:users!payments_verified_by_fkey(full_name)")
        .eq("lease_id", lease.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const enrichedPayments = (payments || []).map((p: any) => {
        const dueDate = new Date(p.due_date);
        const isOverdue = p.status === 'pending' && dueDate < now;
        return {
          ...p,
          status: isOverdue ? 'overdue' : p.status
        };
      });

      return res.json(success(enrichedPayments, "Payments retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Get error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payments"));
    }
  });

  app.get("/api/applications/:applicationId/security-deposit", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const applicationId = req.params.applicationId;
      
      const { data: application } = await supabase
        .from("applications")
        .select("user_id, lease_status, properties(owner_id)")
        .eq("id", applicationId)
        .limit(1)
        .maybeSingle();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const isTenant = application.user_id === req.user!.id;
      const isLandlord = (application.properties as any)?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view deposit status" });
      }

      const { data: lease } = await supabase
        .from("leases")
        .select("id, security_deposit_amount")
        .eq("application_id", applicationId)
        .limit(1)
        .maybeSingle();

      if (!lease) {
        return res.json(success({
          required: false,
          leaseStatus: application.lease_status,
          message: "No lease found - deposit not required yet"
        }, "Deposit status retrieved"));
      }

      const { data: payment } = await supabase
        .from("payments")
        .select("id, amount, status, due_date, paid_at, verified_at, verified_by")
        .eq("lease_id", lease.id)
        .eq("type", "security_deposit")
        .limit(1)
        .maybeSingle();

      return res.json(success({
        required: true,
        leaseStatus: application.lease_status,
        securityDepositAmount: lease.security_deposit_amount,
        payment: payment || null,
        message: payment ? `Security deposit is ${payment.status}` : "Security deposit payment not found"
      }, "Deposit status retrieved"));
    } catch (err: any) {
      console.error("[PAYMENTS] Security deposit status error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve deposit status"));
    }
  });

  app.post("/api/payments/:paymentId/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;
      const { amount, method, dateReceived } = req.body;

      if (!amount || !method || !dateReceived) {
        return res.status(400).json({ error: "Amount, method, and date received are required" });
      }

      const { data: payment } = await supabase
        .from("payments")
        .select("*, leases(landlord_id, application_id, tenant_id)")
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const isLandlord = payment.leases?.landlord_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Only landlord or admin can verify payments" });
      }

      if (payment.status === "verified") {
        return res.status(400).json({ error: "Payment already verified" });
      }

      const { error } = await supabase
        .from("payments")
        .update({
          status: "verified",
          verified_by: req.user!.id,
          verified_at: new Date().toISOString(),
          paid_at: new Date(dateReceived).toISOString(),
          manual_payment_method: method,
          amount: parseFloat(amount),
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      await logPaymentAction(
        req.user!.id,
        paymentId,
        "payment_verified",
        payment.status,
        "verified",
        { 
          method, 
          amount, 
          dateReceived,
          type: payment.type,
          verifiedByRole: req.user!.role
        },
        req
      );

      try {
        const { data: tenantData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", payment.leases?.tenant_id)
          .single();
        
        if (tenantData?.full_name) {
          await sendPaymentVerifiedNotification(
            paymentId,
            payment.leases?.tenant_id,
            payment.type === 'rent' ? 'Rent' : 'Security Deposit',
            amount.toString()
          );
        }
      } catch (notificationErr) {
        console.error("[PAYMENTS] Failed to send verification notification:", notificationErr);
      }

      return res.json(success(
        { status: "verified", message: "Payment verified." },
        "Payment verified successfully"
      ));
    } catch (err: any) {
      console.error("[PAYMENTS] Verify error:", err);
      return res.status(500).json(errorResponse("Failed to verify payment"));
    }
  });

  app.post("/api/payments/:paymentId/mark-paid", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;
      const { referenceId, notes } = req.body;

      const { data: payment } = await supabase
        .from("payments")
        .select("*, leases(tenant_id)")
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const isTenant = payment.leases?.tenant_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isAdmin) {
        return res.status(403).json({ error: "Only tenant can mark their own payment as paid" });
      }

      if (payment.status === "verified" || payment.status === "paid") {
        return res.status(400).json({ error: "Payment already processed" });
      }

      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          reference_id: referenceId || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentId);

      if (error) throw error;

      await logPaymentAction(
        req.user!.id,
        paymentId,
        "payment_marked_paid",
        payment.status,
        "paid",
        { 
          referenceId,
          notes,
          amount: payment.amount,
          type: payment.type
        },
        req
      );

      try {
        const { data: tenantData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", req.user!.id)
          .single();
        
        if (tenantData?.full_name) {
          await sendPaymentReceivedNotification(
            paymentId,
            tenantData.full_name,
            payment.type === 'rent' ? 'Rent' : 'Security Deposit',
            payment.amount.toString()
          );
        }
      } catch (notificationErr) {
        console.error("[PAYMENTS] Failed to send notification:", notificationErr);
      }

      return res.json(success({ status: "paid" }, "Payment marked as paid - awaiting verification"));
    } catch (err: any) {
      console.error("[PAYMENTS] Mark paid error:", err);
      return res.status(500).json(errorResponse("Failed to mark payment as paid"));
    }
  });

  app.get("/api/payments/:paymentId/receipt", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const paymentId = req.params.paymentId;

      const { data: payment } = await supabase
        .from("payments")
        .select(`
          id,
          type,
          amount,
          due_date,
          paid_at,
          verified_at,
          reference_id,
          status,
          created_at,
          leases(
            id,
            application_id,
            monthly_rent,
            security_deposit_amount,
            applications(
              id,
              property_id,
              tenant_id,
              properties(title, address),
              users(full_name, email)
            )
          ),
          verified_by_user:users!payments_verified_by_fkey(full_name, email)
        `)
        .eq("id", paymentId)
        .single();

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const isTenant = (payment as any).leases?.[0]?.applications?.[0]?.tenant_id === req.user!.id;
      const isLandlord = (payment as any).leases?.[0]?.applications?.[0]?.properties?.[0]?.owner_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view this receipt" });
      }

      const paymentAny = payment as any;
      const receipt = {
        receiptNumber: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
        paymentId: payment.id,
        type: payment.type === 'rent' ? 'Monthly Rent' : 'Security Deposit',
        amount: parseFloat(payment.amount.toString()),
        dueDate: payment.due_date,
        paidDate: payment.paid_at || payment.verified_at,
        verificationDate: payment.verified_at,
        status: payment.status,
        referenceId: payment.reference_id,
        property: {
          title: paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.title,
          address: paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.address
        },
        tenant: {
          name: paymentAny.leases?.[0]?.applications?.[0]?.users?.[0]?.full_name,
          email: paymentAny.leases?.[0]?.applications?.[0]?.users?.[0]?.email
        },
        verifiedBy: paymentAny.verified_by_user?.full_name || 'Pending verification',
        createdAt: payment.created_at
      };

      return res.json(success(receipt, "Receipt retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Receipt error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve receipt"));
    }
  });

  app.get("/api/leases/:leaseId/payment-history", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const leaseId = req.params.leaseId;

      const { data: lease } = await supabase
        .from("leases")
        .select("id, landlord_id, tenant_id, monthly_rent, security_deposit_amount, applications(property_id, properties(title, address))")
        .eq("id", leaseId)
        .single();

      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const isLandlord = lease.landlord_id === req.user!.id;
      const isTenant = lease.tenant_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isLandlord && !isTenant && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view payment history" });
      }

      const { data: payments, error } = await supabase
        .from("payments")
        .select("*, verified_by_user:users!payments_verified_by_fkey(full_name)")
        .eq("lease_id", leaseId)
        .order("due_date", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const enrichedPayments = (payments || []).map((p: any) => {
        const dueDate = new Date(p.due_date);
        const isOverdue = p.status === 'pending' && dueDate < now;
        return {
          ...p,
          status: isOverdue ? 'overdue' : p.status
        };
      });

      const summary = {
        totalPayments: enrichedPayments.length,
        verified: enrichedPayments.filter((p: any) => p.status === 'verified').length,
        paid: enrichedPayments.filter((p: any) => p.status === 'paid').length,
        pending: enrichedPayments.filter((p: any) => p.status === 'pending').length,
        overdue: enrichedPayments.filter((p: any) => p.status === 'overdue').length,
        totalVerifiedAmount: enrichedPayments
          .filter((p: any) => p.status === 'verified')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0),
        totalOutstandingAmount: enrichedPayments
          .filter((p: any) => ['pending', 'overdue'].includes(p.status))
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0)
      };

      return res.json(success({
        lease: {
          id: lease.id,
          property: lease.applications?.properties,
          monthlyRent: lease.monthly_rent,
          securityDepositAmount: lease.security_deposit_amount
        },
        payments: enrichedPayments,
        summary
      }, "Payment history retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] History error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payment history"));
    }
  });

  app.post("/api/leases/:leaseId/generate-rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const leaseId = req.params.leaseId;
      const { gracePeriodDays = 0 } = req.body;

      const { data: lease, error: leaseError } = await supabase
        .from("leases")
        .select("id, tenant_id, landlord_id, monthly_rent, rent_due_day, lease_start_date, lease_end_date")
        .eq("id", leaseId)
        .single();

      if (leaseError || !lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const isTenant = lease.tenant_id === req.user!.id;
      const isLandlord = lease.landlord_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to generate rent payments" });
      }

      const startDate = new Date(lease.lease_start_date);
      const endDate = new Date(lease.lease_end_date);
      const rentDueDay = lease.rent_due_day || 1;
      const rentAmount = parseFloat(lease.monthly_rent.toString());

      const paymentsToCreate = [];
      const currentDate = new Date(startDate);

      while (currentDate < endDate) {
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), rentDueDay);
        
        if (dueDate < startDate) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        if (dueDate <= endDate) {
          paymentsToCreate.push({
            lease_id: leaseId,
            tenant_id: lease.tenant_id,
            amount: rentAmount,
            type: "rent",
            status: "pending",
            due_date: dueDate.toISOString()
          });
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (paymentsToCreate.length === 0) {
        return res.json(success({ created: 0, message: "No rent payments to create for lease period" }, "No payments generated"));
      }

      const { data: existingPayments, error: existingError } = await supabase
        .from("payments")
        .select("due_date, type")
        .eq("lease_id", leaseId)
        .eq("type", "rent");

      if (existingError) throw existingError;

      const existingDates = new Set(existingPayments?.map(p => new Date(p.due_date).toDateString()) || []);
      const newPayments = paymentsToCreate.filter(p => 
        !existingDates.has(new Date(p.due_date).toDateString())
      );

      if (newPayments.length === 0) {
        return res.json(success({ created: 0, message: "All rent payments already exist" }, "No duplicate payments created"));
      }

      const { data: inserted, error: insertError } = await supabase
        .from("payments")
        .insert(newPayments)
        .select();

      if (insertError) throw insertError;

      await logAuditEvent({
        userId: req.user!.id,
        action: "create",
        resourceType: "payment",
        resourceId: leaseId,
        previousData: {} as Record<string, any>,
        newData: { count: inserted?.length || 0, type: "rent" },
        req
      });

      return res.json(success({
        created: inserted?.length || 0,
        payments: inserted || [],
        message: `Generated ${inserted?.length || 0} rent payment records`
      }, "Rent payments generated successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Generate rent error:", err);
      return res.status(500).json(errorResponse("Failed to generate rent payments"));
    }
  });

  app.delete("/api/payments/:paymentId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    await logPaymentAction(
      req.user!.id,
      req.params.paymentId,
      "payment_delete_blocked",
      undefined,
      undefined,
      { 
        attemptedBy: req.user!.id,
        role: req.user!.role,
        reason: "Payment deletion is blocked for financial accountability"
      },
      req
    );
    
    return res.status(403).json({ 
      error: "Payment records cannot be deleted for audit and compliance purposes",
      code: "PAYMENT_DELETE_BLOCKED"
    });
  });

  app.get("/api/payments/audit-logs", authenticateToken, async (req: AuthenticatedRequest, res) => {
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

      return res.json(success({
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }, "Payment audit logs retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Audit logs error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve payment audit logs"));
    }
  });
}
