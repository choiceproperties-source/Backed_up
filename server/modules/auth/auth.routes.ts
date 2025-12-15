import type { Express } from "express";
import type { AuthenticatedRequest } from "../../auth-middleware";
import { authenticateToken } from "../../auth-middleware";
import { success, error as errorResponse } from "../../response";
import { signupSchema, loginSchema } from "@shared/schema";
import { authLimiter, signupLimiter } from "../../rate-limit";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export function registerAuthRoutes(app: Express): void {
  // POST /api/v2/auth/signup
  app.post("/api/v2/auth/signup", signupLimiter, async (req, res) => {
    try {
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, password, fullName, phone, role = 'renter' } = validation.data;

      const result = await authService.signup(email, password, fullName, phone || null, role);
      return res.json(result);
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[AUTH] Signup exception:", err);
      return res.status(500).json({ error: err.message || "Signup failed. Please try again." });
    }
  });

  // POST /api/v2/auth/login
  app.post("/api/v2/auth/login", authLimiter, async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, password } = validation.data;

      const result = await authService.login(email, password);
      return res.json(result);
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[AUTH] Login exception:", err);
      return res.status(500).json({ error: "Invalid request" });
    }
  });

  // POST /api/v2/auth/logout
  app.post("/api/v2/auth/logout", async (req, res) => {
    try {
      const result = await authService.logout();
      return res.json(result);
    } catch (err: any) {
      console.error("[AUTH] Logout exception:", err);
      return res.status(500).json({ error: "Invalid request" });
    }
  });

  // POST /api/v2/auth/resend-verification
  app.post("/api/v2/auth/resend-verification", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.email) {
        return res.status(400).json({ error: "No email address found" });
      }

      const result = await authService.resendVerificationEmail(req.user.email);
      return res.json(result);
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[AUTH] Resend verification exception:", err);
      return res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // GET /api/v2/auth/me
  app.get("/api/v2/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      return res.json(success(user, "User fetched successfully"));
    } catch (err: any) {
      if (err.status) {
        return res.status(err.status).json(errorResponse(err.message));
      }
      return res.status(500).json(errorResponse("Failed to fetch user"));
    }
  });
}
