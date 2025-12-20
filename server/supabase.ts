/**
 * Supabase Server Client
 * =====================
 * Centralized, SAFE Supabase server client.
 *
 * GOALS:
 * - Zero silent failures
 * - Zero random auth crashes
 * - Clear startup diagnostics
 * - Mobile-safe behavior
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------ */
/* Environment Validation */
/* ------------------------------------------------ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: SupabaseClient | null = null;

function isValidSupabaseUrl(url: string) {
  return (
    url.startsWith("https://") &&
    (url.includes(".supabase.co") || url.includes(".supabase.in"))
  );
}

/* ------------------------------------------------ */
/* Client Initialization */
/* ------------------------------------------------ */

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[SUPABASE] ❌ Supabase not configured.\n" +
      "Missing environment variables:\n" +
      `${!SUPABASE_URL ? "- SUPABASE_URL\n" : ""}` +
      `${!SUPABASE_SERVICE_ROLE_KEY ? "- SUPABASE_SERVICE_ROLE_KEY\n" : ""}` +
      "➡ Add these in Replit Secrets.\n"
  );
} else if (!isValidSupabaseUrl(SUPABASE_URL)) {
  console.error(
    "[SUPABASE] ❌ Invalid SUPABASE_URL format.\n" +
      "Expected something like: https://xxxx.supabase.co"
  );
} else {
  supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false, // 🔥 IMPORTANT: prevents random session bleed
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  console.log("[SUPABASE] ✅ Server client initialized");
}

/* ------------------------------------------------ */
/* Public API */
/* ------------------------------------------------ */

export function isSupabaseConfigured(): boolean {
  return supabaseClient !== null;
}

export function getSupabaseOrThrow(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error(
      "[SUPABASE] Client not initialized. " +
        "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Replit Secrets."
    );
  }

  return supabaseClient;
}

/**
 * Optional: safe getter (returns null instead of throwing)
 */
export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

/* ------------------------------------------------ */
/* Diagnostics */
/* ------------------------------------------------ */

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  if (!supabaseClient) {
    return {
      connected: false,
      error: "Supabase client not initialized",
    };
  }

  try {
    const { error } = await supabaseClient
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      return { connected: false, error: error.message };
    }

    return { connected: true };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || "Unknown Supabase error",
    };
  }
}

/**
 * Non-blocking startup validation
 */
export async function validateSupabaseConnection(): Promise<void> {
  const result = await testSupabaseConnection();

  if (result.connected) {
    console.log("[SUPABASE] ✅ Connection verified");
  } else {
    console.error("[SUPABASE] ❌ Connection failed:", result.error);
  }
}

export { supabaseClient as supabase };