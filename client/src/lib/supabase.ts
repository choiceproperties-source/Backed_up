/**
 * Supabase Frontend Client
 * =========================
 * Creates and exports the Supabase client for frontend operations.
 * 
 * SAFETY: This module checks for environment variables before initialization.
 * If not configured, it exports null and logs a helpful error message.
 * This prevents cryptic errors and guides developers to configure secrets.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

// Validate configuration and create client
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  // Log clear guidance for missing configuration
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY');
  
  console.error(
    `[SUPABASE] Configuration incomplete. Missing: ${missing.join(', ')}\n` +
    'Authentication and database features will not work.\n' +
    'Add these variables to Replit Secrets. See SETUP.md for instructions.'
  );
}

/**
 * Returns true if Supabase is properly configured.
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
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Replit Secrets.'
    );
  }
  return supabase;
}

export { supabase };
