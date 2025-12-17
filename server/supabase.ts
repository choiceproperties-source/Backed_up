/**
 * Supabase Server Client
 * =======================
 * Creates and exports the Supabase client for server-side operations.
 * 
 * SAFETY: This module validates environment variables before initialization.
 * If Supabase is not configured, it exports null and logs a warning.
 * This prevents silent failures and guides developers to configure secrets.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;

// Validate configuration and create client
if (supabaseUrl && supabaseServiceKey) {
  // Validate URL format
  if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.in')) {
    console.warn('[SUPABASE] Warning: SUPABASE_URL does not appear to be a valid Supabase URL');
  }
  
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('[SUPABASE] Client initialized successfully');
} else {
  // Provide clear guidance for missing configuration
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  console.warn(
    `[WARN] Supabase configuration incomplete. Missing: ${missing.join(', ')}\n` +
    '[WARN] Database features will not work until Supabase is configured.\n' +
    '[WARN] Add these variables to Replit Secrets to enable full functionality.\n' +
    '[WARN] See SETUP.md for detailed instructions.'
  );
}

/**
 * Returns true if Supabase is properly configured and ready to use.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

/**
 * Gets the Supabase client, throwing if not configured.
 * Use this when Supabase is required for an operation.
 */
export function getSupabaseOrThrow(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. ' +
      'Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Replit Secrets. ' +
      'See SETUP.md for instructions.'
    );
  }
  return supabase;
}

/**
 * Tests the Supabase connection by making a simple query.
 * Returns { connected: true } on success, or { connected: false, error: string } on failure.
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!supabase) {
    return { connected: false, error: 'Supabase client not initialized - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
  }
  
  try {
    // Use a simple auth check that doesn't require any tables
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message || 'Unknown connection error' };
  }
}

/**
 * Validates Supabase connection at startup (non-blocking).
 */
export async function validateSupabaseConnection(): Promise<void> {
  const result = await testSupabaseConnection();
  if (result.connected) {
    console.log('[SUPABASE] Connection validated - Supabase connected');
  } else {
    console.error(`[SUPABASE] Connection failed: ${result.error}`);
  }
}

export { supabase };
