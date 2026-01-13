import { getSupabaseOrThrow } from "../../supabase";

export async function getActiveLegalDocuments() {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("key, version, title, content")
    .eq("active", true);

  if (error) {
    console.error("[LEGAL_REPO] Error fetching active legal documents:", error);
    throw error;
  }
  return data || [];
}
