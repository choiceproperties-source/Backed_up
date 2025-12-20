import { getSupabaseOrThrow } from "../../supabase";

/* ------------------------------------------------ */
/* Applications Repository */
/* ------------------------------------------------ */

export async function findApplicationById(id: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function findApplicationsByUserId(userId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .select("*, properties(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function findApplicationsByPropertyId(propertyId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .select("*, users(id, full_name, email, phone)")
    .eq("property_id", propertyId);

  if (error) throw error;
  return data;
}

export async function checkDuplicateApplication(userId: string, propertyId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .single();

  return { exists: !!data, error };
}

export async function createApplication(applicationData: Record<string, any>) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .insert([applicationData])
    .select();

  if (error) {
    console.error("[APPLICATION_REPOSITORY] Failed to create application:", {
      message: error.message,
      code: error.code,
      details: error.details,
      keys: Object.keys(applicationData),
    });
    throw error;
  }

  return data[0];
}

export async function updateApplication(id: string, updateData: Record<string, any>) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
}

export async function updateApplicationStatus(id: string, updateData: Record<string, any>) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) throw error;
  return data[0];
}

/* ------------------------------------------------ */
/* Properties & Users Helpers */
/* ------------------------------------------------ */

export async function getProperty(id: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("properties")
    .select("owner_id, title")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getUser(id: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/* ------------------------------------------------ */
/* Conversations Helpers */
/* ------------------------------------------------ */

export async function createConversation(conversationData: Record<string, any>) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("conversations")
    .insert([conversationData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addConversationParticipant(conversationId: string, userId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("conversation_participants")
    .insert([{ conversation_id: conversationId, user_id: userId }]);

  if (error) throw error;
  return data;
}

export async function updateApplicationConversation(applicationId: string, conversationId: string) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("applications")
    .update({ conversation_id: conversationId })
    .eq("id", applicationId);

  if (error) throw error;
  return data;
}