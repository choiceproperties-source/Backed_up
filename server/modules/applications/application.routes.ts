import { Router } from "express";
import { authenticateToken, type AuthenticatedRequest } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import * as applicationService from "./application.service";
import * as applicationRepository from "./application.repository";
import { createPdfStream } from "../../services/applicationDisclosurePdf";
import { createLeasePdfStream } from "../../services/leaseAgreementPdf";

const router = Router();

router.get("/:id/lease-agreement.pdf", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id, req.user!.role);
    if (!application) return res.status(404).json(errorResponse("Application not found"));

    const isApplicant = application.user_id === req.user!.id;
    // Fix: check ownerId from property snapshot or fetch property
    const isOwner = application.property_owner_id === req.user!.id || application.propertySnapshot?.owner_id === req.user!.id; 
    const isAdmin = req.user!.role === "admin";
    const isPropertyManager = req.user!.role === "property_manager";

    if (!isApplicant && !isOwner && !isAdmin && !isPropertyManager) {
      return res.status(403).json(errorResponse("Not authorized to access this lease"));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="lease-${req.params.id}.pdf"`);

    await createLeasePdfStream(req.params.id, res);
  } catch (err: any) {
    console.error("[APPLICATIONS] Error generating Lease PDF stream:", err);
    if (!res.headersSent) {
      res.status(500).json(errorResponse("Failed to generate Lease PDF"));
    }
  }
});

router.get("/:id/lease-agreement-signed.pdf", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id, req.user!.role);
    if (!application) return res.status(404).json(errorResponse("Application not found"));

    if (application.lease_signature_status !== "signed") {
      return res.status(400).json(errorResponse("Lease is not fully signed yet"));
    }

    const isApplicant = application.user_id === req.user!.id;
    const isOwner = application.property_owner_id === req.user!.id || application.propertySnapshot?.owner_id === req.user!.id; 
    const isAdmin = req.user!.role === "admin";
    const isPropertyManager = req.user!.role === "property_manager";

    if (!isApplicant && !isOwner && !isAdmin && !isPropertyManager) {
      return res.status(403).json(errorResponse("Not authorized to access this signed lease"));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lease-signed-${req.params.id}.pdf"`);

    await createLeasePdfStream(req.params.id, res, true);
  } catch (err: any) {
    console.error("[APPLICATIONS] Error generating Signed Lease PDF stream:", err);
    if (!res.headersSent) {
      res.status(500).json(errorResponse("Failed to generate Signed Lease PDF"));
    }
  }
});

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
      return res.status(status).json(errorResponse(result.error));
    }

    return res.json(success(result.data, "Autosaved"));
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
    const { status, legalAcceptance, rejectionCategory, rejectionReason, rejectionDetails, reason } = req.body;

    // Check if it's a landlord approval/rejection action
    if (status === "approved" || status === "rejected") {
      const application = await applicationService.getApplicationById(req.params.id);
      if (!application) return res.status(404).json(errorResponse("Application not found"));

      const property = await applicationRepository.getProperty(application.property_id);
      if (!property || property.owner_id !== req.user!.id) {
        return res.status(403).json(errorResponse("Only the property owner can approve or reject applications"));
      }

      let result;
      if (status === "approved") {
        result = await applicationService.approveApplication(req.params.id, req.user!.id);
      } else {
        if (!rejectionCategory) {
          return res.status(400).json(errorResponse("Rejection category is required"));
        }
        result = await applicationService.rejectApplication(
          req.params.id, 
          req.user!.id, 
          rejectionCategory, 
          rejectionReason || "", 
          rejectionDetails
        );
      }

      if (result.error) {
        return res.status(400).json(errorResponse(result.error));
      }

      return res.json(success(result.data, `Application ${status} successfully`));
    }

    const result = await applicationService.updateStatus({
      id: req.params.id,
      status,
      legalAcceptance,
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

router.post("/:id/request-payment", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { amount, purpose, message, landlordMessage } = req.body;

    if (!amount || !purpose) {
      return res.status(400).json(errorResponse("Amount and purpose are required"));
    }

    const result = await applicationService.updateStatus({
      id: req.params.id,
      status: "payment_requested",
      userId: req.user!.id,
      userRole: req.user!.role,
      paymentRequest: {
        amount,
        purpose,
        message,
        landlordMessage,
      },
    });

    if (!result.success) {
      const statusCode = result.error?.includes("Not authorized") ? 403 : 400;
      return res.status(statusCode).json(errorResponse(result.error || "Failed to request payment"));
    }

    return res.json(success(result.data, "Payment request sent successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error requesting payment:", err);
    return res.status(500).json(errorResponse("Failed to request payment"));
  }
});

router.post("/:id/payment/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    if (!application) return res.status(404).json(errorResponse("Application not found"));

    // Verify requester is the property owner (landlord)
    const property = await applicationRepository.getProperty(application.property_id);
    if (!property || property.owner_id !== req.user!.id) {
      return res.status(403).json(errorResponse("Only the property owner can verify payments"));
    }

    // Ensure application.status === 'PAYMENT_COMPLETED'
    if (application.status !== "payment_completed") {
      return res.status(400).json(errorResponse("Application payment has not been completed"));
    }

    const result = await applicationService.verifyPayment(req.params.id, req.user!.id);

    if (result.error) {
      return res.status(400).json(errorResponse(result.error));
    }

    return res.json(success(result.data, "Payment verified successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error verifying payment:", err);
    return res.status(500).json(errorResponse("Failed to verify payment"));
  }
});

router.post("/:id/payment/complete", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    if (!application) return res.status(404).json(errorResponse("Application not found"));

    // Verify the user is the applicant
    if (application.user_id !== req.user!.id) {
      return res.status(403).json(errorResponse("Not authorized to confirm payment for this application"));
    }

    // Verify application.status === PAYMENT_REQUESTED
    if (application.status !== "payment_requested") {
      return res.status(400).json(errorResponse("Payment not requested for this application"));
    }

    const result = await applicationService.completePayment(req.params.id, req.user!.id);

    if (result.error) {
      const statusCode = result.error === "Not authorized" ? 403 : 400;
      return res.status(statusCode).json(errorResponse(result.error));
    }

    return res.json(success(result.data, "Payment completed successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error completing payment:", err);
    return res.status(500).json(errorResponse("Failed to complete payment"));
  }
});

router.post("/:id/pay", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    if (!application) return res.status(404).json(errorResponse("Application not found"));

    // Verify the user is the applicant
    if (application.user_id !== req.user!.id) {
      return res.status(403).json(errorResponse("Not authorized to pay for this application"));
    }

    // Verify application.status === PAYMENT_REQUESTED
    if (application.status !== "payment_requested") {
      return res.status(400).json(errorResponse("Payment not requested for this application"));
    }

    // Read the payment amount ONLY from stored payment_request data
    const paymentRequest = application.payment_request as any;
    if (!paymentRequest || !paymentRequest.amount) {
      return res.status(400).json(errorResponse("Payment request data is missing"));
    }

    // Create a payment_intent placeholder
    // In a real scenario, this would interact with Stripe/etc.
    // For now, we'll store it in a transaction/payment record if available, 
    // or just return success as per instructions.
    const result = await applicationService.initiatePayment(req.params.id, req.user!.id);

    if (result.error) {
      return res.status(400).json(errorResponse(result.error));
    }

    return res.json(success(result.data, "Payment initiated successfully"));
  } catch (err: any) {
    console.error("[APPLICATIONS] Error initiating payment:", err);
    return res.status(500).json(errorResponse("Failed to initiate payment"));
  }
});

export default router;
