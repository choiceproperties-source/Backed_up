import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken, requireRole } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { AdminService } from "./admin.service";

const adminService = new AdminService();

export function registerAdminRoutes(app: Express): void {
  // GET /api/v2/admin/image-audit-logs
  app.get("/api/v2/admin/image-audit-logs", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
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

  // Super Admin Users Management
  app.get("/api/v2/admin/users", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const users = await adminService.getAllUsers();
      return res.json(success(users, "Users retrieved"));
    } catch (error) {
      return res.status(500).json(errorResponse("Failed to fetch users"));
    }
  });

  // Super Admin Property Management
  app.delete("/api/v2/admin/properties/:id", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      await adminService.logAdminAction(req.user!.id, "delete_property", "property", id);
      return res.json(success(null, "Property deleted"));
    } catch (error) {
      return res.status(500).json(errorResponse("Failed to delete property"));
    }
  });

  app.put("/api/v2/admin/properties/:id", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await adminService.updateProperty(id, updates);
      await adminService.logAdminAction(req.user!.id, "update_property", "property", id, updates);
      return res.json(success(null, "Property updated"));
    } catch (error) {
      return res.status(500).json(errorResponse("Failed to update property"));
    }
  });

  app.get("/api/v2/admin/properties", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const properties = await adminService.getAllProperties();
      return res.json(success(properties, "Property list retrieved"));
    } catch (error) {
      return res.status(500).json(errorResponse("Failed to fetch properties"));
    }
  });

  app.put("/api/v2/admin/users/:id", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await adminService.updateUser(id, updates);
      await adminService.logAdminAction(req.user!.id, "update_user", "user", id, updates);
      return res.json(success(null, "User updated"));
    } catch (error) {
      return res.status(500).json(errorResponse("Failed to update user"));
    }
  });

  app.post("/api/v2/admin/properties/:id/approval", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { approve } = req.body;
      
      // Update property status based on approval
      const status = approve ? 'available' : 'pending';
      await adminService.updateProperty(id, { status });
      
      await adminService.logAdminAction(
        req.user!.id, 
        approve ? "approve_property" : "unapprove_property", 
        "property", 
        id, 
        { approve }
      );
      
      return res.json(success({ status }, `Property ${approve ? 'approved' : 'returned to pending'}`));
    } catch (error) {
      console.error("[ADMIN] Property approval error:", error);
      return res.status(500).json(errorResponse("Failed to update property approval status"));
    }
  });

  app.put("/api/v2/admin/users/:id/role", authenticateToken, requireRole("super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      await adminService.logAdminAction(req.user!.id, "update_user_role", "user", id, { role });
      return res.json(success(null, "User role updated"));
    } catch (error) {
      return res.status(500).json(errorResponse("Failed to update user role"));
    }
  });

  // GET /api/v2/admin/personas
  app.get("/api/v2/admin/personas", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const personas = await adminService.getPersonas();

      return res.json(success(personas, "Personas retrieved"));
    } catch (err: any) {
      console.error("[ADMIN] Get personas error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve personas"));
    }
  });

  // POST /api/v2/admin/personas
  app.post("/api/v2/admin/personas", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
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
  app.patch("/api/v2/admin/personas/:id", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
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
  app.delete("/api/v2/admin/personas/:id", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
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
  app.get("/api/v2/admin/settings", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await adminService.getSettings();

      return res.json(success(settings, "Settings retrieved"));
    } catch (err: any) {
      console.error("[ADMIN] Get settings error:", err);
      return res.status(500).json(errorResponse("Failed to retrieve settings"));
    }
  });

  // PATCH /api/v2/admin/settings
  app.patch("/api/v2/admin/settings", authenticateToken, requireRole("admin", "super_admin"), async (req: AuthenticatedRequest, res) => {
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
