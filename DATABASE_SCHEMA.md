# Choice Properties - Database Schema Reference

## Entity Relationship Diagram Summary

```
users ──────┬─────→ properties (owner_id)
            ├─────→ applications (user_id)
            ├─────→ reviews (user_id)
            ├─────→ favorites (user_id)
            ├─────→ inquiry (agent_id)
            └─────→ requirements (user_id)

properties ─┬─────→ applications (property_id)
            ├─────→ reviews (property_id)
            ├─────→ favorites (property_id)
            ├─────→ property_questions (property_id)
            ├─────→ property_notes (property_id)
            └─────→ property_notifications (property_id)

applications ┬─────→ co_applicants (application_id)
             ├─────→ application_comments (application_id)
             ├─────→ application_notifications (application_id)
             ├─────→ lease_drafts (application_id)
             └─────→ payments (application_id)

agencies ────────→ users (agency_id)
                  properties (agency_id)
```

## Core Tables (Must Exist)

### 1. `users` - User Accounts
**Primary Key:** `id` (UUID)
**Unique Constraints:** `email`
**Relationships:**
- owns: properties
- submits: applications
- writes: reviews
- marks: favorites

**Key Fields:**
- `id` - UUID primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `full_name` - User's display name
- `phone` - Contact phone
- `role` - 'renter', 'agent', 'landlord', 'property_manager', 'admin'
- `profile_image` - Profile photo URL
- `bio` - User biography
- `agency_id` - FK to agencies (for agents/landlords)
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**RLS Policies:**
- Users can view own profile
- Agents/Landlords can view all profiles
- Admins can view/edit all

### 2. `properties` - Property Listings
**Primary Key:** `id` (UUID)
**Relationships:**
- owned by: users (owner_id)
- associated with: agencies
- has many: applications, reviews, favorites

**Key Fields:**
- `id` - UUID primary key
- `owner_id` - FK to users
- `listing_agent_id` - FK to users
- `agency_id` - FK to agencies
- `title`, `description` - Property details
- `address`, `city`, `state`, `zip_code` - Location
- `price` - Monthly rent
- `bedrooms`, `bathrooms`, `square_feet` - Size
- `property_type` - apartment, house, condo, etc.
- `amenities` - JSONB array
- `images` - JSONB array of image URLs
- `latitude`, `longitude` - Geo coordinates
- `furnished`, `pets_allowed` - Boolean flags
- `lease_term`, `utilities_included` - Lease details
- `listing_status` - draft, available, rented, etc.
- `visibility` - public, private, featured
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**RLS Policies:**
- Anyone can view public listings
- Owners can edit own properties
- Agents can manage assigned properties

### 3. `applications` - Rental Applications
**Primary Key:** `id` (UUID)
**Unique Constraints:** `user_id + property_id`
**Relationships:**
- submitted by: users
- for: properties
- has: co_applicants, comments, notifications

**Key Fields:**
- `id` - UUID primary key
- `property_id` - FK to properties
- `user_id` - FK to users
- `step` - Current step in form (0-N)
- `status` - Application status enum
- `personalInfo`, `employment`, `rentalHistory` - JSONB objects
- `documents` - JSONB array of uploaded documents
- `score` - Application score (0-100)
- `scoreBreakdown` - JSONB with detailed scoring
- `applicationFee` - Fee amount
- `paymentStatus` - pending, paid, verified
- `paymentPaidAt` - When fee was paid
- `leaseStatus` - Lease workflow status
- `customAnswers` - JSONB responses to property questions
- `created_at`, `updated_at`, `deleted_at` - Timestamps

**RLS Policies:**
- Applicants can view own applications
- Landlords can view applications for their properties
- Admins can view all

### 4. `agencies` - Real Estate Agencies
**Primary Key:** `id` (UUID)
**Relationships:**
- has many: users, properties

**Key Fields:**
- `id` - UUID primary key
- `name`, `description` - Agency info
- `logo`, `website`, `email`, `phone` - Contact
- `address`, `city`, `state`, `zip_code` - Location
- `license_number`, `license_expiry` - License info
- `commission_rate` - Default commission percentage
- `status` - active, inactive
- `owner_id` - FK to agency owner
- `created_at`, `updated_at`, `deleted_at` - Timestamps

## Lease Workflow Tables

### 5. `lease_drafts` - Lease Document Versions
**Purpose:** Track lease document versions before signing
**Relationships:** applications

