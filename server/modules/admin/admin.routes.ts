import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken, requireRole } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { AdminService } from "./admin.service";

const adminService = new AdminService();

export function registerAdminRoutes(app: Express): void {
  // GET /api/v2/admin/image-audit-logs
  app.get("/api/v2/admin/image-audit-logs", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = req.query.propertyId as string | undefined;
      const action = req.query.action as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await adminService.getImageAuditLogs(propertyId, action, limit, offset);

      return res.json(success(result, "Image audit logs retrieved"));
    } catch (err: any) {
      console.error("[ADMIN] Image audit logs error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve image audit logs"));
    }
  });

  // GET /api/v2/admin/personas
  app.get("/api/v2/admin/personas", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const personas = await adminService.getPersonas();

      return res.json(success(personas, "Personas retrieved"));
    } catch (err: any) {
      console.error("[ADMIN] Get personas error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve personas"));
    }
  });

  // POST /api/v2/admin/personas
  app.post("/api/v2/admin/personas", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const persona = await adminService.createPersona(req.body);

      return res.json(success(persona, "Persona created"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[ADMIN] Create persona error:", err);
      return res.status(500).json(errorResponse("Failed to create persona"));
    }
  });

  // PATCH /api/v2/admin/personas/:id
  app.patch("/api/v2/admin/personas/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const persona = await adminService.updatePersona(req.params.id, req.body);

      return res.json(success(persona, "Persona updated"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[ADMIN] Update persona error:", err);
      return res.status(500).json(errorResponse("Failed to update persona"));
    }
  });

  // DELETE /api/v2/admin/personas/:id
  app.delete("/api/v2/admin/personas/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      await adminService.deletePersona(req.params.id);

      return res.json(success(null, "Persona deleted"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[ADMIN] Delete persona error:", err);
      return res.status(500).json(errorResponse("Failed to delete persona"));
    }
  });

  // GET /api/v2/admin/settings
  app.get("/api/v2/admin/settings", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await adminService.getSettings();

      return res.json(success(settings, "Settings retrieved"));
    } catch (err: any) {
      console.error("[ADMIN] Get settings error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve settings"));
    }
  });

  // PATCH /api/v2/admin/settings
  app.patch("/api/v2/admin/settings", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await adminService.updateSettings(req.body);

      return res.json(success(settings, "Settings updated"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[ADMIN] Update settings error:", err);
      return res.status(500).json(errorResponse("Failed to update settings"));
    }
  });
}
