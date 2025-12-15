import type { Express } from "express";
import { registerLeaseRoutes } from "./lease.routes";

export function registerLeaseModuleRoutes(app: Express): void {
  registerLeaseRoutes(app);
}

export { LeaseService } from "./lease.service";
export { LeaseRepository } from "./lease.repository";
