/**
 * Supabase Frontend Client
 * =========================
 * Creates and exports the Supabase client for frontend operations.
 * 
 * The client is initialized asynchronously by fetching config from the backend.
 * This ensures we always have valid credentials before creating the client.
 * 
 * IMPORTANT: Other modules should wait for initPromise before using supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

// Promise that resolves when Supabase is fully initialized
let initResolve: (() => void) | null = null;
export const initPromise = new Promise<void>((resolve) => {
  initResolve = resolve;
});

// Initialize Supabase by fetching config from backend
async function initializeSupabase() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    
    if (config.supabaseUrl && config.supabaseAnonKey) {
      supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
      console.log('[SUPABASE] ✅ Client initialized from backend config');
    } else {
      console.error(
        '[SUPABASE] Configuration incomplete. Supabase URL and anon key not available.\n' +
        'Add SUPABASE_URL and SUPABASE_ANON_KEY to Replit Secrets. See SETUP.md for instructions.'
      );
    }
  } catch (error) {
    console.error('[SUPABASE] Failed to fetch config from backend:', error);
  } finally {
    // Always resolve, even if there was an error (allows app to continue)
    if (initResolve) initResolve();
  }
}

// Start initialization immediately
initializeSupabase();

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
