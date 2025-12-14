import { SupabaseClient } from "@supabase/supabase-js";

export type ImageAuditAction = "image_upload" | "image_delete" | "image_replace" | "image_reorder";

export interface ImageAuditLog {
  actorId: string;
  actorRole: string;
  action: ImageAuditAction;
  photoId?: string;
  propertyId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log image-related audit events
 */
export async function logImageAudit(
  supabase: SupabaseClient,
  log: ImageAuditLog
): Promise<void> {
  try {
    const { error } = await supabase
      .from("image_audit_logs")
      .insert([{
        actor_id: log.actorId,
        actor_role: log.actorRole,
        action: log.action,
        photo_id: log.photoId || null,
        property_id: log.propertyId || null,
        metadata: log.metadata || null,
        timestamp: new Date().toISOString(),
      }]);

    if (error) {
      console.error("[IMAGE_AUDIT] Failed to log image audit:", error);
    } else {
      console.log(`[IMAGE_AUDIT] ${log.action} logged for actor ${log.actorId}`);
    }
  } catch (err: any) {
    console.error("[IMAGE_AUDIT] Error logging audit event:", err);
  }
}
