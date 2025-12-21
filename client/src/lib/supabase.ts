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

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

// Function to initialize Supabase client
function initializeSupabase(url: string, key: string) {
  if (url && key) {
    supabase = createClient(url, key);
  }
}

// Try to initialize with env vars first
if (supabaseUrl && supabaseKey) {
  initializeSupabase(supabaseUrl, supabaseKey);
} else {
  // If env vars aren't available, fetch from backend config endpoint
  fetch('/api/config')
    .then(res => res.json())
    .then(config => {
      if (config.supabaseUrl && config.supabaseAnonKey) {
        supabaseUrl = config.supabaseUrl;
        supabaseKey = config.supabaseAnonKey;
        initializeSupabase(supabaseUrl, supabaseKey);
      } else {
        console.error(
          '[SUPABASE] Configuration incomplete. Supabase URL and anon key not available.\n' +
          'Authentication and database features will not work.\n' +
          'Add SUPABASE_URL and SUPABASE_ANON_KEY to Replit Secrets. See SETUP.md for instructions.'
        );
      }
    })
    .catch(() => {
      console.error(
        '[SUPABASE] Failed to fetch config from backend.\n' +
        'Authentication and database features will not work.'
      );
    });
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
      'Add SUPABASE_URL and SUPABASE_ANON_KEY to Replit Secrets.'
    );
  }
  return supabase;
}

export { supabase };
