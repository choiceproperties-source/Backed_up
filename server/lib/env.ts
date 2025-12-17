/**
 * Environment Variable Validation System
 * ========================================
 * This module provides fail-fast environment validation to prevent
 * the application from running with missing or invalid configuration.
 * 
 * WHY THIS EXISTS:
 * - Prevents silent failures when environment variables are missing
 * - Provides clear error messages to guide developers to Replit Secrets
 * - Ensures Supabase never initializes with invalid configuration
 * - Makes debugging configuration issues straightforward
 * 
 * USAGE:
 * Call validateEnv() at application startup before any other initialization.
 * The function will throw an error if required variables are missing.
 */

interface EnvConfig {
  key: string;
  required: boolean;
  description: string;
  category: 'supabase' | 'imagekit' | 'email' | 'security' | 'app';
}

const ENV_VARIABLES: EnvConfig[] = [
  // Core Supabase (Required for authentication and data)
  {
    key: 'SUPABASE_URL',
    required: true,
    description: 'Supabase project URL (Project Settings > API)',
    category: 'supabase'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (Project Settings > API > service_role)',
    category: 'supabase'
  },
  // ImageKit (Optional - for image hosting)
  {
    key: 'IMAGEKIT_PUBLIC_KEY',
    required: false,
    description: 'ImageKit public key for image uploads',
    category: 'imagekit'
  },
  {
    key: 'IMAGEKIT_PRIVATE_KEY',
    required: false,
    description: 'ImageKit private key for server-side operations',
    category: 'imagekit'
  },
  {
    key: 'IMAGEKIT_URL_ENDPOINT',
    required: false,
    description: 'ImageKit URL endpoint for image delivery',
    category: 'imagekit'
  },
  // Email (Optional)
  {
    key: 'SENDGRID_API_KEY',
    required: false,
    description: 'SendGrid API key for email notifications',
    category: 'email'
  },
  // Security (Optional but recommended)
  {
    key: 'ENCRYPTION_KEY',
    required: false,
    description: 'Encryption key for sensitive data (32+ characters)',
    category: 'security'
  }
];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  configured: Record<string, boolean>;
}

/**
 * Validates all environment variables and returns detailed results.
 * Does not throw - use validateEnvOrThrow() for fail-fast behavior.
 */
export function validateEnvSilent(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const configured: Record<string, boolean> = {};

  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.key];
    configured[envVar.key] = !!value;

    if (envVar.required && !value) {
      missing.push(envVar.key);
    } else if (!envVar.required && !value) {
      warnings.push(`${envVar.key} not configured - ${envVar.description}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    configured
  };
}

/**
 * Validates required environment variables and throws if any are missing.
 * Call this at application startup before Supabase initialization.
 */
export function validateEnv(): void {
  const result = validateEnvSilent();

  if (!result.valid) {
    const errorMessage = formatMissingEnvError(result.missing);
    console.error('\n' + '='.repeat(60));
    console.error('ENVIRONMENT CONFIGURATION ERROR');
    console.error('='.repeat(60));
    console.error(errorMessage);
    console.error('='.repeat(60) + '\n');
    
    throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
  }

  // Log warnings for optional variables
  if (result.warnings.length > 0) {
    console.warn('\n[ENV] Optional configuration warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('');
  }

  console.log('[ENV] Environment validation passed');
}

/**
 * Formats a helpful error message for missing environment variables.
 */
function formatMissingEnvError(missing: string[]): string {
  const lines: string[] = [
    '',
    'The following required environment variables are missing:',
    ''
  ];

  for (const key of missing) {
    const config = ENV_VARIABLES.find(e => e.key === key);
    lines.push(`  - ${key}`);
    if (config) {
      lines.push(`    ${config.description}`);
    }
    lines.push('');
  }

  lines.push('HOW TO FIX:');
  lines.push('1. Go to Replit Secrets (lock icon in the sidebar)');
  lines.push('2. Add each missing variable with its value');
  lines.push('3. Restart the application');
  lines.push('');
  lines.push('See .env.example for a complete list of variables.');
  lines.push('See SETUP.md for detailed instructions.');

  return lines.join('\n');
}

/**
 * Validates Supabase-specific environment variables.
 * Use this before initializing any Supabase client.
 */
export function validateSupabaseEnv(): { url: string; serviceKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      'SUPABASE_URL is not configured. ' +
      'Add it to Replit Secrets (found in Supabase Project Settings > API).'
    );
  }

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Add it to Replit Secrets (found in Supabase Project Settings > API > service_role).'
    );
  }

  // Validate URL format
  if (!url.includes('supabase.co') && !url.includes('supabase.in')) {
    console.warn('[ENV] Warning: SUPABASE_URL does not appear to be a valid Supabase URL');
  }

  return { url, serviceKey };
}

/**
 * Gets the configuration status for logging/debugging.
 */
export function getEnvStatus(): Record<string, boolean> {
  const result = validateEnvSilent();
  return result.configured;
}
