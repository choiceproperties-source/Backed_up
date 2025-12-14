# Choice Properties - Data Flow Specification

This document details how data moves through the system at each stage of major workflows.

## 1. User Registration & Authentication

### Registration Flow
```
┌──────────────────────┐
│  Signup Form         │
│ (email, password)    │
└──────────┬───────────┘
           │ POST /api/auth/signup
           ▼
┌──────────────────────────────────────┐
│  Backend Validation                  │
│  └─ signupSchema.safeParse()         │
└──────────┬───────────────────────────┘
           │ If invalid → 400 error
           │ If valid ↓
┌──────────────────────────────────────┐
│  Supabase Auth.admin.createUser()    │
│  └─ Email, password, metadata        │
└──────────┬───────────────────────────┘
           │ If user exists → 400 error
           │ If success ↓
┌──────────────────────────────────────┐
│  Create User Record in users table   │
│  └─ id, email, role, created_at      │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Return JWT + User object to client  │
└──────────────────────────────────────┘
```

### Authentication Flow
```
┌──────────────────────┐
│  Login Form          │
│ (email, password)    │
└──────────┬───────────┘
           │ POST /api/auth/login
           ▼
┌──────────────────────────────────────┐
│  Backend Validation                  │
│  └─ loginSchema.safeParse()          │
└──────────┬───────────────────────────┘
           │ If valid ↓
┌──────────────────────────────────────┐
│  Supabase Auth.signInWithPassword()  │
└──────────┬───────────────────────────┘
           │ Returns JWT + session
           ▼
┌──────────────────────────────────────┐
│  Client stores JWT in localStorage   │
│  └─ Authorization: Bearer <token>    │
└──────────────────────────────────────┘
```

### Protected Route Access
```
┌────────────────────────────────┐
│  Frontend sends API request    │
│  Header: Authorization: Bearer │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  authenticateToken middleware      │
│  └─ Extract token from header      │
│  └─ Verify JWT signature           │
│  └─ Extract user from token        │
└────────────┬───────────────────────┘
             │ If invalid → 401 error
             │ If valid → req.user set
             ▼
┌────────────────────────────────────┐
│  Route handler executes with auth  │
└────────────────────────────────────┘
```

## 2. Property Browsing & Search

### Property List Flow
```
┌──────────────────────────────────────┐
│  Frontend: useQuery('properties')    │
│  Params: city, price, bedrooms, etc  │
└──────────┬──────────────────────────┘
           │ GET /api/properties?...
           ▼
┌──────────────────────────────────────┐
│  Backend Cache Check                 │
│  Key: properties:{filters}:{page}    │
└──────────┬──────────────────────────┘
           │ If cached → Return cached
           │ If not cached ↓
┌──────────────────────────────────────┐
│  Supabase Query                      │
│  └─ SELECT * FROM properties         │
│  └─ WHERE status = 'active'          │
│  └─ ORDER BY created_at DESC         │
│  └─ LIMIT 20 OFFSET (page-1)*20      │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Store in Cache (TTL: 5 min)         │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Return to Frontend                  │
│  {                                   │
│    properties: [...],                │
│    pagination: {                     │
│      page, limit, total,             │
│      totalPages, hasNext, hasPrev    │
│    }                                 │
│  }                                   │
└──────────────────────────────────────┘
```

### Property Detail Flow
```
┌──────────────────────────────────────┐
│  Frontend: useQuery('property', id)  │
└──────────┬──────────────────────────┘
           │ GET /api/properties/{id}
           ▼
┌──────────────────────────────────────┐
│  Check Cache                         │
│  Key: property:{id}                  │
└──────────┬──────────────────────────┘
           │ If cached → Return cached
           │ If not cached ↓
┌──────────────────────────────────────┐
│  Supabase Query                      │
│  └─ SELECT * FROM properties         │
│  └─ WHERE id = {id}                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Increment View Count (RPC)          │
│  └─ increment_property_views()       │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Generate Image Signed URLs          │
│  └─ For each image in images array   │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Return Property + Images            │
└──────────────────────────────────────┘
```

## 3. Application Submission

### Multi-Step Application Flow
```
┌──────────────────────────────┐
│  Step 1: Personal Info       │
│  └─ Name, phone, email       │
└──────────┬───────────────────┘
           │ Save draft
           ▼
┌──────────────────────────────────────┐
│  POST /api/applications               │
│  Body: {                             │
│    propertyId, userId,               │
│    step: 1,                          │
│    personalInfo: {...},              │
│    status: 'draft'                   │
│  }                                   │
└──────────┬──────────────────────────┘
           │ Validate with insertApplicationSchema
           │ Check property exists
           ▼
┌──────────────────────────────────────┐
│  INSERT into applications table      │
│  └─ Generates UUID id                │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Frontend stores applicationId       │
│  └─ Used for subsequent steps        │
└──────────────────────────────────────┘
```

