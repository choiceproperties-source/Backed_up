import type { Express } from "express";
import { registerAuthRoutes } from "./auth.routes";

export function registerAuthModuleRoutes(app: Express): void {
  registerAuthRoutes(app);
}

export { AuthService } from "./auth.service";
export { AuthRepository } from "./auth.repository";