**Key Fields:**
- `id` - UUID primary key
- `application_id` - FK to applications
- `lease_version` - Version number
- `lease_content` - Full lease text
- `status` - draft, ready_for_signature, signed
- `created_at`, `updated_at` - Timestamps

### 6. `lease_signatures` - Digital Signature Records
**Purpose:** Track who signed what and when
**Relationships:** applications, users

**Key Fields:**
- `id` - UUID primary key
- `application_id` - FK to applications
- `signer_id` - FK to users
- `signer_role` - tenant, landlord
- `signature_data` - Electronic signature
- `signed_at` - When signed

## Payment & Financial Tables

### 7. `payments` - Rent Payments
**Purpose:** Track all rent payments and disputes
**Relationships:** applications

**Key Fields:**
- `id` - UUID primary key
- `application_id` - FK to applications
- `amount` - Payment amount
- `dueDate` - When payment is due
- `paidAt` - When actually paid
- `status` - pending, paid, overdue
- `paymentMethod` - online, check, cash, etc.
- `created_at`, `updated_at` - Timestamps

### 8. `payment_audit_logs` - Financial Audit Trail
**Purpose:** Immutable audit trail of all payment actions
**Relationships:** users, payments

**Key Fields:**
- `id` - UUID primary key
- `actor_id` - FK to users (who performed action)
- `action` - payment_created, payment_verified, etc.
- `payment_id` - FK to payments
- `details` - JSONB with action details
- `timestamp` - When action occurred

## Notification & Communication Tables

### 9. `application_notifications` - Application Status Notifications
**Purpose:** Track what notifications were sent for each application
**Relationships:** applications

**Key Fields:**
- `id` - UUID primary key
- `application_id` - FK to applications
- `notification_type` - status_change, document_request, etc.
- `channel` - email, in_app, sms
- `content` - Notification message
- `sent_at`, `read_at` - Timestamps
- `status` - pending, sent, failed

### 10. `property_notifications` - Property Event Notifications
**Purpose:** Track property-related notifications (price changes, status updates)
**Relationships:** users, properties

**Key Fields:**
- `id` - UUID primary key
- `user_id`, `property_id` - FKs
- `notification_type` - price_changed, status_changed, etc.
- `content` - Notification message
- `status` - pending, sent, failed

### 11. `user_notification_preferences` - Notification Settings
**Purpose:** User preferences for communication channels
**Relationships:** users
**Unique:** one per user

**Key Fields:**
- `id` - UUID primary key
- `user_id` - FK to users (unique)
- `email_*` flags - Email preferences
- `in_app_notifications` - In-app toggle
- `push_notifications` - Push toggle
- `notification_frequency` - instant, daily, weekly

## Content & Engagement Tables

### 12. `reviews` - Property & User Reviews
**Purpose:** User reviews of properties and agents
**Relationships:** users, properties
**Unique:** one review per user per property

**Key Fields:**
- `id` - UUID primary key
- `property_id` - FK to properties
- `user_id` - FK to users
- `rating` - 1-5 stars
- `title` - Review title
- `comment` - Review text

### 13. `favorites` - Saved Properties
**Purpose:** Users save/bookmark properties
**Relationships:** users, properties
**Unique:** one per user per property

**Key Fields:**
- `id` - UUID primary key
- `user_id` - FK to users
- `property_id` - FK to properties
- `created_at` - When saved

### 14. `saved_searches` - Bookmarked Searches
**Purpose:** Users save filter combinations for later use
**Relationships:** users

**Key Fields:**
- `id` - UUID primary key
- `user_id` - FK to users
- `name` - Search name (e.g., "2BR in Brooklyn")
- `filters` - JSONB with search parameters
- `created_at`, `updated_at` - Timestamps

## System & Administrative Tables

### 15. `audit_logs` - Comprehensive Action Tracking
**Purpose:** Immutable log of all sensitive actions
**Relationships:** users
**Immutable:** Append-only, no deletes

**Key Fields:**
- `id` - UUID primary key
- `actor_id` - FK to users (who performed action)
- `resource_type` - user, property, application, etc.
- `action` - create, update, delete, etc.
- `changes` - JSONB with what changed
- `metadata` - JSONB with context
- `timestamp` - When action occurred
- `ip_address` - Request IP (optional)

### 16. `image_audit_logs` - Image Operation Tracking
**Purpose:** Track all image uploads, deletes, replaces
**Relationships:** users, properties

