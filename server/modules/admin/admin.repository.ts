import { getSupabaseOrThrow } from "../../supabase";

export class AdminRepository {
  async getImageAuditLogs(propertyId?: string, action?: string, limit: number = 100, offset: number = 0): Promise<{ logs: any[]; total: number }> {
    const supabase = getSupabaseOrThrow();
    let query = supabase
      .from("image_audit_logs")
      .select("id, actor_id, actor_role, action, photo_id, property_id, metadata, timestamp, users:actor_id(id, full_name, email, role)", { count: "exact" })
      .order("timestamp", { ascending: false });

    if (propertyId) {
      query = query.eq("property_id", propertyId);
    }

    if (action) {
      query = query.eq("action", action);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return { logs: data || [], total: count || 0 };
  }

  async getPersonas(): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("personas")
      .select("*");

    if (error) throw error;
    return data || [];
  }

  async createPersona(personaData: any): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("personas")
      .insert([personaData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePersona(id: string, updates: any): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("personas")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePersona(id: string): Promise<void> {
    const supabase = getSupabaseOrThrow();
    const { error } = await supabase
      .from("personas")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  async getSettings(): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || { maintenance_mode: false, notification_enabled: true };
  }

  async updateSettings(updates: any): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("admin_settings")
      .upsert(updates, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProperty(id: string, updates: any): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("properties")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: any): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAllUsers(): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAllProperties(): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async logAdminAction(userId: string, action: string, resourceType: string, resourceId: string, details?: any) {
    const supabase = getSupabaseOrThrow();
    const { error } = await supabase
      .from("admin_actions")
      .insert([{
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
      }]);

    if (error) throw error;
  }
}
