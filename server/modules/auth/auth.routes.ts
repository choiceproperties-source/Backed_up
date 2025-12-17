import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken } from "../../auth-middleware";
import { signupSchema, loginSchema } from "@shared/schema";
import { authLimiter, signupLimiter } from "../../rate-limit";
import { AuthService } from "./auth.service";

const authService = new AuthService();

function apiSuccess<T>(data?: T, message?: string) {
  return { success: true, data, message };
}

function apiError(error: string) {
  return { success: false, error };
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/v2/auth/signup", signupLimiter, async (req, res) => {
    try {
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(apiError(validation.error.errors[0].message));
      }

      const { email, password, fullName, phone, role = 'renter' } = validation.data;

      const result = await authService.signup(email, password, fullName, phone || null, role);
      return res.json(apiSuccess(result.user, "Account created successfully"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Signup failed. Please try again.";
      return res.status(status).json(apiError(message));
    }
  });

  app.post("/api/v2/auth/login", authLimiter, async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(apiError(validation.error.errors[0].message));
      }

      const { email, password } = validation.data;

      const result = await authService.login(email, password);
      return res.json(apiSuccess(result.session, "Login successful"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Invalid credentials";
      return res.status(status).json(apiError(message));
    }
  });

  app.post("/api/v2/auth/logout", async (_req, res) => {
    try {
      await authService.logout();
      return res.json(apiSuccess(undefined, "Logged out successfully"));
    } catch (err: any) {
      return res.status(500).json(apiError("Logout failed"));
    }
  });

  app.post("/api/v2/auth/resend-verification", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.email) {
        return res.status(400).json(apiError("No email address found"));
      }

      await authService.resendVerificationEmail(req.user.email);
      return res.json(apiSuccess(undefined, "Verification email sent"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Failed to resend verification email";
      return res.status(status).json(apiError(message));
    }
  });

  app.get("/api/v2/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      return res.json(apiSuccess(user, "User fetched successfully"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Failed to fetch user";
      return res.status(status).json(apiError(message));
    }
  });
}
