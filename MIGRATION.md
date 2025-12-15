# Architecture Migration Tracker

## Target Architecture
- Domain-based modules
- Thin routes
- Service + repository layers
- No business logic in routes

---

## Domains

### Properties
Status: IN PROGRESS
Routes migrated (available at /api/v2/properties):
- [x] GET /api/properties
- [x] GET /api/properties/:id
- [x] POST /api/properties
- [x] PATCH /api/properties/:id
- [x] DELETE /api/properties/:id
- [x] POST /api/properties/:id/view

Notes:
- New routes registered at /api/v2/properties to coexist with legacy routes
- Legacy routes at /api/properties remain unchanged
- Module structure: server/modules/properties/
  - property.routes.ts - Route handlers (thin, no business logic)
  - property.service.ts - Business logic, validation, caching
  - property.repository.ts - Database queries
- Both legacy and new routes work simultaneously

---

### Applications
Status: NOT STARTED

---

### Payments
Status: NOT STARTED

---

### Admin
Status: NOT STARTED

---

### Auth
Status: NOT STARTED
