/**
 * Upload limit configuration to prevent abuse and cost overrun
 */

// Maximum number of images per property
export const MAX_IMAGES_PER_PROPERTY = 50;

// Maximum file size in bytes (10 MB)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Maximum file size in MB for display in messages
export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

export interface UploadLimitStatus {
  allowed: boolean;
  reason?: string;
  imageCount?: number;
  maxImages?: number;
}

/**
 * Check if property has reached image limit
 */
export async function checkPropertyImageLimit(
  supabase: any,
  propertyId: string
): Promise<UploadLimitStatus> {
  try {
    const { data: photos, error } = await supabase
      .from("photos")
      .select("id")
      .eq("property_id", propertyId)
      .eq("archived", false);

    if (error) {
      console.error("[UPLOAD] Error checking image count:", error);
      return { allowed: false, reason: "Failed to verify image limit" };
    }

    const imageCount = photos?.length || 0;

    if (imageCount >= MAX_IMAGES_PER_PROPERTY) {
      return {
        allowed: false,
        reason: `This property has reached the maximum of ${MAX_IMAGES_PER_PROPERTY} images. Please delete some images before uploading more.`,
        imageCount,
        maxImages: MAX_IMAGES_PER_PROPERTY,
      };
    }

    return {
      allowed: true,
      imageCount,
      maxImages: MAX_IMAGES_PER_PROPERTY,
    };
  } catch (err: any) {
    console.error("[UPLOAD] Exception checking image limit:", err);
    return { allowed: false, reason: "Failed to verify image limit" };
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  fileSizeBytes?: number
): { valid: boolean; reason?: string } {
  if (!fileSizeBytes) {
    return { valid: true }; // No size info provided, skip check
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      reason: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB. Your file is ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB.`,
    };
  }

  return { valid: true };
}
