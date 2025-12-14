# Choice Properties - Full Stack Real Estate Application

## Project Overview
A full-stack real estate platform built with React, Express, and Supabase. The application allows users to browse properties, submit applications, manage inquiries, and complete full lease workflows with digital signatures and move-in coordination.

## Tech Stack
- **Frontend:** React 19, Vite, TailwindCSS, Shadcn UI
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth (JWT-based)
- **State Management:** React Query, Context API
- **Routing:** Wouter

## Project Structure

```
project/
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ui/       # Shadcn UI components
│   │   │   ├── timeline.tsx    # Lease timeline component
│   │   │   └── ...       # Feature components
│   │   ├── pages/        # Page components
│   │   │   ├── tenant-lease-dashboard.tsx
│   │   │   ├── landlord-lease-dashboard.tsx
│   │   │   └── ...
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and services
│   │   ├── data/         # Mock data
│   │   ├── index.css     # Global styles
│   │   └── main.tsx      # Entry point
│   └── index.html
├── server/                 # Backend Express application
│   ├── db/               # Database setup SQL files
│   ├── app.ts            # Express app configuration
│   ├── routes.ts         # API route handlers
│   ├── auth-middleware.ts # Authentication middleware
│   ├── storage.ts        # Database service layer
│   ├── index-dev.ts      # Development entry point
│   └── index-prod.ts     # Production entry point
├── shared/                # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── migrations/            # Database migrations
├── scripts/              # Utility scripts (seeding, etc.)
├── public/               # PWA manifest and meta files
└── package.json          # Project dependencies

```

## Key Features

### Authentication
- User signup/login with email and password
- JWT-based token authentication
- Role-based access control (user, agent, admin)
- Automatic user record creation on signup via Supabase trigger

### Properties
- Browse active property listings
- Filter by location, price, bedrooms, property type
- View detailed property information with images
- Save favorite properties
- Submit rental applications

### Lease Management (NEW)
- **Lease Preparation:** Landlord creates lease documents
- **Lease Delivery:** Send lease to tenant for review
- **Lease Acceptance:** Tenant accepts/declines lease terms
- **Digital Signatures:** Both parties sign lease electronically
- **Move-In Preparation:** Set key pickup, access codes, utilities, checklist
- **Lease Dashboards:** Real-time status tracking for both parties

### Lease Dashboards (NEW)
**Tenant Lease Dashboard** (`/tenant-lease-dashboard`):
- Visual lease status timeline
- Download signed lease documents
- Move-in readiness information
- Interactive move-in checklist
- Access codes and key pickup details

**Landlord Lease Dashboard** (`/landlord-lease-dashboard`):
- Lease pipeline overview with stats
- Applications grouped by status
- Tenant information and contact
- Visual timeline for each lease
- Quick action buttons

### Inquiries & Reviews
- Submit inquiries about properties
- View and manage property reviews (1-5 stars)
- Submit reviews for properties you've viewed

### User Management
- User profiles with customizable information
- Agent profiles visible to public
- Admin panel for managing all content
- Saved searches for properties

### Security
- Row Level Security (RLS) policies on all tables
- Rate limiting on auth and sensitive endpoints
- Encrypted database connections
- Secure session management

### Payment Audit & Safeguards (NEW)
- **Full Audit Trail:** All payment actions are logged with actor, timestamp, and action type
  - `payment_created` - When a payment record is generated
  - `payment_marked_paid` - When tenant marks payment as paid
  - `payment_verified` - When landlord/admin verifies payment
  - `payment_marked_overdue` - When payment becomes overdue
  - `payment_delete_blocked` - When deletion is attempted (blocked)
- **Role-Based Access Control:**
  - Only tenants can mark their own payments as paid
  - Only landlords/admins can verify payments
  - Only admins, landlords, and property managers can view audit logs
- **Payment Deletion Prevention:** Payments cannot be deleted for financial accountability
- **Audit Log Endpoint:** `GET /api/payments/audit-logs` for viewing payment history

### Property Manager Role Foundation (NEW)
- **New Role:** `property_manager` with 60 level hierarchy (same as landlord)
- **Permission Groups:**
  - `view_properties` - View assigned properties
  - `manage_applications` - Manage tenant applications
  - `manage_leases` - Handle lease documents and signatures
  - `manage_payments` - Process and verify payments
  - `manage_maintenance` - Track maintenance issues (future)
  - `messaging_access` - Communication with tenants/landlords
- **Scoped Access:**
  - Property managers can ONLY access properties explicitly assigned to them via `property_manager_assignments` table
  - Assignments include granular permission control per property
  - Revoked assignments are tracked with `revokedAt` timestamp
- **Authorization Functions:**
  - `isPropertyManagerForProperty()` - Check if manager is assigned to property
  - `canAccessProperty()` - Unified access control across all roles

## Environment Variables

Required environment variables (see `.env.example`):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key for frontend
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for server operations
- `NODE_ENV` - development or production

Optional:
- `SENDGRID_API_KEY` - For email notifications
- `RATE_LIMITING_ENABLED` - Enable rate limiting

## Database Schema

### Tables
1. **users** - User accounts with roles (user, agent, admin)
2. **properties** - Property listings with details and amenities
3. **applications** - Rental applications with multi-step process
4. **leaseSignatures** - Digital signature tracking for leases
5. **inquiries** - Contact inquiries about properties
6. **reviews** - User reviews for properties
7. **favorites** - Saved properties per user
8. **requirements** - User property search criteria
9. **saved_searches** - Saved property searches
10. **newsletter_subscribers** - Email newsletter subscriptions
11. **contact_messages** - General contact form submissions

