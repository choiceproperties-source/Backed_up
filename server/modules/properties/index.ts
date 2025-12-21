import { Express } from "express";
import propertyRoutes from "./property.routes";

export function registerPropertyRoutes(app: Express): void {
  /**
   * Public + authenticated property endpoints
   * Versioned to v2 but legacy-compatible in behavior
   */
  app.use("/api/v2/properties", propertyRoutes);
}