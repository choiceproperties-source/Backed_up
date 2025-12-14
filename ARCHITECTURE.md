# Choice Properties - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER/CLIENT                        │
├─────────────────────────────────────────────────────────────┤
│ React 19 + Vite (Port 5000)                                │
│ ├─ Pages (Routing with Wouter)                             │
│ ├─ Components (Shadcn UI + Custom)                         │
│ ├─ Hooks (Custom + React Query)                            │
│ └─ Services (API calls via queryClient)                    │
├─────────────────────────────────────────────────────────────┤
│                   API GATEWAY (Express.js)                   │
│                     (Same Port 5000)                         │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND LOGIC LAYER                       │
│ ├─ Authentication Middleware                               │
│ ├─ Rate Limiting                                           │
│ ├─ Image Management                                        │
│ ├─ Email Service                                           │
│ ├─ Notification Service                                    │
│ ├─ Security & Audit Logging                               │
│ ├─ Caching Layer                                           │
│ └─ Input Validation (Zod Schemas)                         │
├─────────────────────────────────────────────────────────────┤
│           SUPABASE (PostgreSQL + Auth + Storage)            │
│ ├─ 30+ Relational Tables with RLS Policies                │
│ ├─ JWT-Based Authentication                                │
│ ├─ Image & Document Storage Buckets                        │
│ └─ Audit Logging Tables                                    │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### 1. Frontend (React/Vite)
**Location:** `client/src/`
- **Pages:** Multi-page SPA with role-based routing
  - Public: Home, property search, property details
  - Tenant: Applications, lease dashboard, profile
  - Landlord: Property management, lease dashboard, applications
  - Admin: Platform administration
- **Components:** Reusable UI components from Shadcn UI + custom components
- **State Management:** React Query for server state, Context API for client state
- **API Communication:** Custom queryClient with baseURL pointing to backend

### 2. Backend (Express.js)
**Location:** `server/`
- **Entry Points:** `index-dev.ts` (development), `index-prod.ts` (production)
- **Router:** `routes.ts` - 100+ endpoints organized by domain
- **Middleware:**
  - `auth-middleware.ts` - JWT verification, role-based access
  - `rate-limit.ts` - Request throttling
- **Services:**
  - `image-management.ts` - Photo upload/delete/reorder
  - `email.ts` - SendGrid integration
  - `notification-service.ts` - Multi-channel notifications
  - `cache.ts` - In-memory caching with TTL
- **Security:**
  - `security/routes.ts` - 2FA, password reset, account security
  - `security/audit-logger.ts` - Comprehensive audit trail
  - `image-audit.ts` - Track all image operations
- **External Services:**
  - `supabase.ts` - Supabase client initialization
  - `imagekit.ts` - Image optimization and CDN

### 3. Database Layer (Supabase PostgreSQL)
**Location:** `shared/schema.ts`
- **Entities:** 30+ tables covering all business domains
- **Auth:** Supabase Auth with JWT tokens
- **Storage:** Buckets for property images, documents, profiles
- **Security:** Row Level Security (RLS) on all tables with 22+ policies

### 4. Shared Layer
**Location:** `shared/schema.ts`
- **Type Definitions:** Drizzle ORM table schemas
- **Zod Schemas:** Validation schemas for all inputs
- **Type Exports:** Insert, Select, and custom types for type safety
- **Constants:** Business logic constants (statuses, transitions, etc.)

## Data Flow Patterns

### Pattern 1: Read Operations
```
React Component → useQuery() → Express GET → Supabase SELECT → Cache/Response
```
- Uses React Query caching for optimal performance
- Server-side cache layer reduces database hits
- ETag support for conditional requests

### Pattern 2: Write Operations
```
React Form → useMutation() → Express POST/PATCH → Zod Validation → Supabase INSERT/UPDATE → Cache Invalidation → Revalidate
```
- Validation happens server-side (not client)
- Atomic operations with proper error handling
- Cache invalidation ensures consistency

### Pattern 3: Authentication Flow
```
Signup/Login → Supabase Auth → JWT Token → localStorage → includeCredentials → API Requests → authenticateToken Middleware → req.user
```
- JWTs stored in localStorage (frontend)
- Verified on every protected route
- User context extracted into req.user for authorization

