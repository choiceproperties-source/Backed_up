import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { logApplicationChange, logLeaseAction, logSecurityEvent } from "../security/audit-logger";
import { sendEmail, getApprovalConfirmationEmailTemplate } from "../email";

export function registerManagerRoutes(app: Express): void {
  app.get("/api/manager/applications", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can access this endpoint" });
      }

      const { propertyId, status, page = "1" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limit = 20;
      const offset = (pageNum - 1) * limit;

      let query = supabase
        .from("applications")
        .select("*, properties(owner_id, title), users(full_name, email)", { count: "exact" });

      if (propertyId) {
        const { data: assignment } = await supabase
          .from("property_manager_assignments")
          .select("id")
          .eq("property_manager_id", req.user!.id)
          .eq("property_id", propertyId as string)
          .is("revoked_at", null)
          .single();

        if (!assignment) {
          return res.status(403).json({ error: "Not assigned to this property" });
        }

        query = query.eq("property_id", propertyId as string);
      } else {
        const { data: assignments } = await supabase
          .from("property_manager_assignments")
          .select("property_id")
          .eq("property_manager_id", req.user!.id)
          .is("revoked_at", null);

        const propertyIds = assignments?.map(a => a.property_id) || [];
        if (propertyIds.length === 0) {
          return res.json(success({ applications: [], pagination: { page: pageNum, limit, total: 0, totalPages: 0 } }));
        }

        query = query.in("property_id", propertyIds);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);
      return res.json(success({
        applications: data,
        pagination: { page: pageNum, limit, total: count || 0, totalPages }
      }, "Applications fetched"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch applications"));
    }
  });

  app.post("/api/manager/applications/:id/review", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can review applications" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("property_id, status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", application.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("applications")
        .update({
          status: "under_review",
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      await logApplicationChange(
        req.user!.id,
        req.params.id,
        "status_change",
        { status: application.status },
        { status: "under_review" },
        req
      );

      return res.json(success(data, "Application moved to under review"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to review application"));
    }
  });

  app.post("/api/manager/applications/:id/approve", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can approve applications" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("id, property_id, status, personal_info, properties(id, title, address, city, state, price, application_fee, owner_id), users(id, full_name, email)")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", application.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("applications")
        .update({
          status: "approved",
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      await logApplicationChange(
        req.user!.id,
        req.params.id,
        "status_change",
        { status: application.status },
        { status: "approved" },
        req
      );

      // Send enhanced approval confirmation email
      const property = application.properties as any;
      const applicant = application.users as any;
      const applicantEmail = applicant?.email || application.personal_info?.email;
      const applicantName = applicant?.full_name || 
        `${application.personal_info?.firstName || ''} ${application.personal_info?.lastName || ''}`.trim() || 
        'Applicant';

      if (applicantEmail && property) {
        // Fetch property owner details for contact info
        let ownerInfo: any = null;
        if (property.owner_id) {
          const { data: owner } = await supabase
            .from("users")
            .select("full_name, email, phone")
            .eq("id", property.owner_id)
            .single();
          ownerInfo = owner;
        }

        const emailHtml = getApprovalConfirmationEmailTemplate({
          applicantName,
          propertyTitle: property.title,
          propertyAddress: `${property.address}, ${property.city}, ${property.state}`,
          applicationId: req.params.id,
          applicationFee: property.application_fee || 50,
          paymentDate: new Date().toLocaleDateString(),
          monthlyRent: property.price,
          landlordName: ownerInfo?.full_name,
          landlordEmail: ownerInfo?.email,
          landlordPhone: ownerInfo?.phone
        });

        await sendEmail({
          to: applicantEmail,
          subject: `Congratulations! Your Application for ${property.title} Has Been Approved`,
          html: emailHtml
        });
      }

      return res.json(success(data, "Application approved"));
    } catch (err: any) {
      console.error("[MANAGER] Failed to approve application:", err);
      return res.status(500).json(errorResponse("Failed to approve application"));
    }
  });

  app.post("/api/manager/applications/:id/reject", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can reject applications" });
      }

      const { rejectionCategory, rejectionReason } = req.body;

      if (!rejectionCategory || !rejectionReason) {
        return res.status(400).json({ error: "Rejection category and reason are required" });
      }

      const { data: application } = await supabase
        .from("applications")
        .select("property_id, status")
        .eq("id", req.params.id)
        .single();

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", application.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("applications")
        .update({
          status: "rejected",
          rejection_category: rejectionCategory,
          rejection_reason: rejectionReason,
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      await logApplicationChange(
        req.user!.id,
        req.params.id,
        "status_change",
        { status: application.status },
        { status: "rejected" },
        req
      );

      return res.json(success(data, "Application rejected"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to reject application"));
    }
  });

  app.post("/api/manager/leases/:leaseId/send", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role !== "property_manager") {
        return res.status(403).json({ error: "Only property managers can send leases" });
      }

      const { data: lease } = await supabase
        .from("leases")
        .select("application_id, property_id, status")
        .eq("id", req.params.leaseId)
        .single();

      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const { data: assignment } = await supabase
        .from("property_manager_assignments")
        .select("id")
        .eq("property_manager_id", req.user!.id)
        .eq("property_id", lease.property_id)
        .is("revoked_at", null)
        .single();

      if (!assignment) {
        return res.status(403).json({ error: "Not assigned to this property" });
      }

      const { data, error } = await supabase
        .from("leases")
        .update({
          status: "lease_sent",
          sent_at: new Date().toISOString(),
          sent_by: req.user!.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.leaseId)
        .select()
        .single();

      if (error) throw error;

      await logLeaseAction(
        req.user!.id,
        lease.application_id,
        "lease_sent",
        undefined,
        undefined,
        `Manager sent lease to tenant`,
        req
      );

      return res.json(success(data, "Lease sent to tenant"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to send lease"));
    }
  });

  app.patch("/api/manager/applications/:id/application-fee", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user!.role === "property_manager") {
        await logSecurityEvent(
          req.user!.id,
          "login",
          false,
          { reason: "Blocked: Manager attempted to modify application fee" },
          req
        );
        return res.status(403).json({ 
          error: "Property managers cannot modify application fees",
          code: "PERMISSION_DENIED"
        });
      }

      return res.status(403).json({ error: "Unauthorized" });
    } catch (err: any) {
      return res.status(500).json(errorResponse("Operation failed"));
    }
  });

  app.get("/api/leases/:leaseId/rent-payments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const leaseId = req.params.leaseId;

      const { data: lease } = await supabase
        .from("leases")
        .select("tenant_id, landlord_id")
        .eq("id", leaseId)
        .single();

      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }

      const isTenant = lease.tenant_id === req.user!.id;
      const isLandlord = lease.landlord_id === req.user!.id;
      const isAdmin = req.user!.role === "admin";

      if (!isTenant && !isLandlord && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to view rent payments" });
      }

      const { data: payments, error } = await supabase
        .from("payments")
        .select("*")
        .eq("lease_id", leaseId)
        .eq("type", "rent")
        .order("due_date", { ascending: true });

      if (error) throw error;

      const grouped = {
        pending: payments?.filter(p => p.status === "pending") || [],
        paid: payments?.filter(p => p.status === "paid") || [],
        verified: payments?.filter(p => p.status === "verified") || [],
        overdue: payments?.filter(p => p.status === "overdue") || []
      };

      const stats = {
        totalRent: payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0,
        pendingAmount: grouped.pending.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        paidAmount: grouped.paid.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        verifiedAmount: grouped.verified.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        overdueAmount: grouped.overdue.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
      };

      return res.json(success({ payments: grouped, stats }, "Rent payments retrieved successfully"));
    } catch (err: any) {
      console.error("[PAYMENTS] Get rent payments error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve rent payments"));
    }
  });
}
