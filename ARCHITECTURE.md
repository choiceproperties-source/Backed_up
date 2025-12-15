# Architecture Migration Tracker

This document is the single source of truth for the backend architecture migration. All migration work, whether done by a human or any AI tool, must strictly follow this document. If there is any conflict between the existing code and this document, this document takes precedence.

## Migration Goal

The goal of this migration is to move the backend from a monolithic routing structure to a domain-based modular architecture while preserving application behavior 100% exactly as it is today. No feature changes, logic changes, or behavioral changes are allowed during migration.

## Target Principles

Each business domain must live in its own module. HTTP route handlers must be thin and only handle request parsing, authentication, and response formatting. All business logic must live in service files. All database access must live in repository files. Cross-domain logic is not allowed except through explicitly exposed service functions. Behavior must remain identical during the entire migration.

## Migration Rules (Mandatory)

Only one domain may be migrated at a time. Legacy routes must not be deleted until their replacements are fully implemented, verified, and working. Unrelated domains must not be refactored. API endpoint paths must not be renamed. Database schemas must not be modified. Request and response shapes must not change. Each completed route must be explicitly marked in this document. If anything is unclear, migration work must stop immediately and clarification must be requested.

## Legacy vs Target Architecture

The legacy backend architecture consists of a large `server/routes.ts` file containing mixed business logic, inline database queries inside route handlers, and cross-domain logic in single files. This structure is being phased out.

The target backend architecture uses a domain-based modular structure as shown below.

server/
  modules/
    auth/
      auth.routes.ts
      auth.service.ts
      auth.repository.ts
    properties/
      property.routes.ts
      property.service.ts
      property.repository.ts
    applications/
      application.routes.ts
      application.service.ts
      application.repository.ts
    payments/
      payment.routes.ts
      payment.service.ts
      payment.repository.ts
    admin/
      admin.routes.ts
      admin.service.ts

## Migration Order (Do Not Change)

Domains must be migrated strictly in the following order: Properties, Applications, Payments, Admin, and Auth. The Auth domain must always be migrated last because all other domains depend on it.

## Domain Migration Status

Each domain must be fully completed and verified before moving to the next domain. Partial migrations are not allowed.

### Properties Domain

Status: NOT STARTED  
Target Folder: server/modules/properties/

Routes to Migrate:
- GET /api/properties
- GET /api/properties/:id
- POST /api/properties
- PATCH /api/properties/:id
- DELETE /api/properties/:id
- POST /api/properties/:id/view
- GET /api/properties/search
- GET /api/properties/featured

Verification Checklist:
- Responses match legacy routes exactly
- Permissions and access control unchanged
- Database queries equivalent to legacy behavior
- Logging behavior matches legacy routes
- Legacy routes remain intact and are not deleted

Notes:

### Applications Domain

Status: NOT STARTED  
Target Folder: server/modules/applications/

Routes to Migrate:
- POST /api/applications
- GET /api/applications/:id
- PATCH /api/applications/:id/status
- GET /api/applications/property/:propertyId
- GET /api/applications/user/:userId

Verification Checklist:
- Atomic operations preserved
- Status transition rules unchanged
- Duplicate submissions prevented
- Permissions and ownership checks unchanged
- Legacy routes remain intact and are not deleted

Notes:

### Payments Domain

Status: NOT STARTED  
Target Folder: server/modules/payments/

Routes to Migrate:
- POST /api/payments/initiate
- POST /api/payments/verify
- PATCH /api/payments/:id/status
- GET /api/payments/application/:applicationId

Verification Checklist:
- Idempotency behavior preserved
- Ownership and role checks enforced
- Financial audit logs created correctly
- Duplicate payment processing prevented
- Legacy routes remain intact and are not deleted

Notes:

### Admin Domain

Status: NOT STARTED  
Target Folder: server/modules/admin/

Routes to Migrate:
- GET /api/admin/users
- PATCH /api/admin/users/:id/role
- GET /api/admin/properties
- GET /api/admin/applications
- GET /api/admin/payments
- PATCH /api/admin/settings

Verification Checklist:
- Admin role enforcement unchanged
- Sensitive actions logged correctly
- Rate limiting preserved
- Legacy routes remain intact and are not deleted

Notes:

### Auth Domain (Last)

Status: NOT STARTED  
Target Folder: server/modules/auth/

Routes to Migrate:
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/2fa/verify
- POST /api/auth/password/reset

Verification Checklist:
- Token issuance behavior unchanged
- Role resolution behavior unchanged
- Optional authentication behavior preserved
- Frontend authentication flows remain functional

Notes:

## Completion Criteria

The migration is considered complete only when all domains are marked as COMPLETE, the legacy server/routes.ts file is no longer used, all API endpoints are served exclusively from domain modules, application behavior matches pre-migration behavior, and all legacy code has been safely removed.

## Rollback Strategy

Each domain migration must be committed separately. If any issues arise, the domain-specific commit must be reverted immediately. Legacy routes must always remain functional until the migration is fully completed. No data corruption or partial migrations are acceptable.

## Final Notes

This migration prioritizes safety over speed, behavior preservation over refactor quality, and strict control over convenience. If anything is unclear at any point, migration work must stop and clarification must be requested before proceeding.