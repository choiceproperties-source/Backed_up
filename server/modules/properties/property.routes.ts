import { Router } from "express";
import { authenticateToken, requireOwnership, type AuthenticatedRequest } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { viewLimiter } from "../../rate-limit";
import * as propertyService from "./property.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { propertyType, city, minPrice, maxPrice, status, page, limit, ownerId } = req.query;

    const result = await propertyService.getProperties({
      propertyType: propertyType as string | undefined,
      city: city as string | undefined,
      minPrice: minPrice as string | undefined,
      maxPrice: maxPrice as string | undefined,
      status: status as string | undefined,
      ownerId: ownerId as string | undefined,  // FIX 2a: Accept ownerId parameter
      page: page as string | undefined,
      limit: limit as string | undefined,
    });

    return res.json(success(result, "Properties fetched successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to fetch properties"));
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await propertyService.getPropertyById(req.params.id);
    if (!data) {
      return res.status(404).json(errorResponse("Property not found"));
    }
    return res.json(success(data, "Property fetched successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to fetch property"));
  }
});

router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await propertyService.createProperty({
      body: req.body,
      userId: req.user!.id,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(success(result.data, "Property created successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to create property"));
  }
});

router.patch("/:id", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = await propertyService.updateProperty(req.params.id, req.body, req.user!.id);
    return res.json(success(data, "Property updated successfully"));
  } catch (err: any) {
    if (err.message && err.message.includes("Unauthorized")) {
      return res.status(403).json(errorResponse(err.message));
    }
    return res.status(500).json(errorResponse("Failed to update property"));
  }
});

router.delete("/:id", authenticateToken, requireOwnership("property"), async (req: AuthenticatedRequest, res) => {
  try {
    await propertyService.deleteProperty(req.params.id);
    return res.json(success(null, "Property deleted successfully"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to delete property"));
  }
});

router.post("/:id/view", viewLimiter, async (req, res) => {
  try {
    await propertyService.recordPropertyView(req.params.id);
    return res.json(success(null, "View recorded"));
  } catch (err: any) {
    return res.status(500).json(errorResponse("Failed to record view"));
  }
});

export default router;
