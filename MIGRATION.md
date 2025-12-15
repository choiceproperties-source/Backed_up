# Architecture Migration Tracker

## Target Architecture
- Domain-based modules
- Thin routes
- Service + repository layers
- No business logic in routes

---

## Domains

### Properties
Status: **100% COMPLETE**
- 6 routes at /api/v2/properties
- GET, GET/:id, POST, PATCH/:id, DELETE/:id, POST/:id/view

### Applications
Status: **100% COMPLETE**
- 6 routes at /api/v2/applications
- POST, GET/:id, GET/user/:userId, GET/property/:propertyId, PATCH/:id, PATCH/:id/status

### Payments
Status: **100% COMPLETE**
- 6 routes at /api/v2/payments
- POST /process, POST /:paymentId/verify, POST /:paymentId/mark-paid
- GET /:paymentId/receipt, DELETE /:paymentId (blocked), GET /audit-logs

### Leases
Status: **100% COMPLETE**
- 3 routes at /api/v2/leases (payment-related lease operations)
- GET /:leaseId/payment-history
- POST /:leaseId/generate-rent-payments
- GET /:leaseId/rent-payments

Implementation:
- Module structure: server/modules/leases/
  - lease.routes.ts - Route handlers
  - lease.service.ts - Business logic, authorization
  - lease.repository.ts - Database queries
  - index.ts - Module exports
- New routes registered at /api/v2/leases
- Legacy routes at /api/leases/* remain unchanged
- All authorization, notification, and audit logging preserved

---

### Admin
Status: **100% COMPLETE**
- 7 routes at /api/v2/admin
- GET /image-audit-logs, GET /personas, POST /personas
- PATCH /personas/:id, DELETE /personas/:id
- GET /settings, PATCH /settings

Implementation:
- Module structure: server/modules/admin/
  - admin.routes.ts - Route handlers
  - admin.service.ts - Business logic, validation
  - admin.repository.ts - Database queries
  - index.ts - Module exports
- New routes registered at /api/v2/admin
- Legacy routes at /api/admin/* remain unchanged
- All authorization (admin-only) preserved

---

### Auth
Status: NOT STARTED

---

## Migration Progress Summary
| Domain | Routes | Status |
|--------|--------|--------|
| Properties | 6 | ✅ Complete |
| Applications | 6 | ✅ Complete |
| Payments | 6 | ✅ Complete |
| Leases | 3 | ✅ Complete |
| Admin | 7 | ✅ Complete |
| Auth | TBD | ⏳ Planned |
| **Total** | **28+** | **80%** |

## Key Patterns
- Repository: Pure data access
- Service: Business logic, validation, permissions
- Routes: Thin handlers, request/response only
- Legacy and new routes coexist at /api/* and /api/v2/*

## Files Modified
- server/routes.ts - Added registerAdminModuleRoutes() import and call
- server/modules/admin/ - All 4 files created (admin.routes.ts, admin.service.ts, admin.repository.ts, index.ts)
- MIGRATION.md - Updated

## Important Notes
- All legacy routes remain untouched
- All new routes at /api/v2/* are identical to legacy behavior
- No database schema changes
- All authorization checks preserved
