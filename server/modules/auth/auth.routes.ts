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
        const errorDetails = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("[AUTH] Validation failed:", errorDetails);
        return res.status(400).json(apiError(errorDetails));
      }

      const { 
        email, 
        password, 
        fullName, 
        phone, 
        role, 
        termsVersion, 
        privacyVersion, 
        acceptedTermsAt, 
        acceptedPrivacyAt, 
        acceptedIp 
      } = validation.data as any;

      const result = await authService.signup(email, password, fullName, phone || null, role as string, {
        termsVersion,
        privacyVersion,
        acceptedTermsAt: acceptedTermsAt ? new Date(acceptedTermsAt) : undefined,
        acceptedPrivacyAt: acceptedPrivacyAt ? new Date(acceptedPrivacyAt) : undefined,
        acceptedIp
      });
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

  app.post("/api/v2/auth/resend-verification", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json(apiError("Email is required"));
      }

      await authService.resendVerificationEmail(email);
      return res.json(apiSuccess(undefined, "If an account exists, a verification email has been sent."));
    } catch (err: any) {
      // Always return success to avoid leaking user existence
      return res.json(apiSuccess(undefined, "If an account exists, a verification email has been sent."));
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

  app.post("/api/v2/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      return res.json(apiSuccess(undefined, "Reset email sent successfully"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Failed to send reset email";
      return res.status(status).json(apiError(message));
    }
  });

  app.post("/api/v2/auth/reset-password", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { password } = req.body;
      await authService.resetPassword(password);
      return res.json(apiSuccess(undefined, "Password updated successfully"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Failed to update password";
      return res.status(status).json(apiError(message));
    }
  });

  app.patch("/api/v2/auth/profile", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { fullName, displayEmail, displayPhone, profileImage } = req.body;
      const result = await authService.updateProfile(req.user!.id, {
        fullName,
        displayEmail,
        displayPhone,
        profileImage
      });
      return res.json(apiSuccess(result.user, "Profile updated successfully"));
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || "Failed to update profile";
      return res.status(status).json(apiError(message));
    }
  });
}