### Pattern 4: Real-Time Notifications
```
Database Event → notification-service.ts → SendGrid/In-App → React Query Refetch
```
- Server-side events trigger notifications
- Multiple channels: email, in-app
- Preference-based filtering per user

## Authentication & Authorization

### JWT-Based Auth
- **Provider:** Supabase Auth (OpenID standard)
- **Token Storage:** localStorage (frontend)
- **Verification:** `authenticateToken` middleware extracts user from JWT
- **Scoping:** User ID embedded in token for ownership verification

### Role-Based Access Control (RBAC)
- **Roles:** user, agent, landlord, admin, property_manager
- **Enforcement Points:**
  - Frontend: Conditional rendering, route protection
  - Backend: `requireRole()` middleware on sensitive routes
  - Database: RLS policies check user role and ownership

### Ownership Verification
- `requireOwnership(resource)` middleware ensures users can only modify their own resources
- Checks: User ID matches owner ID in database
- Used on: property updates, application management, lease operations

## Caching Strategy

### Frontend (React Query)
- **Query Caching:** Automatic with configurable TTL per query type
- **Invalidation:** Triggered after mutations
- **Persistence:** Optional localStorage syncing for offline support

### Backend (In-Memory Cache)
- **Location:** `server/cache.ts`
- **TTL Configuration:** Different TTLs for different data types
- **Invalidation:** Manual invalidation on write operations
- **Cache Keys:** Hierarchical keys for fine-grained invalidation

```typescript
CACHE_TTL = {
  PROPERTIES_LIST: 5 * 60 * 1000,      // 5 minutes
  PROPERTY_DETAIL: 10 * 60 * 1000,     // 10 minutes
  USER_PROFILE: 30 * 60 * 1000,        // 30 minutes
}
```

## Error Handling

### Frontend
- React Query error states with retry logic
- Toast notifications for user feedback
- Graceful fallbacks for failed requests

### Backend
- Zod schema validation with detailed error messages
- Try-catch blocks with specific error handling
- Consistent error response format: `{ error: "message" }`
- HTTP status codes follow REST conventions

### Database
- RLS policy violations return 403 Forbidden
- Constraint violations return 400 Bad Request
- Connection errors return 503 Service Unavailable

## Security Mechanisms

### Input Validation
- **Schema Validation:** Zod schemas validate all inputs before processing
- **File Upload Limits:** MAX_FILE_SIZE_MB = 10, MAX_IMAGES_PER_PROPERTY = 20
- **Rate Limiting:** Endpoints throttled to prevent abuse
- **SQL Injection:** Impossible with Supabase parameterized queries

### Data Protection
- **Row Level Security:** Database-level access control
- **Encryption:** All connections use HTTPS/TLS
- **Secrets Management:** Environment variables stored securely
- **Audit Logging:** All sensitive operations logged with user context

### API Security
- **CORS:** Configured for same-origin requests
- **CSRF:** Express session tokens prevent cross-site attacks
- **XSS:** React escapes content by default
- **Rate Limiting:** Prevents brute force and DOS attacks

### 2FA & Account Security
- **Two-Factor Auth:** TOTP-based with backup codes
- **Password Reset:** Secure token-based reset flow
- **Session Management:** Automatic logout after inactivity
- **Login Attempts:** Account lockout after failed attempts

## Image Management System

### Upload Pipeline
```
1. Client selects image
2. Frontend validation (size, format)
3. Express receives image
4. ImageKit optimization
5. Store signed URL in database
6. Audit log created
7. Cache invalidated
```

### Image Features
- **Optimization:** ImageKit handles resizing, compression
- **CDN:** ImageKit provides global CDN for fast delivery
- **Signed URLs:** Time-limited access to prevent direct storage access
- **Privacy:** Private images only accessible by authorized users
- **Audit Trail:** Every upload, delete, replace operation logged

## Payment Flow Architecture

### Application Fee Collection
```
1. Application Created (fee calculated)
2. Payment Pending → Awaiting Payment
3. User Pays → Payment Verified
4. Application Proceeds → Status Changes
```

### Payment Verification Methods
- **Automatic:** Stripe/PayPal processing
- **Manual:** Landlord verifies offline payments (check, cash, transfer)
- **Audit:** All verification actions logged with timestamp and actor

