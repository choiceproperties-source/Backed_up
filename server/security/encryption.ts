import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

let fallbackKey: string | null = null;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn("[ENCRYPTION] No ENCRYPTION_KEY set. Using stable fallback key. SET ENCRYPTION_KEY IN PRODUCTION!");
    if (!fallbackKey) {
      fallbackKey = crypto.createHash("sha256").update("choice-properties-dev-key-not-for-production").digest("hex");
    }
    return fallbackKey;
  }
  return key;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

export function encrypt(plaintext: string): string {
  try {
    const masterKey = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(masterKey, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, "hex")]).toString("base64");
  } catch (error) {
    console.error("[ENCRYPTION] Encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

export function decrypt(ciphertext: string): string {
  try {
    const masterKey = getEncryptionKey();
    const buffer = Buffer.from(ciphertext, "base64");

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(masterKey, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[ENCRYPTION] Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

export function hashSensitiveData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function maskSSN(ssn: string): string {
  if (!ssn || ssn.length < 4) return "***-**-****";
  return `***-**-${ssn.slice(-4)}`;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return "***-***-****";
  const digits = phone.replace(/\D/g, "");
  return `***-***-${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.***";
  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 2 ? local[0] + "*".repeat(local.length - 2) + local.slice(-1) : "**";
  return `${maskedLocal}@${domain}`;
}

export interface EncryptedField {
  value: string;
  masked: string;
  hash: string;
}

export function encryptSensitiveField(value: string, type: "ssn" | "phone" | "email" | "other"): EncryptedField {
  const encrypted = encrypt(value);
  const hash = hashSensitiveData(value);
  let masked: string;

  switch (type) {
    case "ssn":
      masked = maskSSN(value);
      break;
    case "phone":
      masked = maskPhoneNumber(value);
      break;
    case "email":
      masked = maskEmail(value);
      break;
    default:
      masked = "*".repeat(Math.max(value.length - 2, 3));
  }

  return { value: encrypted, masked, hash };
}
