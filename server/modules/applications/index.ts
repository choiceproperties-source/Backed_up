import { Express } from "express";
import applicationRoutes from "./application.routes";

export function registerApplicationRoutes(app: Express): void {
  app.use("/api/v2/applications", applicationRoutes);
}
