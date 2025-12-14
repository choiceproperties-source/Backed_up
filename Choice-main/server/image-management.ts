import imagekit from "./imagekit";
import { logImageAudit, type ImageAuditLog } from "./image-audit";

/**
 * Delete file from ImageKit using fileId
 * Handles cleanup of remote images when archives locally
 */
export async function deleteImageKitFile(fileId: string): Promise<void> {
  if (!imagekit) {
    console.warn(`[IMAGEKIT] ImageKit not configured, skipping file deletion: ${fileId}`);
    return;
  }
  
  try {
    await imagekit.deleteFile(fileId);
    console.log(`[IMAGEKIT] Deleted file: ${fileId}`);
  } catch (err: any) {
    // Log but don't fail - file may already be deleted
    console.warn(`[IMAGEKIT] Failed to delete file ${fileId}:`, err.message);
  }
}

/**
 * Reorder photos by updating orderIndex
 * Recalculates indexes to maintain consistency
 */
export interface PhotoOrderUpdate {
  photoId: string;
  orderIndex: number;
}

export async function reorderPhotos(
  supabase: any,
  propertyId: string,
  orders: PhotoOrderUpdate[],
  auditLog?: ImageAuditLog
): Promise<void> {
  // Update each photo's order index
  for (const { photoId, orderIndex } of orders) {
    await supabase
      .from("photos")
      .update({ order_index: orderIndex })
      .eq("id", photoId)
      .eq("property_id", propertyId);
  }

  // Log audit event
  if (auditLog) {
    await logImageAudit(supabase, auditLog);
  }
}

/**
 * Archive a photo (soft delete)
 * Keeps metadata but marks as archived
 */
export async function archivePhoto(
  supabase: any,
  photoId: string,
  imageKitFileId: string,
  auditLog?: ImageAuditLog
): Promise<void> {
  // Delete from ImageKit
  await deleteImageKitFile(imageKitFileId);
  
  // Archive in database
  await supabase
    .from("photos")
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq("id", photoId);

  // Log audit event
  if (auditLog) {
    await logImageAudit(supabase, auditLog);
  }
}

/**
 * Replace a photo
 * Archives old photo, creates new one, maintains order
 */
export async function replacePhoto(
  supabase: any,
  oldPhotoId: string,
  newPhotoData: {
    imageKitFileId: string;
    url: string;
    thumbnailUrl?: string;
  },
  auditLog?: ImageAuditLog
): Promise<any> {
  // Get old photo to preserve properties
  const { data: oldPhoto } = await supabase
    .from("photos")
    .select("order_index, property_id, category, uploader_id")
    .eq("id", oldPhotoId)
    .single();

  if (!oldPhoto) {
    throw new Error("Original photo not found");
  }

  // Create new photo with same properties
  const { data: newPhoto } = await supabase
    .from("photos")
    .insert([{
      imagekit_file_id: newPhotoData.imageKitFileId,
      url: newPhotoData.url,
      thumbnail_url: newPhotoData.thumbnailUrl,
      category: oldPhoto.category,
      uploader_id: oldPhoto.uploader_id,
      property_id: oldPhoto.property_id,
      order_index: oldPhoto.order_index,
      replaced_with_id: null, // Will be set after insert
    }])
    .select()
    .single();

  // Archive old photo with link to replacement
  await supabase
    .from("photos")
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      replaced_with_id: newPhoto.id,
    })
    .eq("id", oldPhotoId);

  // Log audit event
  if (auditLog) {
    await logImageAudit(supabase, auditLog);
  }

  return newPhoto;
}
