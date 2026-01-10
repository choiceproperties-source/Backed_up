import { Router } from "express";
import {
  authenticateToken,
  requireOwnership,
  type AuthenticatedRequest,
} from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { viewLimiter } from "../../rate-limit";
import * as propertyService from "./property.service";

const router = Router();

/**
 * ─────────────────────────────────────────────────────────────
 * PUBLIC PROPERTY LISTING & DISCOVERY
 * ─────────────────────────────────────────────────────────────
 */

router.get("/", async (req, res) => {
  try {
    const {
      propertyType,
      city,
      minPrice,
      maxPrice,
      status,
      page,
      limit,
      ownerId,
    } = req.query;

    const result = await propertyService.getProperties({
      propertyType: propertyType as string | undefined,
      city: city as string | undefined,
      minPrice: minPrice as string | undefined,
      maxPrice: maxPrice as string | undefined,
      status: status as string | undefined,
      ownerId: ownerId as string | undefined,
      page: page as string | undefined,
      limit: limit as string | undefined,
    });

    return res.json(success(result, "Properties fetched successfully"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET / error:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    return res.status(500).json(errorResponse("Failed to fetch properties"));
  }
});

/**
 * Full property (owner + analytics)
 */
router.get("/:id/full", async (req, res) => {
  try {
    const data = await propertyService.getPropertyFull(req.params.id);
    if (!data) {
      return res.status(404).json(errorResponse("Property not found"));
    }
    return res.json(success(data, "Property fetched successfully"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET /:id/full error:", {
      message: error.message,
      stack: error.stack,
      propertyId: req.params.id,
    });
    return res.status(500).json(errorResponse("Failed to fetch property"));
  }
});

/**
 * Basic property detail
 */
router.get("/:id", async (req, res) => {
  try {
    const data = await propertyService.getPropertyById(req.params.id);
    if (!data) {
      return res.status(404).json(errorResponse("Property not found"));
    }
    return res.json(success(data, "Property fetched successfully"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET /:id error:", {
      message: error.message,
      stack: error.stack,
      propertyId: req.params.id,
    });
    return res.status(500).json(errorResponse("Failed to fetch property"));
  }
});

/**
 * Property analytics (views, saves, applications)
 */
router.get("/:id/analytics", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const analytics = await propertyService.getPropertyAnalytics(req.params.id);
    return res.json(success(analytics, "Analytics fetched"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET /:id/analytics error:", {
      message: error.message,
      stack: error.stack,
      propertyId: req.params.id,
      userId: req.user?.id,
    });
    return res.status(500).json(errorResponse("Failed to fetch analytics"));
  }
});

/**
 * Owner properties
 */
router.get("/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const data = await propertyService.getPropertiesByOwner(req.params.userId);
    return res.json(success(data, "Owner properties fetched"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET /user/:userId error:", {
      message: error.message,
      stack: error.stack,
      userId: req.params.userId,
      requesterId: req.user?.id,
    });
    return res.status(500).json(errorResponse("Failed to fetch owner properties"));
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * PROPERTY CREATION & UPDATES
 * ─────────────────────────────────────────────────────────────
 */

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log("[PROPERTY_ROUTES] POST / request received:", {
      userId: req.user?.id,
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const result = await propertyService.createProperty({
      body: req.body,
      userId: req.user!.id,
    });

    if (result.error) {
      console.log("[PROPERTY_ROUTES] POST / validation error:", {
        error: result.error,
        errors: result.errors,
        userId: req.user?.id,
      });

      return res.status(400).json({
        success: false,
        error: result.error,
        errors: result.errors,
        message: result.error,
      });
    }

    console.log("[PROPERTY_ROUTES] POST / success:", {
      propertyId: result.data?.id,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: result.data,
      message: "Property created successfully",
    });
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] POST / error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      body: req.body,
      errorName: error.name,
      errorCode: error.code,
      errorDetails: error.details,
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message,
        message: error.message,
      });
    }

    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        error: "Property with similar details already exists",
        message: "Property with similar details already exists",
      });
    }

    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(400).json({
        success: false,
        error: "Invalid user reference",
        message: "Invalid user reference",
      });
    }

    // Generic error response with more details
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create property",
      message: error.message || "Failed to create property",
    });
  }
});

/**
 * Update property (general)
 */
router.patch(
  "/:id",
  authenticateToken,
  requireOwnership("property"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = await propertyService.updateProperty(
        req.params.id,
        req.body,
        req.user!.id
      );
      return res.json(success(data, "Property updated successfully"));
    } catch (err: any) {
      if (err.message?.includes("Unauthorized")) {
        return res.status(403).json(errorResponse(err.message));
      }

      console.error("[PROPERTY_ROUTES] PATCH /:id error:", {
        message: err.message,
        stack: err.stack,
        propertyId: req.params.id,
        userId: req.user?.id,
        body: req.body,
      });

      return res.status(500).json(errorResponse("Failed to update property"));
    }
  }
);

/**
 * Assign agent to property
 */
