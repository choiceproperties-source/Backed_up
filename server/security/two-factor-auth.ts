import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = "ChoiceProperties";

export interface TwoFactorSetup {
  secret: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export function generateTwoFactorSecret(userEmail: string): { secret: string; otpAuthUrl: string } {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME}:${userEmail}`,
    length: 32,
  });
  
  return {
    secret: secret.base32,
    otpAuthUrl: secret.otpauth_url || "",
  };
}

export async function generateQRCode(otpAuthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpAuthUrl);
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code => 
    crypto.createHash("sha256").update(code.replace("-", "")).digest("hex")
  );
}

export function verifyBackupCode(inputCode: string, hashedCodes: string[]): { valid: boolean; usedIndex: number } {
  const hashedInput = crypto.createHash("sha256").update(inputCode.replace("-", "")).digest("hex");
  const index = hashedCodes.findIndex(hashed => hashed === hashedInput);
  return { valid: index !== -1, usedIndex: index };
}

export function verifyTOTP(secret: string, token: string): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
  } catch (error) {
    console.error("TOTP verification failed:", error);
    return false;
  }
}

export async function setupTwoFactor(userEmail: string): Promise<TwoFactorSetup> {
  const { secret, otpAuthUrl } = generateTwoFactorSecret(userEmail);
  const qrCodeDataUrl = await generateQRCode(otpAuthUrl);
  const backupCodes = generateBackupCodes();
  
  return {
    secret,
    otpAuthUrl,
    qrCodeDataUrl,
    backupCodes,
  };
}

export function requiresTwoFactor(role: string): boolean {
  const rolesRequiring2FA = ["landlord", "property_manager", "agent", "admin", "owner"];
  return rolesRequiring2FA.includes(role);
}
