import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { signupSchema, loginSchema } from "@shared/schema";
import { authLimiter, signupLimiter } from "../rate-limit";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/signup", signupLimiter, async (req, res) => {
    try {
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, password, fullName, phone, role = 'renter' } = validation.data;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        phone: phone || undefined,
        user_metadata: { full_name: fullName, phone: phone || null, role },
      });

      if (error) {
        if (error.message?.includes("duplicate") || error.message?.includes("already exists")) {
          return res.status(400).json({ error: "An account with this email already exists. Please sign in instead." });
        }
        console.error("[AUTH] Signup error:", error.message);
        return res.status(400).json({ error: error.message || "Signup failed. Please try again." });
      }

      if (data.user) {
        try {
          await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: email,
              full_name: fullName,
              phone: phone || null,
              role
            }, { onConflict: 'id' });
        } catch (profileError) {
          console.error('Failed to save user profile:', profileError);
        }
      }

      res.json({ success: true, user: data.user });
    } catch (err: any) {
      console.error("[AUTH] Signup exception:", err);
      res.status(500).json({ error: err.message || "Signup failed. Please try again." });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { email, password } = validation.data;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[AUTH] Login error:", error.message);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json({ success: true, session: data.session });
    } catch (err: any) {
      console.error("[AUTH] Login exception:", err);
      res.status(500).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      res.json({ success: true });
    } catch (err: any) {
      console.error("[AUTH] Logout exception:", err);
      res.status(500).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/resend-verification", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.email) {
        return res.status(400).json({ error: "No email address found" });
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: req.user.email,
      });

      if (error) {
        console.error("[AUTH] Resend verification error:", error.message);
        return res.status(400).json({ error: error.message || "Failed to resend verification email" });
      }

      res.json({ success: true, message: "Verification email sent" });
    } catch (err: any) {
      console.error("[AUTH] Resend verification exception:", err);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", req.user!.id)
        .single();

      if (error) throw error;
      return res.json(success(data, "User fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch user"));
    }
  });
}