### Application Payment Verification
```
┌────────────────────────────────────────┐
│  Application Status = pending_payment  │
│  applicationFee = $45.00               │
└────────────┬───────────────────────────┘
             │
             ├─ Option A: Online Payment ─┐
             │                            │
             │  POST /api/payments         │
             │  └─ Process via Stripe     │
             │  └─ Returns paymentStatus  │
             │  └─ Updates application    │
             │  └─ Logs to audit trail    │
             │
             ├─ Option B: Manual Payment ┐
             │                           │
             │  POST /api/payments/verify │
             │  └─ Landlord verifies     │
             │  └─ Requires auth role    │
             │  └─ Records verification  │
             │  └─ Logs to audit trail   │
             │
             ▼
┌────────────────────────────────────────┐
│  Update Application                    │
│  └─ paymentStatus = 'paid'             │
│  └─ paymentPaidAt = now()              │
│  └─ status = 'submitted'               │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│  Notify Owner                          │
│  └─ Email: "New Application"           │
│  └─ In-App: Application received       │
└────────────────────────────────────────┘
```

## 4. Lease Management Workflow

### Lease Creation & Sending
```
┌──────────────────────────────────────┐
│  Landlord creates lease draft        │
│  POST /api/applications/.../         │
│    lease-draft                       │
│  Body:                               │
│  {                                   │
│    leaseContent: "...",              │
│    terms: {...},                     │
│    moveInDate: "2024-01-15"          │
│  }                                   │
└──────────┬──────────────────────────┘
           │ Validate draft schema
           ▼
┌──────────────────────────────────────┐
│  INSERT/UPDATE lease_drafts table    │
│  └─ leaseVersion = 1                 │
│  └─ status = 'draft'                 │
└──────────┬──────────────────────────┘
           │
           ├─ Allow editing until sent
           │
           │ POST /api/applications/.../
           │   lease-draft/send
           │
           ▼
┌──────────────────────────────────────┐
│  Send Lease to Tenant                │
│  └─ Update leaseSentAt               │
│  └─ Change status to lease_sent      │
│  └─ Lock draft from further edits    │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Notify Tenant                       │
│  POST /api/notifications             │
│  Type: lease_sent                    │
│  Channel: email, in-app              │
└──────────────────────────────────────┘
```

### Lease Acceptance & Signatures
```
┌──────────────────────────────────────┐
│  Tenant reviews lease                │
│  Options:                            │
│  1. Accept → lease_accepted          │
│  2. Decline → lease_declined         │
└──────────┬──────────────────────────┘
           │
           ├─ Accept Path
           │  POST /api/applications/.../
           │    lease/accept
           │  └─ leaseAcceptedAt = now()
           │  └─ status = lease_accepted
           │
           ├─ Decline Path
           │  POST /api/applications/.../
           │    lease/decline
           │  └─ leaseDeclineReason = text
           │  └─ status = lease_declined
           │  └─ Notify landlord
           │
           ▼
┌──────────────────────────────────────┐
│  If Accepted: Enable Signatures      │
│  POST /api/applications/.../         │
│    lease-draft/signature-enable      │
│  └─ signatureRequired = true          │
│  └─ Create signature records          │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Digital Signature Flow              │
│  └─ Tenant signs first               │
│  └─ Landlord countersigns            │
│  └─ Both signatures recorded          │
└──────────────────────────────────────┘
```

## 5. Image Upload & Management

### Image Upload Pipeline
```
┌────────────────────────────────┐
│  User selects image file       │
│  Frontend validation:          │
│  └─ Size < 10MB               │
│  └─ Format: jpg, png, webp    │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  POST /api/properties/.../photos   │
│  Content-Type: multipart/form-data │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  Backend Validation                │
│  └─ authenticateToken              │
│  └─ requireOwnership                │
│  └─ checkPropertyImageLimit()       │
│  └─ validateFileSize()              │
└────────────┬───────────────────────┘
             │ If validation fails → 400
             │ If valid ↓
┌────────────────────────────────────┐
│  ImageKit Upload                   │
│  └─ File stream to ImageKit        │
│  └─ Get fileId and publicURL       │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  Store URL in Supabase             │
│  └─ UPDATE properties              │
│  └─ ADD to images JSONB array      │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  Log Image Audit Event             │
│  INSERT image_audit_logs           │
│  └─ action: 'image_upload'         │
│  └─ actor: userId                  │
│  └─ timestamp: now()               │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  Invalidate Cache                  │
│  └─ property:{id}                  │
│  └─ properties:                    │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  Return signed URL to frontend     │
│  └─ URL valid for 24 hours         │
└────────────────────────────────────┘
```

