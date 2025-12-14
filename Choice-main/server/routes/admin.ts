import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";

export function registerAdminRoutes(app: Express): void {
  app.get("/api/admin/personas", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("is_managed_profile", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Personas fetched successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Get personas error:", err);
      return res.status(500).json(errorResponse("Failed to fetch personas"));
    }
  });

  app.post("/api/admin/personas", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { fullName, email, displayEmail, displayPhone, role, bio, profileImage, location, specialties, yearsExperience } = req.body;

      if (!fullName || !email) {
        return res.status(400).json(errorResponse("Full name and email are required"));
      }

      const { data, error } = await supabase
        .from("users")
        .insert({
          email,
          full_name: fullName,
          display_email: displayEmail || email,
          display_phone: displayPhone || null,
          role: role || "agent",
          bio: bio || null,
          profile_image: profileImage || null,
          location: location || null,
          specialties: specialties || null,
          years_experience: yearsExperience || null,
          is_managed_profile: true,
          managed_by: req.user!.id,
          password_hash: "managed_profile_no_login",
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Persona created successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Create persona error:", err);
      if (err.message?.includes("duplicate") || err.code === "23505") {
        return res.status(400).json(errorResponse("A user with this email already exists"));
      }
      return res.status(500).json(errorResponse("Failed to create persona"));
    }
  });

  app.patch("/api/admin/personas/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const personaId = req.params.id;

      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id, is_managed_profile, managed_by")
        .eq("id", personaId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json(errorResponse("Persona not found"));
      }

      if (!existing.is_managed_profile) {
        return res.status(400).json(errorResponse("This user is not a managed persona"));
      }

      const { fullName, displayEmail, displayPhone, role, bio, profileImage, location, specialties, yearsExperience } = req.body;

      const updateData: any = { updated_at: new Date().toISOString() };
      if (fullName !== undefined) updateData.full_name = fullName;
      if (displayEmail !== undefined) updateData.display_email = displayEmail;
      if (displayPhone !== undefined) updateData.display_phone = displayPhone;
      if (role !== undefined) updateData.role = role;
      if (bio !== undefined) updateData.bio = bio;
      if (profileImage !== undefined) updateData.profile_image = profileImage;
      if (location !== undefined) updateData.location = location;
      if (specialties !== undefined) updateData.specialties = specialties;
      if (yearsExperience !== undefined) updateData.years_experience = yearsExperience;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", personaId)
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Persona updated successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Update persona error:", err);
      return res.status(500).json(errorResponse("Failed to update persona"));
    }
  });

  app.delete("/api/admin/personas/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const personaId = req.params.id;

      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id, is_managed_profile")
        .eq("id", personaId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json(errorResponse("Persona not found"));
      }

      if (!existing.is_managed_profile) {
        return res.status(400).json(errorResponse("Cannot delete a non-managed user from this endpoint"));
      }

      const { error } = await supabase
        .from("users")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", personaId);

      if (error) throw error;
      return res.json(success(null, "Persona deleted successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Delete persona error:", err);
      return res.status(500).json(errorResponse("Failed to delete persona"));
    }
  });

  app.get("/api/admin/settings", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*");

      if (error) throw error;

      const settings: Record<string, string> = {};
      (data || []).forEach((item: any) => {
        settings[item.key] = item.value;
      });

      return res.json(success(settings, "Settings fetched successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Get settings error:", err);
      return res.status(500).json(errorResponse("Failed to fetch settings"));
    }
  });

  app.post("/api/admin/settings", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { key, value } = req.body;

      if (!key) {
        return res.status(400).json(errorResponse("Setting key is required"));
      }

      const { data, error } = await supabase
        .from("admin_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
        .select()
        .single();

      if (error) throw error;
      return res.json(success(data, "Setting saved successfully"));
    } catch (err: any) {
      console.error("[ADMIN] Save setting error:", err);
      return res.status(500).json(errorResponse("Failed to save setting"));
    }
  });
}
