import { getSupabaseOrThrow } from "../../supabase";

/* ------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------ */

function throwIfError(error: any, context: string) {
  if (error) {
    console.error(`[APPLICATION_REPO] ${context}`, error);
    throw error;
  }
}

/* ------------------------------------------------ */
/* Applications */
/* ------------------------------------------------ */

export async function findApplicationById(id: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle(); // 👈 safer than .single()

  throwIfError(error, "findApplicationById");

  return data;
}

export async function findApplicationsByUserId(userId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        *,
        properties (
          id,
          title,
          price,
          address,
          owner_id
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIfError(error, "findApplicationsByUserId");

  return data ?? [];
}

export async function findApplicationsByPropertyId(propertyId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
        *,
        users (
          id,
          full_name,
          email,
          phone
        )
      `
    )
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  throwIfError(error, "findApplicationsByPropertyId");

  return data ?? [];
}

export async function checkDuplicateApplication(
  userId: string,
  propertyId: string
) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .limit(1);

  // ❗ DO NOT throw here — duplicate check must be safe
  if (error) {
    console.warn(
      "[APPLICATION_REPO] duplicate check failed, allowing create",
      error
    );
    return { exists: false };
  }

  return { exists: (data?.length ?? 0) > 0 };
}

export async function findLatestDraftByPropertyId(propertyId: string, userId: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, "findLatestDraftByPropertyId");

  return data;
}

export async function createApplication(
  applicationData: Record<string, any>
) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .insert([applicationData])
    .select()
    .single();

  throwIfError(error, "createApplication");

  return data;
}

export async function updateApplication(
  id: string,
  updateData: Record<string, any>
) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  throwIfError(error, "updateApplication");

  return data;
}

export async function updateApplicationStatus(
  id: string,
  updateData: Record<string, any>
) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", id)
    .select()
    .maybeSingle();

  throwIfError(error, "updateApplicationStatus");

  return data;
}

/* ------------------------------------------------ */
/* Property & User */
/* ------------------------------------------------ */

export async function getProperty(id: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error, "getProperty");

  return data;
}

export async function getUser(id: string) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error, "getUser");

  return data;
}

/* ------------------------------------------------ */
/* Conversations */
/* ------------------------------------------------ */

export async function createConversation(
  conversationData: Record<string, any>
) {
  const supabase = getSupabaseOrThrow();

  const { data, error } = await supabase
    .from("conversations")
    .insert([conversationData])
    .select()
    .single();

  throwIfError(error, "createConversation");

  return data;
}

export async function addConversationParticipant(
  conversationId: string,
  userId: string
) {
  const supabase = getSupabaseOrThrow();

  const { error } = await supabase
    .from("conversation_participants")
    .insert([
      {
        conversation_id: conversationId,
        user_id: userId,
      },
    ]);

  throwIfError(error, "addConversationParticipant");

  return true;
}

export async function updateApplicationConversation(
  applicationId: string,
  conversationId: string
) {
  const supabase = getSupabaseOrThrow();

  const { error } = await supabase
    .from("applications")
    .update({ conversation_id: conversationId })
    .eq("id", applicationId);

  throwIfError(error, "updateApplicationConversation");

  return true;
}