import { Router } from "express";
import { authenticateToken, type AuthenticatedRequest } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import * as applicationService from "./application.service";
import { createPdfStream } from "../../services/applicationDisclosurePdf";

const router = Router();

router.get("/:id/disclosures.pdf", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id, req.user!.role);
    if (!application) return res.status(404).json(errorResponse("Application not found"));

    // Security check: Only applicant, property owner, or admin can access
    const isApplicant = application.user_id === req.user!.id;
    const isOwner = application.property_owner_id === req.user!.id; // Note: Need to verify if property_owner_id is available or fetch property
    const isAdmin = req.user!.role === "admin";
    const isPropertyManager = req.user!.role === "property_manager";

    if (!isApplicant && !isOwner && !isAdmin && !isPropertyManager) {
      return res.status(403).json(errorResponse("Not authorized to access this disclosure"));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="disclosures-${req.params.id}.pdf"`);

    await createPdfStream(req.params.id, res);
  } catch (err: any) {
    console.error("[APPLICATIONS] Error generating PDF stream:", err);
    if (!res.headersSent) {
      res.status(500).json(errorResponse("Failed to generate PDF"));
    }
  }
});

router.get("/draft", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { propertyId } = req.query;
    if (!propertyId) {
      return res.status(400).json(errorResponse("propertyId query parameter is required"));
    }

    const result = await applicationService.getLatestDraftByPropertyId(
      propertyId as string,
      req.user!.id
    );

    return res.json(success(result.data, "Draft fetched successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error fetching draft:", err);
    return res.status(500).json(errorResponse("Failed to fetch draft"));
  }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse("Authentication required to submit an application. Please log in or create an account."));
    }

    // Map propertyId to property_id if provided from frontend
    if (req.body.propertyId && !req.body.property_id) {
      req.body.property_id = req.body.propertyId;
    }

    const result = await applicationService.createApplication({
      body: req.body,
      userId: req.user.id,
    });

    if (result.error) {
      return res.status(400).json(errorResponse(result.error));
    }

    return res.json(success(result.data, "Application submitted successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error submitting application:", err);
    return res.status(500).json(errorResponse("Failed to submit application. Please try again."));
  }
});

router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = await applicationService.getApplicationById(req.params.id);
    return res.json(success(data, "Application fetched successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to fetch application"));
  }
});

router.get("/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await applicationService.getApplicationsByUserId(
      req.params.userId,
      req.user!.id,
      req.user!.role
    );

    if (result.error) {
      return res.status(403).json({ error: result.error });
    }

    return res.json(success(result.data, "User applications fetched successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to fetch user applications"));
  }
});

router.get("/property/:propertyId", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await applicationService.getApplicationsByPropertyId(
      req.params.propertyId,
      req.user!.id,
      req.user!.role
    );

    if (result.error) {
      return res.status(403).json({ error: result.error });
    }

    return res.json(success(result.data, "Property applications fetched successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to fetch property applications"));
  }
});

router.patch("/:id/autosave", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await applicationService.autosaveApplication(
      req.params.id,
      req.body,
      req.user!.id
    );

    if (result.error) {
      const status = result.error === "Application not found" ? 404 : 403;
      return res.status(status).json({ error: result.error });
    }

    return res.json(success(result.data, "Draft saved successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error in autosave:", err);
    return res.status(500).json(errorResponse("Failed to save draft"));
  }
});

router.patch("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await applicationService.updateApplication({
      id: req.params.id,
      body: req.body,
      userId: req.user!.id,
      userRole: req.user!.role,
    });

    if (result.error) {
      return res.status(403).json({ error: result.error });
    }

    return res.json(success(result.data, "Application updated successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to update application"));
  }
});

router.patch("/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, rejectionCategory, rejectionReason, rejectionDetails, reason } = req.body;

    const result = await applicationService.updateStatus({
      id: req.params.id,
      status,
      userId: req.user!.id,
      userRole: req.user!.role,
      rejectionCategory,
      rejectionReason,
      rejectionDetails,
      reason,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(success(result.data, "Application status updated successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to update application status"));
  }
});

export default router;
