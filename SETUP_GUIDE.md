# Setup Guide - Choice Properties

A step-by-step guide to get the Choice Properties application running locally.

## Prerequisites

- Node.js 20+
- npm or yarn
- A Supabase account (free tier works)

## Step 1: Clone and Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once created, go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **Anon public key** → `SUPABASE_ANON_KEY`
   - **Service role key** → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and paste your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NODE_ENV=development
   ```

## Step 4: Set Up Database

1. Go to your Supabase dashboard → **SQL Editor**
2. Copy the entire contents of `server/db/complete-setup.sql`
3. Paste and execute in the Supabase SQL Editor
4. Wait for the setup to complete (should show success with no errors)

## Step 5: Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5000
- **Backend:** http://localhost:5000/api

## Step 6: Test Authentication

1. Open the app in your browser (http://localhost:5000)
2. Click "Sign Up"
3. Create a test account with:
   - Email: `test@example.com`
   - Password: `testpassword123`
   - Full Name: `Test User`
4. You should be logged in and see the dashboard

## Verify Everything Works

### Test Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Properties
```bash
curl http://localhost:5000/api/properties
```

## Common Issues & Solutions

### Issue: "Error: SUPABASE_URL is missing"
**Solution:** Make sure your `.env.local` file exists and has the correct values. Restart `npm run dev` after setting environment variables.

### Issue: "database error" on signup
**Solution:** 
1. Check that the SQL setup ran successfully in Supabase
2. Verify SUPABASE_SERVICE_ROLE_KEY is correct
3. Go to Supabase → SQL Editor → run `SELECT * FROM users;` to verify table exists

### Issue: "references" syntax error
**Solution:** This has been fixed in `complete-setup.sql`. Make sure you're using the updated file.

### Issue: Blank page / 404
**Solution:**
1. Make sure backend is running (`npm run dev`)
2. Check browser console for errors (F12 → Console tab)
3. Verify port 5000 is not already in use

## Database Management

### View Database Status
In Supabase dashboard:
1. Go to **SQL Editor**
2. Run: `SELECT COUNT(*) as user_count FROM users;`
3. Run: `SELECT COUNT(*) as property_count FROM properties;`

### Reset Database (if needed)
⚠️ **WARNING: This deletes all data!**

In Supabase SQL Editor, run:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then re-run `complete-setup.sql`

## Development Workflow

### Making Database Changes

1. Update schema in `shared/schema.ts`
2. Run: `npm run db:push`
3. Restart dev server: `npm run dev`

### Creating Components

1. Add component to `client/src/components/`
2. Follow existing component patterns
3. Use Shadcn UI components when available

### Adding Routes

1. Add page to `client/src/pages/`
2. Register route in `client/src/App.tsx`
3. Use `wouter` for navigation

### Adding API Endpoints

1. Add route handler to `server/routes.ts`
2. Add Zod validation schema to `shared/schema.ts`
3. Use `authenticateToken` middleware if protected
4. Test with curl or Postman

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run check            # Type check with TypeScript
npm run db:push          # Sync database schema
npm run seed             # Seed database with sample data
```

## Project Structure Quick Reference

```
client/src/
  pages/      → Add new pages here
  components/ → Add new components here
  hooks/      → Add custom hooks here
  lib/        → Services, utilities, auth context

server/
  routes.ts   → Add API endpoints here
  storage.ts  → Database operations layer

shared/
  schema.ts   → Database schemas and Zod validation
```

## Next Steps

1. **Review API Documentation** - See `API_DOCUMENTATION.md`
2. **Explore Components** - Check `client/src/components/`
3. **Test Features** - Create sample properties, submit inquiries
4. **Customize** - Modify colors, text, and branding
5. **Deploy** - Use Replit's publish feature for live deployment

## Need Help?

- Check `replit.md` for project overview
- Check `API_DOCUMENTATION.md` for endpoint details
- Check existing code patterns in similar files
- Review error messages in browser console (F12)
- Check server logs in terminal

## Useful Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Express Docs](https://expressjs.com)
- [Shadcn UI Components](https://ui.shadcn.com)
- [TailwindCSS Docs](https://tailwindcss.com)

---

**Happy coding!** 🚀
