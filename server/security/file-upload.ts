import crypto from "crypto";
import path from "path";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@shared/schema";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  checksum?: string;
}

export interface UploadedFileInfo {
  originalName: string;
  sanitizedName: string;
  mimeType: string;
  size: number;
  checksum: string;
}

const DANGEROUS_EXTENSIONS = [
  ".exe", ".dll", ".bat", ".cmd", ".msi", ".scr",
  ".ps1", ".sh", ".bash", ".zsh",
  ".js", ".vbs", ".jar", ".php", ".py", ".rb",
  ".html", ".htm", ".svg"
];

const MAGIC_NUMBERS: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

function sanitizeFilename(filename: string): string {
  let sanitized = path.basename(filename);
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");
  sanitized = sanitized.replace(/\.{2,}/g, ".");
  sanitized = sanitized.replace(/^[._-]+|[._-]+$/g, "");
  
  if (!sanitized || sanitized.length < 1) {
    sanitized = `file_${Date.now()}`;
  }

  const maxLength = 100;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const base = path.basename(sanitized, ext);
    sanitized = base.substring(0, maxLength - ext.length - 1) + ext;
  }

  return sanitized;
}

function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function checkMagicNumber(buffer: Buffer, mimeType: string): boolean {
  const magic = MAGIC_NUMBERS[mimeType];
  if (!magic) return true;
  
  if (buffer.length < magic.length) return false;
  
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false;
  }
  return true;
}

function hasDangerousExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

export function validateFileUpload(
  filename: string,
  mimeType: string,
  size: number,
  buffer?: Buffer
): FileValidationResult {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: "Filename is required" };
  }

  if (hasDangerousExtension(filename)) {
    return { valid: false, error: "File type not allowed for security reasons" };
  }

  if (!ALLOWED_FILE_TYPES.includes(mimeType as any)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}` 
    };
  }

  if (size > MAX_FILE_SIZE) {
    const maxMB = MAX_FILE_SIZE / (1024 * 1024);
    return { valid: false, error: `File size exceeds maximum of ${maxMB}MB` };
  }

  if (size < 1) {
    return { valid: false, error: "File is empty" };
  }

  if (buffer && !checkMagicNumber(buffer, mimeType)) {
    return { valid: false, error: "File content does not match declared type" };
  }

  const sanitizedFilename = sanitizeFilename(filename);
  const checksum = buffer ? calculateChecksum(buffer) : undefined;

  return {
    valid: true,
    sanitizedFilename,
    checksum,
  };
}

export function generateSecureFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `${timestamp}_${random}${ext}`;
}

export function getUploadPath(userId: string, applicationId?: string): string {
  const basePath = "uploads";
  if (applicationId) {
    return `${basePath}/applications/${applicationId}`;
  }
  return `${basePath}/users/${userId}`;
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isDocumentFile(mimeType: string): boolean {
  return mimeType === "application/pdf" || 
         mimeType.includes("word") || 
         mimeType.includes("document");
}
