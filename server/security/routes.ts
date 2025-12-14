import type { Express } from "express";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { supabase } from "../supabase";
import { setupTwoFactor, verifyTOTP, verifyBackupCode, hashBackupCodes, requiresTwoFactor } from "./two-factor-auth";
import { logSecurityEvent, getAuditLogs } from "./audit-logger";
import { encrypt, decrypt, encryptSensitiveField } from "./encryption";
import { validateFileUpload, generateSecureFilename, getUploadPath } from "./file-upload";

export function registerSecurityRoutes(app: Express): void {
  app.post("/api/security/2fa/setup", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userEmail = req.user!.email;

      const { data: user } = await supabase
        .from("users")
        .select("two_factor_enabled")
        .eq("id", userId)
        .single();

      if (user?.two_factor_enabled) {
        return res.status(400).json({ error: "Two-factor authentication is already enabled" });
      }

      const setup = await setupTwoFactor(userEmail);
      const hashedBackupCodes = hashBackupCodes(setup.backupCodes);

      await supabase
        .from("users")
        .update({
          two_factor_secret: setup.secret,
          two_factor_backup_codes: hashedBackupCodes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return res.json(success({
        qrCodeDataUrl: setup.qrCodeDataUrl,
        backupCodes: setup.backupCodes,
        message: "Scan the QR code with your authenticator app, then verify with a code to enable 2FA"
      }, "2FA setup initiated"));
    } catch (err: any) {
      console.error("[2FA] Setup error:", err);
      return res.status(500).json(errorResponse("Failed to setup 2FA"));
    }
  });

  app.post("/api/security/2fa/verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      const userId = req.user!.id;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const { data: user } = await supabase
        .from("users")
        .select("two_factor_secret, two_factor_enabled")
        .eq("id", userId)
        .single();

      if (!user?.two_factor_secret) {
        return res.status(400).json({ error: "2FA has not been set up" });
      }

      const isValid = verifyTOTP(user.two_factor_secret, code);

      if (!isValid) {
        await logSecurityEvent(userId, "2fa_verify", false, { reason: "Invalid code" }, req);
        return res.status(400).json({ error: "Invalid verification code" });
      }

      if (!user.two_factor_enabled) {
        await supabase
          .from("users")
          .update({
            two_factor_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      await logSecurityEvent(userId, "2fa_verify", true, {}, req);

      return res.json(success({ verified: true }, "2FA verified successfully"));
    } catch (err: any) {
      console.error("[2FA] Verify error:", err);
      return res.status(500).json(errorResponse("Failed to verify 2FA"));
    }
  });

  app.post("/api/security/2fa/disable", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { code, password } = req.body;
      const userId = req.user!.id;

      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const { data: user } = await supabase
        .from("users")
        .select("two_factor_secret, two_factor_enabled")
        .eq("id", userId)
        .single();

      if (!user?.two_factor_enabled) {
        return res.status(400).json({ error: "2FA is not enabled" });
      }

      const isValid = verifyTOTP(user.two_factor_secret!, code);

      if (!isValid) {
        await logSecurityEvent(userId, "2fa_disable", false, { reason: "Invalid code" }, req);
        return res.status(400).json({ error: "Invalid verification code" });
      }

      await supabase
        .from("users")
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_backup_codes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      await logSecurityEvent(userId, "2fa_disable", true, {}, req);

      return res.json(success({ disabled: true }, "2FA disabled successfully"));
    } catch (err: any) {
      console.error("[2FA] Disable error:", err);
      return res.status(500).json(errorResponse("Failed to disable 2FA"));
    }
  });

  app.post("/api/security/2fa/backup-verify", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { backupCode } = req.body;
      const userId = req.user!.id;

      if (!backupCode) {
        return res.status(400).json({ error: "Backup code is required" });
      }

      const { data: user } = await supabase
        .from("users")
        .select("two_factor_backup_codes")
        .eq("id", userId)
        .single();

      if (!user?.two_factor_backup_codes) {
        return res.status(400).json({ error: "No backup codes available" });
      }

      const result = verifyBackupCode(backupCode, user.two_factor_backup_codes);

      if (!result.valid) {
        await logSecurityEvent(userId, "2fa_verify", false, { reason: "Invalid backup code" }, req);
        return res.status(400).json({ error: "Invalid backup code" });
      }

      const updatedCodes = [...user.two_factor_backup_codes];
      updatedCodes.splice(result.usedIndex, 1);

      await supabase
        .from("users")
        .update({
          two_factor_backup_codes: updatedCodes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      await logSecurityEvent(userId, "2fa_verify", true, { method: "backup_code" }, req);

      return res.json(success({ 
        verified: true, 
        remainingBackupCodes: updatedCodes.length 
      }, "Backup code verified"));
    } catch (err: any) {
      console.error("[2FA] Backup verify error:", err);
      return res.status(500).json(errorResponse("Failed to verify backup code"));
    }
  });

  app.get("/api/security/2fa/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const { data: user } = await supabase
        .from("users")
        .select("two_factor_enabled, two_factor_backup_codes")
        .eq("id", userId)
        .single();

      const isRequired = requiresTwoFactor(userRole);
      const backupCodesRemaining = user?.two_factor_backup_codes?.length || 0;

      return res.json(success({
        enabled: user?.two_factor_enabled || false,
        required: isRequired,
        backupCodesRemaining,
      }, "2FA status retrieved"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to get 2FA status"));
    }
  });

  app.get("/api/security/audit-logs", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, action, resourceType, resourceId, startDate, endDate, page, limit } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (action) filters.action = action as string;
      if (resourceType) filters.resourceType = resourceType as string;
      if (resourceId) filters.resourceId = resourceId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;

      const result = await getAuditLogs(filters, pageNum, limitNum);

      return res.json(success(result, "Audit logs retrieved"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to get audit logs"));
    }
  });

  app.post("/api/security/sensitive-data", authenticateToken, requireRole("admin", "owner", "agent", "landlord", "property_manager"), async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId, dataType, value } = req.body;
      const userId = req.user!.id;

      if (!dataType || !value) {
        return res.status(400).json({ error: "Data type and value are required" });
      }

      const fieldType = dataType === "ssn" ? "ssn" : dataType === "phone" ? "phone" : dataType === "email" ? "email" : "other";
      const encrypted = encryptSensitiveField(value, fieldType);

      const { data, error } = await supabase
        .from("sensitive_data")
        .insert({
          user_id: userId,
          application_id: applicationId || null,
          data_type: dataType,
          encrypted_value: encrypted.value,
        })
        .select()
        .single();

      if (error) throw error;

      await logSecurityEvent(userId, "create", true, { dataType, resourceId: data.id }, req);

      return res.json(success({ id: data.id, masked: encrypted.masked }, "Sensitive data stored securely"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to store sensitive data"));
    }
  });

  app.get("/api/security/sensitive-data/:id", authenticateToken, requireRole("admin", "owner", "agent", "landlord", "property_manager"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { reason } = req.query;

      if (!reason) {
        return res.status(400).json({ error: "Access reason is required" });
      }

      const { data, error } = await supabase
        .from("sensitive_data")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Data not found" });
      }

      const decryptedValue = decrypt(data.encrypted_value);

      const accessLog = data.accessed_by || [];
      accessLog.push({
        userId,
        accessedAt: new Date().toISOString(),
        reason: reason as string,
      });

      await supabase
        .from("sensitive_data")
        .update({ accessed_by: accessLog, updated_at: new Date().toISOString() })
        .eq("id", id);

      await logSecurityEvent(userId, "view", true, { 
        dataType: data.data_type, 
        resourceId: id, 
        reason 
      }, req);

      return res.json(success({ 
        value: decryptedValue, 
        dataType: data.data_type 
      }, "Sensitive data retrieved"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to retrieve sensitive data"));
    }
  });

  app.post("/api/security/validate-file", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { filename, mimeType, size } = req.body;

      if (!filename || !mimeType || size === undefined) {
        return res.status(400).json({ error: "Filename, mimeType, and size are required" });
      }

      const validation = validateFileUpload(filename, mimeType, size);

      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const secureFilename = generateSecureFilename(filename);
      const uploadPath = getUploadPath(req.user!.id);

      return res.json(success({
        valid: true,
        secureFilename,
        uploadPath,
        sanitizedFilename: validation.sanitizedFilename,
      }, "File validated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to validate file"));
    }
  });
}