## Lease Management Workflow

### Multi-Step Process
```
1. Draft → Landlord creates lease
2. Send → Landlord sends to tenant
3. Accept/Decline → Tenant reviews and responds
4. Signature → Both parties sign digitally
5. Move-In → Set access details and checklist
6. Complete → Move-in finished
```

### State Transitions
- **Directed Graph:** Only valid transitions allowed
- **Validation:** Database constraints prevent invalid states
- **Audit:** Every state change recorded with reason and actor
- **Notifications:** Both parties notified at each step

## Database Schema Organization

### Core Entity Groups

**User Management**
- `users` - User accounts and profiles
- `agencies` - Real estate agencies
- `user_notification_preferences` - Communication preferences

**Property Management**
- `properties` - Listings with full details
- `property_questions` - Custom application questions
- `property_notes` - Internal notes and observations
- `property_notifications` - Property-level events

**Application Workflow**
- `applications` - Full rental applications
- `co_applicants` - Additional applicants
- `application_comments` - Internal notes and decisions
- `application_notifications` - Status change notifications

**Lease Management**
- `lease_templates` - Pre-defined lease templates
- `lease_drafts` - Draft leases with versioning
- `lease_signatures` - Digital signature records
- `lease_documents` - Signed document storage

**Payment & Finance**
- `payments` - Rent payments and tracking
- `payment_audit_logs` - Financial audit trail
- `transactions` - Financial transactions

**Content & Engagement**
- `reviews` - Property and agent reviews
- `favorites` - User saved properties
- `saved_searches` - Bookmarked searches
- `newsletter_subscribers` - Email list
- `contact_messages` - Contact form submissions

**System**
- `admin_settings` - Platform configuration
- `audit_logs` - System-wide action tracking
- `image_audit_logs` - Image operation tracking

## Performance Optimizations

### Query Optimization
- **Indexes:** Created on frequently queried columns (user_id, property_id, status)
- **Pagination:** All list endpoints support pagination
- **Selective Columns:** Only request needed columns
- **Connection Pooling:** Supabase handles connection management

### Caching Strategy
- **Frontend Cache:** React Query caches all queries
- **Server Cache:** In-memory cache for expensive operations
- **Browser Cache:** Static assets cached with versioning
- **CDN Cache:** Images served through ImageKit CDN

### Code Splitting
- **Frontend:** Vite automatically splits routes into chunks
- **Backend:** Single Express server, no code splitting needed
- **Bundle:** esbuild produces optimized production bundle

## Deployment Architecture

### Development Environment
- **Backend:** `npm run dev` starts Express with hot reload
- **Frontend:** Vite dev server with HMR
- **Database:** Local Supabase instance or dev project
- **Tools:** TypeScript, tsx for running TS directly

### Production Environment
- **Build:** `npm run build` produces:
  - `dist/` - Compiled backend
  - `dist/client` - Bundled frontend
- **Run:** `npm run start` starts single Node.js process
- **Port:** 5000 (frontend and backend on same server)
- **Node Version:** 20+

## Future Architecture Considerations

### Scalability
- **Horizontal:** Stateless backend allows multiple instances behind load balancer
- **Database:** Supabase handles scaling automatically
- **CDN:** ImageKit provides global distribution
- **Cache:** Consider Redis for multi-instance deployments

### Monitoring
- **Logs:** Implement centralized logging (e.g., ELK stack)
- **Metrics:** Track API response times, error rates
- **Alerts:** Set up alerts for critical errors
- **APM:** Consider APM tool like New Relic or DataDog

### Security Evolution
- **API Keys:** Rotate regularly
- **2FA:** Consider mandatory 2FA for admins
- **Encryption:** At-rest encryption for sensitive data
- **DDoS Protection:** Consider WAF for public APIs

## Dependency Management

### Critical Dependencies
- **supabase-js** - Database and auth client (security updates important)
- **express** - Web framework (security patches)
- **react** - UI framework (compatibility important)
- **zod** - Validation (data integrity)

### Monitoring for Updates
- `npm outdated` - Check for available updates
- `npm audit` - Security vulnerability scanning
- Regular dependency reviews quarterly