### Lease-Related Fields in Applications Table
- `leaseStatus` - Current lease stage (draft, lease_preparation, lease_sent, lease_accepted, lease_signed, move_in_ready, completed)
- `leaseVersion` - Lease document version number
- `leaseSentAt` - When lease was sent to tenant
- `leaseAcceptedAt` - When tenant accepted lease
- `leaseSignedAt` - When both parties signed
- `moveInDate` - Scheduled move-in date
- `moveInInstructions` - Key pickup, access codes, utilities, checklist

### Security
- All tables have Row Level Security (RLS) enabled
- 22+ RLS policies for fine-grained access control
- Automatic user sync trigger from auth.users to public.users
- Storage buckets for property images, profile images, and documents

## Running the Application

### Development
```bash
npm run dev
```
- Starts Express backend on port 5000
- Starts Vite frontend on port 5000 (same server)
- Hot reload enabled for both frontend and backend

### Production Build
```bash
npm run build
npm run start
```

### Type Checking
```bash
npm run check
```

### Database Operations
```bash
npm run db:push     # Push schema changes to database
npm run seed        # Run database seeding script
```

## API Documentation

### Lease Endpoints

**Lease Preparation (4)**
- `POST /api/applications/:applicationId/lease-draft` - Create/update draft lease
- `GET /api/applications/:applicationId/lease-draft` - Get draft lease
- `PATCH /api/applications/:applicationId/lease-draft` - Update draft (blocked after acceptance)
- `GET /api/applications/:applicationId/lease-draft/history` - Get version history

**Lease Delivery (4)**
- `POST /api/applications/:applicationId/lease-draft/send` - Send lease to tenant
- `GET /api/applications/:applicationId/lease` - Get tenant's lease
- `POST /api/applications/:applicationId/lease/accept` - Tenant accepts lease
- `POST /api/applications/:applicationId/lease/decline` - Tenant declines lease

**Digital Signatures (4)**
- `PATCH /api/applications/:applicationId/lease-draft/signature-enable` - Enable signatures
- `POST /api/applications/:applicationId/lease/sign` - Sign lease electronically
- `POST /api/applications/:applicationId/lease/countersign` - Countersign lease
- `GET /api/applications/:applicationId/lease/signatures` - Get signature records

**Move-In Preparation (3)**
- `POST /api/applications/:applicationId/move-in/prepare` - Set move-in details
- `GET /api/applications/:applicationId/move-in/instructions` - Get move-in info
- `PATCH /api/applications/:applicationId/move-in/checklist` - Update checklist

## Development Guidelines

### Frontend
- Use `wouter` for routing
- Use React Query (`@tanstack/react-query`) for data fetching
- Use Shadcn UI components for consistent styling
- Use React Hook Form for form management
- Add `data-testid` to interactive elements
- Timeline component at `client/src/components/timeline.tsx`

### Backend
- Keep routes thin - use storage service layer
- Validate all inputs with Zod schemas
- Use `authenticateToken` middleware for protected routes
- Use `requireRole` middleware for role-based access
- Cache user roles for performance

### Database
- Use Drizzle ORM for type-safe queries
- Define schemas in `shared/schema.ts`
- Create insert schemas with Zod validation
- Use migrations for structural changes

## Deployment

The project is configured for Replit deployment:
- **Build:** `npm run build` (compiles TypeScript, bundles frontend)
- **Run:** `npm run start` (starts Express production server)
- **Type:** Autoscale (stateless web application)

## User Roles

### User (Renter)
- Browse properties
- Submit rental applications
- View and submit reviews
- Save favorite properties
- Track saved searches
- **Access:** `/tenant-lease-dashboard` - Track lease status

### Agent
- Manage property listings
- View inquiries about properties
- View property requirements from other users
- Manage application status

### Landlord
- Create and manage leases
- Send lease documents
- Review tenant signatures
- Set move-in details
- **Access:** `/landlord-lease-dashboard` - Monitor lease pipeline

### Admin
- Access admin panel
- Manage all users and properties
- View all applications and inquiries
- Manage platform settings
- View all reviews and content

## Recent Changes (December 13, 2025)

### Phase 7: Lease Dashboards & Timeline
✅ Timeline component created with status indicators
✅ Tenant Lease Dashboard with visual timeline
✅ Landlord Lease Dashboard with pipeline view
✅ Move-in readiness information display
✅ Interactive checklist functionality
✅ Real-time data fetching with React Query
✅ Role-based access control

### Phase 6: Move-In Preparation
✅ User notification preferences table added with preference controls
✅ Property notifications table added for property-related events
✅ Support for email, in-app, and SMS notification channels
✅ Notification types: new applications, status updates, property saved, lease reminders

## Useful Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:5000)
npm run dev

# Type checking
npm run check

# Production build
npm run build

# Start production server
npm run start

# Push database schema changes
npm run db:push

# Seed database with sample data
npm run seed
```

## Notes

- The application uses Supabase for all backend services
- Authentication is handled entirely by Supabase
- Database queries are cached for performance optimization
- Rate limiting is enabled in production to prevent abuse
- All sensitive data is encrypted and requires authentication
- Email notifications use SendGrid (optional)
- Lease workflow includes complete digital signature support
- Dashboards provide real-time progress tracking

## Next Steps

1. Test lease dashboard functionality
2. Verify real-time updates with React Query
3. Test move-in instruction display
4. Create sample leases and track through pipeline
5. Deploy to production when ready