router.patch(
  "/:id/assign-agent",
  authenticateToken,
  requireOwnership("property"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { listing_agent_id } = req.body;
      if (!listing_agent_id) {
        return res.status(400).json(errorResponse("listing_agent_id is required"));
      }

      const data = await propertyService.updateProperty(
        req.params.id,
        { listing_agent_id },
        req.user!.id
      );
      return res.json(success(data, "Agent assigned successfully"));
    } catch (err: any) {
      console.error("[PROPERTY_ROUTES] PATCH /:id/assign-agent error:", err);
      return res.status(500).json(errorResponse("Failed to assign agent"));
    }
  }
);

/**
 * Update listing status
 */
router.patch(
  "/:id/status",
  authenticateToken,
  requireOwnership("property"),
  async (req, res) => {
    try {
      const data = await propertyService.updatePropertyStatus(
        req.params.id,
        req.body.status
      );
      return res.json(success(data, "Status updated"));
    } catch (error: any) {
      console.error("[PROPERTY_ROUTES] PATCH /:id/status error:", {
        message: error.message,
        stack: error.stack,
        propertyId: req.params.id,
        status: req.body.status,
      });
      return res.status(500).json(errorResponse("Failed to update status"));
    }
  }
);

/**
 * Update price (with history)
 */
router.patch(
  "/:id/price",
  authenticateToken,
  requireOwnership("property"),
  async (req, res) => {
    try {
      const data = await propertyService.updatePropertyPrice(
        req.params.id,
        req.body.price
      );
      return res.json(success(data, "Price updated"));
    } catch (error: any) {
      console.error("[PROPERTY_ROUTES] PATCH /:id/price error:", {
        message: error.message,
        stack: error.stack,
        propertyId: req.params.id,
        price: req.body.price,
      });
      return res.status(500).json(errorResponse("Failed to update price"));
    }
  }
);

/**
 * Expiration date
 */
router.patch(
  "/:id/expiration",
  authenticateToken,
  requireOwnership("property"),
  async (req, res) => {
    try {
      const data = await propertyService.updateExpiration(
        req.params.id,
        req.body.expiresAt
      );
      return res.json(success(data, "Expiration updated"));
    } catch (error: any) {
      console.error("[PROPERTY_ROUTES] PATCH /:id/expiration error:", {
        message: error.message,
        stack: error.stack,
        propertyId: req.params.id,
        expiresAt: req.body.expiresAt,
      });
      return res.status(500).json(errorResponse("Failed to update expiration"));
    }
  }
);

/**
 * Scheduled publishing
 */
router.patch(
  "/:id/schedule-publish",
  authenticateToken,
  requireOwnership("property"),
  async (req, res) => {
    try {
      const data = await propertyService.schedulePublish(
        req.params.id,
        req.body.publishAt
      );
      return res.json(success(data, "Publish scheduled"));
    } catch (error: any) {
      console.error("[PROPERTY_ROUTES] PATCH /:id/schedule-publish error:", {
        message: error.message,
        stack: error.stack,
        propertyId: req.params.id,
        publishAt: req.body.publishAt,
      });
      return res.status(500).json(errorResponse("Failed to schedule publish"));
    }
  }
);

/**
 * Delete property
 */
router.delete(
  "/:id",
  authenticateToken,
  requireOwnership("property"),
  async (req: AuthenticatedRequest, res) => {
    try {
      await propertyService.deleteProperty(req.params.id);
      return res.json(success(null, "Property deleted successfully"));
    } catch (error: any) {
      console.error("[PROPERTY_ROUTES] DELETE /:id error:", {
        message: error.message,
        stack: error.stack,
        propertyId: req.params.id,
        userId: req.user?.id,
      });
      return res.status(500).json(errorResponse("Failed to delete property"));
    }
  }
);

/**
 * ─────────────────────────────────────────────────────────────
 * VIEWS & STATS
 * ─────────────────────────────────────────────────────────────
 */

router.post("/:id/view", viewLimiter, async (req, res) => {
  try {
    await propertyService.recordPropertyView(req.params.id);
    return res.json(success(null, "View recorded"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] POST /:id/view error:", {
      message: error.message,
      stack: error.stack,
      propertyId: req.params.id,
    });
    return res.status(500).json(errorResponse("Failed to record view"));
  }
});

/**
 * Market insights (landing page)
 */
router.get("/stats/market-insights", async (_req, res) => {
  try {
    const stats = await propertyService.getMarketInsights();
    return res.json(success(stats, "Market insights fetched"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET /stats/market-insights error:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json(errorResponse("Failed to fetch market insights"));
  }
});

/**
 * Trust indicators
 */
router.get("/stats/trust-indicators", async (_req, res) => {
  try {
    const stats = await propertyService.getTrustIndicators();
    return res.json(success(stats, "Trust indicators fetched"));
  } catch (error: any) {
    console.error("[PROPERTY_ROUTES] GET /stats/trust-indicators error:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json(errorResponse("Failed to fetch trust indicators"));
  }
});

export default router;