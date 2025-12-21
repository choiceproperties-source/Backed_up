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
  } catch {
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
  } catch {
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
  } catch {
    return res.status(500).json(errorResponse("Failed to fetch property"));
  }
});

/**
 * Property analytics (views, saves, applications)
 */
router.get("/:id/analytics", authenticateToken, async (req, res) => {
  try {
    const analytics = await propertyService.getPropertyAnalytics(req.params.id);
    return res.json(success(analytics, "Analytics fetched"));
  } catch {
    return res.status(500).json(errorResponse("Failed to fetch analytics"));
  }
});

/**
 * Owner properties
 */
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const data = await propertyService.getPropertiesByOwner(req.params.userId);
    return res.json(success(data, "Owner properties fetched"));
  } catch {
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
    const result = await propertyService.createProperty({
      body: req.body,
      userId: req.user!.id,
    });

    if (result.error) {
      return res.status(400).json(errorResponse(result.error));
    }

    return res.json(success(result.data, "Property created successfully"));
  } catch {
    return res.status(500).json(errorResponse("Failed to create property"));
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
      return res.status(500).json(errorResponse("Failed to update property"));
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
  async (req, res) => {
    try {
      await propertyService.deleteProperty(req.params.id);
      return res.json(success(null, "Property deleted successfully"));
    } catch {
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
  } catch {
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
  } catch {
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
  } catch {
    return res.status(500).json(errorResponse("Failed to fetch trust indicators"));
  }
});

export default router;