import type { Express } from "express";
import { registerPaymentRoutes } from "./payment.routes";

export function registerPaymentModuleRoutes(app: Express): void {
  registerPaymentRoutes(app);
}

export { PaymentService } from "./payment.service";
export { PaymentRepository } from "./payment.repository";
