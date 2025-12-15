import { Express } from "express";
import propertyRoutes from "./property.routes";

export function registerPropertyRoutes(app: Express): void {
  app.use("/api/v2/properties", propertyRoutes);
}