## 6. Notification System

### Multi-Channel Notification Flow
```
┌──────────────────────────────────┐
│  System Event Triggered          │
│  E.g., application submitted     │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  notifyOwnerOfNewApplication()       │
│  └─ Get property owner              │
│  └─ Check notification preferences  │
└──────────┬──────────────────────────┘
           │
           ├─ Email Channel
           │  ├─ emailNewApplications = true?
           │  │  POST /api/email/send
           │  │  └─ Template: newApplicationEmail
           │  │  └─ Via SendGrid
           │  │
           │  └─ Track sent event
           │
           ├─ In-App Channel
           │  ├─ inAppNotifications = true?
           │  │  INSERT application_notifications
           │  │  └─ type: 'new_application'
           │  │  └─ status: 'pending'
           │  │
           │  └─ Frontend polls endpoint
           │
           └─ SMS Channel
              └─ (Future: Twilio integration)
```

## 7. Audit Logging

### Comprehensive Audit Trail
```
Every sensitive action creates audit log:

┌────────────────────────────┐
│  User Action Occurs        │
│  E.g., application update  │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  logApplicationChange()            │
│  INSERT audit_logs                 │
│  {                                 │
│    actor_id: userId,               │
│    resource: 'application',        │
│    action: 'update_status',        │
│    changes: {...},                 │
│    timestamp: now(),               │
│    metadata: {...}                 │
│  }                                 │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  Audit Log Stored                  │
│  └─ Immutable (append-only)        │
│  └─ Queryable by admin             │
│  └─ Indexed by timestamp           │
└────────────────────────────────────┘
```

## 8. Rate Limiting

### Request Throttling
```
┌──────────────────────────────┐
│  Incoming Request            │
│  E.g., POST /api/auth/login  │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Rate Limiter Check              │
│  Using: express-rate-limit       │
│  Key: req.ip or req.user.id      │
└──────────┬───────────────────────┘
           │
           ├─ Within limit
           │  └─ Proceed to handler
           │
           └─ Limit exceeded
              └─ Return 429 Too Many Requests
              └─ Include Retry-After header
```

## 9. Caching Strategy

### Cache Hierarchy
```
Request comes in
│
├─ React Query Cache (Client)
│  ├─ Query result cached
│  ├─ Stale time: varies by query
│  └─ Invalidated on mutations
│
├─ Express In-Memory Cache (Server)
│  ├─ Property lists: 5 min TTL
│  ├─ Property detail: 10 min TTL
│  ├─ User profiles: 30 min TTL
│  └─ Manually invalidated on updates
│
├─ ImageKit CDN (Images)
│  ├─ Signed URLs: 24 hour TTL
│  └─ Browser cache headers
│
└─ Supabase Connection Pool
   └─ Actual database queries

Cache Invalidation on Write:
┌─────────────────────────────┐
│ PATCH /api/properties/{id}  │
└────────┬────────────────────┘
         │
         ├─ Update database
         │
         ├─ Invalidate property:{id}
         │  └─ Remove from server cache
         │
         ├─ Invalidate properties:*
         │  └─ Remove all list results
         │
         └─ Frontend useMutation()
            └─ React Query auto-refetch
```

## Request/Response Lifecycle

### Complete Request Flow
```
1. Client Sends Request
   ├─ URL: GET /api/properties?city=NYC
   ├─ Headers: { Authorization: Bearer <token> }
   └─ Body: {} or {...}

2. Express Receives Request
   ├─ Parse URL + Query params
   ├─ Parse headers
   └─ Parse body (JSON/multipart)

3. Middleware Stack
   ├─ CORS handling
   ├─ Body parser
   ├─ authenticateToken
   ├─ Rate limiter
   └─ Error handler

4. Route Handler
   ├─ Cache check
   ├─ Validation (Zod)
   ├─ Database query
   ├─ Cache store
   └─ Response formatting

5. Response Sent
   ├─ Status code (200, 400, 401, 500, etc)
   ├─ Headers (Content-Type, Cache-Control)
   └─ Body: { success: true/false, data/error, message }

6. Frontend Receives
   ├─ React Query processes
   ├─ Updates state
   ├─ Re-renders components
   └─ User sees updated UI
```
