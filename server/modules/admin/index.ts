import type { Express } from "express";
import { registerAdminRoutes } from "./admin.routes";

export function registerAdminModuleRoutes(app: Express): void {
  registerAdminRoutes(app);
}

export { AdminService } from "./admin.service";
export { AdminRepository } from "./admin.repository";