**Key Fields:**
- `id` - UUID primary key
- `actor_id` - FK to users
- `action` - image_upload, image_delete, image_replace, etc.
- `property_id` - FK to properties (if applicable)
- `details` - JSONB with image info
- `timestamp` - When action occurred

### 17. `admin_settings` - Platform Configuration
**Purpose:** Key-value store for platform settings
**Relationships:** None

**Key Fields:**
- `id` - UUID primary key
- `key` - Setting key (unique)
- `value` - Setting value
- `created_at`, `updated_at` - Timestamps

### 18. `newsletter_subscribers` - Email List
**Purpose:** Users subscribed to newsletter
**Relationships:** None
**Unique:** email

**Key Fields:**
- `id` - UUID primary key
- `email` - Subscriber email (unique)
- `subscribed_at` - When subscribed

### 19. `contact_messages` - Contact Form Submissions
**Purpose:** Messages from contact form
**Relationships:** None

**Key Fields:**
- `id` - UUID primary key
- `name`, `email`, `subject` - Sender info
- `message` - Message content
- `read` - Whether admin read it
- `created_at` - When submitted

## Field Type Guidelines

### JSON Fields (JSONB)
Used for flexible data structures that don't require indexing:
- `amenities` - Array of strings
- `images` - Array of image objects
- `documents` - Array of document objects
- `personalInfo` - Nested user information
- `scoreBreakdown` - Detailed scoring metrics
- `customAnswers` - Arbitrary key-value responses

### Timestamp Fields
Every major table includes:
- `created_at timestamp DEFAULT NOW()` - Creation time
- `updated_at timestamp DEFAULT NOW()` - Last update
- `deleted_at timestamp` - Soft delete marker

### Decimal Fields
Financial data uses DECIMAL to avoid rounding errors:
- `price DECIMAL(12, 2)` - $999,999.99
- `application_fee DECIMAL(8, 2)` - $99,999.99

## Index Strategy

**Indexed Fields:**
- `user_id` - User lookups
- `property_id` - Property lookups
- `status` - State machine queries
- `email` - User authentication
- `created_at` - Time-based queries
- `actor_id` - Audit log lookups

**Rationale:**
- Speed up most common WHERE clauses
- Support pagination and sorting
- Enable efficient JOINs

## Storage Buckets (Supabase)

### `property-images`
- Max file: 10MB per file
- Max per property: 20 files
- Access: Public read with signed URLs
- Uses: ImageKit CDN for optimization

### `property-documents`
- PDF, Word, Excel documents
- For application attachments
- Access: Private, requires authentication

### `profile-images`
- User avatar pictures
- Access: Public read with signed URLs

## Constraints & Relationships

### Referential Integrity
- `ON DELETE CASCADE` - Delete dependent records
  - properties → applications
  - applications → co_applicants, comments, notifications
- `ON DELETE SET NULL` - Keep record, clear foreign key
  - properties → listing_agent_id
  - applications → reviewed_by

### Unique Constraints
- `users.email` - One account per email
- `applications (user_id, property_id)` - One app per user per property
- `reviews (user_id, property_id)` - One review per user per property
- `favorites (user_id, property_id)` - One favorite per user per property
- `admin_settings.key` - One value per setting key

## Row Level Security (RLS) Policy Summary

### users table
- Users can view all profiles (needed for agent lookup)
- Users can only update own profile
- Admins can update any profile

### properties table
- Anyone can view public listings
- Owners can view/edit own properties
- Agents can manage assigned properties
- Admins can view/edit all

### applications table
- Applicants see own applications
- Property owners see applications for their properties
- Agents see applications for their properties
- Admins see all

### payments table
- Tenants see own payments
- Landlords see payments for their properties
- Admins see all

### audit_logs table
- Only admins can view
- No one can delete (immutable)

## Query Optimization Notes

1. **Most Common Queries:**
   - List properties by status → Use `properties (status, created_at)` index
   - Get user's applications → Use `applications (user_id, created_at)` index
   - Get property applications → Use `applications (property_id, status)` index

2. **Pagination Best Practice:**
   - Always use LIMIT + OFFSET
   - Sort by indexed column for consistency

3. **Avoid N+1 Queries:**
   - Use Supabase select() with relationships
   - Select only needed columns

4. **Cache Strategy:**
   - Properties list: 5 min TTL
   - Property detail: 10 min TTL
   - User profile: 30 min TTL
