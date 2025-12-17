/**
 * Frontend Environment Variable Validation
 * ==========================================
 * Validates environment variables available to the frontend.
 * These must be prefixed with VITE_ to be accessible in the browser.
 * 
 * WHY THIS EXISTS:
 * - Prevents silent failures when Supabase is not configured
 * - Provides clear error messages to guide developers
 * - Ensures the app fails fast rather than showing cryptic errors
 */

interface EnvConfig {
  key: string;
  required: boolean;
  description: string;
}

const FRONTEND_ENV_VARIABLES: EnvConfig[] = [
  {
    key: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL'
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key'
  },
  {
    key: 'VITE_IMAGEKIT_URL_ENDPOINT',
    required: false,
    description: 'ImageKit URL endpoint for images'
  },
  {
    key: 'VITE_VAPID_PUBLIC_KEY',
    required: false,
    description: 'VAPID public key for push notifications'
  }
];

export interface FrontendEnvStatus {
  valid: boolean;
  missing: string[];
  configured: Record<string, boolean>;
}

/**
 * Validates frontend environment variables.
 * Returns status without throwing - use validateFrontendEnvOrThrow for fail-fast.
 */
export function validateFrontendEnv(): FrontendEnvStatus {
  const missing: string[] = [];
  const configured: Record<string, boolean> = {};

  for (const envVar of FRONTEND_ENV_VARIABLES) {
    const value = import.meta.env[envVar.key];
    configured[envVar.key] = !!value;

    if (envVar.required && !value) {
      missing.push(envVar.key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    configured
  };
}

/**
 * Validates Supabase environment variables for frontend use.
 * Throws descriptive error if not configured.
 */
export function validateSupabaseFrontendEnv(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [];
    if (!url) missing.push('VITE_SUPABASE_URL');
    if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');

    console.error(
      `[ENV ERROR] Missing Supabase configuration: ${missing.join(', ')}\n` +
      'Add these to Replit Secrets to enable authentication.\n' +
      'See SETUP.md for instructions.'
    );

    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`);
  }

  return { url, anonKey };
}

/**
 * Checks if Supabase is configured (without throwing).
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
}

/**
 * Gets current environment configuration status.
 */
export function getEnvStatus(): FrontendEnvStatus {
  return validateFrontendEnv();
}
