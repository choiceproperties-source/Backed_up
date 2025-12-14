/**
 * Configuration Validation Utilities
 * 
 * Non-runtime safety mechanisms to validate environment and configuration
 * without affecting server startup. Used by maintenance utilities only.
 * 
 * This module is NOT imported by production routes or server startup.
 * It's intended for use in maintenance scripts and development tools.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    nodeEnv: string;
    hasSupabaseUrl: boolean;
    hasSupabaseServiceRoleKey: boolean;
    hasImageKitConfig: boolean;
    hasSendGridKey: boolean;
    rateLimitingEnabled: boolean;
    port: number | string;
  };
}

/**
 * Validates all required environment variables and configurations
 * Returns detailed report without throwing errors
 */
export function validateConfiguration(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredEnvVars = {
    SUPABASE_URL: "Supabase project URL",
    SUPABASE_SERVICE_ROLE_KEY: "Supabase service role API key",
  };

  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key} (${description})`);
    }
  }

  // Optional but recommended
  const recommendedEnvVars = {
    SENDGRID_API_KEY: "Email delivery (notifications disabled without it)",
    IMAGEKIT_PUBLIC_KEY: "Image optimization (basic upload only without it)",
    IMAGEKIT_PRIVATE_KEY: "Image optimization (basic upload only without it)",
    IMAGEKIT_URL_ENDPOINT: "Image optimization (basic upload only without it)",
  };

  for (const [key, description] of Object.entries(recommendedEnvVars)) {
    if (!process.env[key]) {
      warnings.push(`Optional but recommended: ${key} (${description})`);
    }
  }

  // Validate NODE_ENV
  const validNodeEnvs = ["development", "production", "test"];
  const nodeEnv = process.env.NODE_ENV || "development";
  if (!validNodeEnvs.includes(nodeEnv)) {
    warnings.push(
      `NODE_ENV should be one of: ${validNodeEnvs.join(", ")}. Found: ${nodeEnv}`
    );
  }

  // Validate Supabase URL format if present
  if (process.env.SUPABASE_URL) {
    if (!process.env.SUPABASE_URL.includes("supabase.co")) {
      warnings.push(
        "SUPABASE_URL doesn't look like a valid Supabase URL (should contain 'supabase.co')"
      );
    }
  }

  // Check JWT environment (implicit in Supabase setup)
  if (process.env.NODE_ENV === "production" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push(
      "Production requires SUPABASE_SERVICE_ROLE_KEY for secure server operations"
    );
  }

  const config = {
    nodeEnv,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasImageKitConfig:
      !!process.env.IMAGEKIT_PUBLIC_KEY &&
      !!process.env.IMAGEKIT_PRIVATE_KEY &&
      !!process.env.IMAGEKIT_URL_ENDPOINT,
    hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED !== "false",
    port: process.env.PORT || 5000,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Validates database connectivity (non-blocking)
 * Useful for pre-flight checks before running migrations
 */
export async function validateDatabaseConnection(
  supabaseUrl?: string,
  serviceRoleKey?: string
): Promise<{
  canConnect: boolean;
  error?: string;
  responseTime?: number;
}> {
  try {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return {
        canConnect: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      };
    }

    const startTime = Date.now();

    // Simple health check via REST API
    const response = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    }).catch(() => null);

    const responseTime = Date.now() - startTime;

    if (!response) {
      return {
        canConnect: false,
        error: "Cannot reach Supabase API endpoint",
        responseTime,
      };
    }

    return {
      canConnect: response.ok,
      responseTime,
    };
  } catch (error) {
    return {
      canConnect: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validates that all critical tables exist in database
 * Returns info about missing tables without blocking execution
 */
export async function validateDatabaseSchema(
  supabaseUrl?: string,
  serviceRoleKey?: string
): Promise<{
  allTablesExist: boolean;
  missingTables: string[];
  foundTables: string[];
}> {
  const requiredTables = [
    "users",
    "properties",
    "applications",
    "agencies",
    "reviews",
    "favorites",
    "saved_searches",
    "inquiries",
    "audit_logs",
  ];

  try {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return {
        allTablesExist: false,
        missingTables: ["Cannot validate - missing credentials"],
        foundTables: [],
      };
    }

    // Query information schema
    const response = await fetch(`${url}/rest/v1/information_schema.tables`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    }).catch(() => null);

    if (!response || !response.ok) {
      return {
        allTablesExist: false,
        missingTables: ["Cannot query database schema"],
        foundTables: [],
      };
    }

    const tables = await response.json();
    const tableNames = tables
      .map((t: any) => t.table_name)
      .filter((name: string) => !name.startsWith("pg_") && name !== "information_schema");

    const foundTables = requiredTables.filter((table) =>
      tableNames.includes(table)
    );
    const missingTables = requiredTables.filter(
      (table) => !tableNames.includes(table)
    );

    return {
      allTablesExist: missingTables.length === 0,
      missingTables,
      foundTables,
    };
  } catch (error) {
    return {
      allTablesExist: false,
      missingTables: [error instanceof Error ? error.message : String(error)],
      foundTables: [],
    };
  }
}

/**
 * Validates ImageKit configuration
 */
export function validateImageKitConfig(): {
  isConfigured: boolean;
  missingKeys: string[];
} {
  const requiredKeys = [
    "IMAGEKIT_PUBLIC_KEY",
    "IMAGEKIT_PRIVATE_KEY",
    "IMAGEKIT_URL_ENDPOINT",
  ];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}

/**
 * Validates SendGrid configuration for email
 */
export function validateSendGridConfig(): {
  isConfigured: boolean;
  hasApiKey: boolean;
  message: string;
} {
  const hasApiKey = !!process.env.SENDGRID_API_KEY;

  return {
    isConfigured: hasApiKey,
    hasApiKey,
    message: hasApiKey
      ? "SendGrid configured - email notifications enabled"
      : "SendGrid not configured - email notifications disabled",
  };
}

/**
 * Creates a human-readable report of all validation results
 */
export async function generateValidationReport(): Promise<string> {
  const config = validateConfiguration();
  const dbConnection = await validateDatabaseConnection();
  const dbSchema = await validateDatabaseSchema();
  const imageKit = validateImageKitConfig();
  const sendGrid = validateSendGridConfig();

  let report = "\n=== Configuration Validation Report ===\n\n";

  // Configuration Status
  report += `Environment: ${config.config.nodeEnv.toUpperCase()}\n`;
  report += `Status: ${config.isValid ? "✓ VALID" : "✗ INVALID"}\n\n`;

  if (config.errors.length > 0) {
    report += "Errors:\n";
    config.errors.forEach((e) => {
      report += `  ✗ ${e}\n`;
    });
    report += "\n";
  }

  if (config.warnings.length > 0) {
    report += "Warnings:\n";
    config.warnings.forEach((w) => {
      report += `  ⚠ ${w}\n`;
    });
    report += "\n";
  }

  // Database Connectivity
  report += "Database Connection:\n";
  report += `  ${dbConnection.canConnect ? "✓" : "✗"} ${
    dbConnection.canConnect ? "Connected" : "Cannot connect"
  }`;
  if (dbConnection.responseTime) {
    report += ` (${dbConnection.responseTime}ms)`;
  }
  if (dbConnection.error) {
    report += `\n    Error: ${dbConnection.error}`;
  }
  report += "\n\n";

  // Database Schema
  report += "Database Schema:\n";
  report += `  ${dbSchema.allTablesExist ? "✓" : "✗"} All required tables exist\n`;
  if (dbSchema.foundTables.length > 0) {
    report += `    Found: ${dbSchema.foundTables.join(", ")}\n`;
  }
  if (dbSchema.missingTables.length > 0) {
    report += `    Missing: ${dbSchema.missingTables.join(", ")}\n`;
  }
  report += "\n";

  // Optional Services
  report += "Optional Services:\n";
  report += `  ${imageKit.isConfigured ? "✓" : "✗"} ImageKit ${
    imageKit.isConfigured ? "configured" : "not configured"
  }\n`;
  report += `  ${sendGrid.isConfigured ? "✓" : "✗"} SendGrid ${
    sendGrid.message.includes("enabled") ? "configured" : "not configured"
  }\n`;
  report += "\n";

  return report;
}
