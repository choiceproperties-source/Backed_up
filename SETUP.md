# Choice Properties - Setup Guide

This guide explains how to configure the application when importing it into Replit.

## Quick Start

1. **Add Supabase Secrets** (Required for authentication and data)
2. **Restart the application**
3. **Start building!**

---

## Required Secrets

The application requires these environment variables to function. Add them to **Replit Secrets** (not a .env file).

### How to Add Secrets in Replit

1. Click the **lock icon** in the left sidebar (Secrets)
2. Click **+ New Secret**
3. Enter the key name and value
4. Click **Add Secret**
5. Restart the application

### Supabase Configuration (Required)

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for backend | Supabase Dashboard > Project Settings > API > service_role |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL (for frontend) | Same as above |
| `VITE_SUPABASE_ANON_KEY` | Public/anon key for frontend | Supabase Dashboard > Project Settings > API > anon |

---

## Optional Secrets

These enable additional features but are not required for basic functionality.

### ImageKit (Image Hosting)

| Secret Name | Description |
|-------------|-------------|
| `IMAGEKIT_PUBLIC_KEY` | Public key from ImageKit dashboard |
| `IMAGEKIT_PRIVATE_KEY` | Private key from ImageKit dashboard |
| `IMAGEKIT_URL_ENDPOINT` | Your ImageKit URL endpoint |
| `VITE_IMAGEKIT_URL_ENDPOINT` | Same endpoint (for frontend) |

### SendGrid (Email Notifications)

| Secret Name | Description |
|-------------|-------------|
| `SENDGRID_API_KEY` | Your SendGrid API key |

### Security

| Secret Name | Description |
|-------------|-------------|
| `ENCRYPTION_KEY` | Key for encrypting sensitive data (32+ characters) |

### Application URLs

| Secret Name | Description |
|-------------|-------------|
| `PRODUCTION_DOMAIN` | Your production domain for CORS |
| `PUBLIC_URL` | Public URL for email links |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

---

## Troubleshooting

### "Authentication unavailable" Error

This means Supabase is not configured. Add these secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then restart the application.

### "Missing environment variables" Error

The application will show which variables are missing in the console. Add them to Replit Secrets and restart.

### Database/API Errors (500)

If you see 500 errors for API calls:
1. Check that all Supabase secrets are correct
2. Ensure your Supabase database has the required tables
3. Check the console for specific error messages

### Application Won't Start

1. Check the console for error messages
2. Verify all required secrets are added
3. Try clicking "Run" again

---

## Environment Variable Reference

See `.env.example` for a complete list of all environment variables with descriptions.

---

## Auto-Provided Variables

These are automatically provided by Replit and should NOT be set manually:

- `NODE_ENV` - Set based on environment
- `DATABASE_URL` - Provided by Replit PostgreSQL
- `REPLIT_CONNECTORS_HOSTNAME` - Provided by Replit
- `REPL_IDENTITY` - Provided by Replit

---

## Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Once created, go to **Project Settings** > **API**
4. Copy the values:
   - **Project URL** → Use for `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** → Use for `VITE_SUPABASE_ANON_KEY`
   - **service_role** → Use for `SUPABASE_SERVICE_ROLE_KEY`

---

## Questions?

If you encounter issues not covered here, check the console logs for specific error messages. The application is designed to provide helpful error messages when configuration is missing.
