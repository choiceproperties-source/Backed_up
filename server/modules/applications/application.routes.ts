import { Router } from "express";
import { authenticateToken, type AuthenticatedRequest } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import * as applicationService from "./application.service";

const router = Router();

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // PRIORITY 3 FIX: Handle guest applications safely with clear error messages
    if (!req.user) {
      return res.status(401).json(errorResponse("Authentication required to submit an application. Please log in or create an account."));
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
