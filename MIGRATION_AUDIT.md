# Legacy Routes to Modules Migration Audit
**Generated:** 2025-12-21 | **Status:** Analysis Complete

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| **Total Legacy Endpoints** | 95+ |
| **Already in Modules** | ~15 (15%) |
| **Need Migration** | 80+ (85%) |
| **Legacy Routes File Size** | 7,820 lines |
| **Modules Ready** | 6 (auth, properties, applications, payments, leases, admin) |

**Migration Complexity:** HIGH (2 weeks if one developer; 3-5 days with team)

---

## CURRENT MODULE STATUS

### ✅ PARTIALLY IMPLEMENTED (5-15 endpoints each)

#### 1. **Properties Module** (`server/modules/properties/`)
**Status:** 45% Complete
- ✅ `GET /properties` (list with filters)
- ✅ `GET /properties/:id` (detail)
- ✅ `POST /properties` (create)
- ✅ `PATCH /properties/:id` (update)
- ✅ `DELETE /properties/:id` (delete)
- ✅ `POST /properties/:id/view` (track views)
- ❌ **MISSING:** 25+ endpoints below

#### 2. **Applications Module** (`server/modules/applications/`)
**Status:** 30% Complete
- ✅ `POST /applications` (create)
- ✅ `GET /applications/:id` (detail)
- ✅ `GET /applications/:userId` (user's applications)
- ✅ `PATCH /applications/:id` (update)
- ✅ `PATCH /applications/:id/status` (status)
- ❌ **MISSING:** 20+ endpoints below

#### 3. **Auth Module** (`server/modules/auth/`)
**Status:** 20% Complete
- ✅ `POST /auth/signup`
- ✅ `POST /auth/login`
- ❌ **MISSING:** 3 endpoints below

#### 4. **Payments Module** (`server/modules/payments/`)
**Status:** 5% Complete
- ❌ **EMPTY** - 15+ payment endpoints in legacy only

#### 5. **Leases Module** (`server/modules/leases/`)
**Status:** 5% Complete
- ❌ **EMPTY** - 18+ lease endpoints in legacy only

#### 6. **Admin Module** (`server/modules/admin/`)
**Status:** 1% Complete
- ❌ **EMPTY** - 25+ admin endpoints in legacy only

---

## DETAILED MIGRATION ROADMAP

### PRIORITY 1: Properties Module (CRITICAL)
**Impact:** High | **Effort:** Medium | **Time:** 2-3 days

#### MISSING ENDPOINTS (25 total)

**Property Management:**
- `PATCH /api/properties/:id/status` - Update listing status
- `PATCH /api/properties/:id/expiration` - Set expiration date
- `PATCH /api/properties/:id/price` - Update price (with history)
- `PATCH /api/properties/:id/verify-address` - Verify address via geocoding
- `PATCH /api/properties/:id/schedule-publish` - Schedule future publishing
- `GET /api/properties/:id/analytics` - View count, saves, applications
- `GET /api/properties/:id/full` - Property with owner details
- `GET /api/properties/user/:userId` - Owner's properties

**Property Notes (4 endpoints):**
- `GET /api/properties/:id/notes`
- `POST /api/properties/:id/notes`
- `PATCH /api/properties/:propertyId/notes/:noteId`
- `DELETE /api/properties/:propertyId/notes/:noteId`

**Property Templates (4 endpoints):**
- `GET /api/property-templates`
- `POST /api/property-templates`
- `PATCH /api/property-templates/:id`
- `DELETE /api/property-templates/:id`

**Geocoding:**
- `POST /api/geocode` - Address geocoding service

**Images (9 endpoints):**
- `POST /api/imagekit/upload-token`
- `POST /api/photos` - Save photo metadata
- `GET /api/photos/property/:propertyId`
- `GET /api/images/property/:propertyId` (public access)
- `POST /api/images/signed` - Generate signed URLs
- `PUT /api/photos/:photoId/order` - Reorder photos
- `DELETE /api/photos/:photoId` - Archive photo
- `POST /api/photos/:photoId/replace` - Replace photo
- `GET /api/admin/image-audit-logs` - Image audit trail

**Statistics:**
- `GET /api/stats/market-insights` (CRITICAL - used by landing page)
- `GET /api/stats/trust-indicators`

---

### PRIORITY 2: Applications Module (CRITICAL)
**Impact:** High | **Effort:** High | **Time:** 3-4 days

#### MISSING ENDPOINTS (20+ total)

**Payment & Verification:**
- `POST /api/applications/:id/payment-attempt` - Record payment attempt
- `POST /api/applications/:id/verify-payment` - Verify payment (landlord/admin)
- `GET /api/applications/:id/payment-verifications` - Payment history
- `PATCH /api/applications/:id/documents/:docType` - Verify document status
- `PATCH /api/applications/:id/expiration` - Set expiration date

**Application Review & Management:**
- `POST /api/applications/:id/review-action` - Approve/reject/request info
- `GET /api/applications/:id/audit-trail` - Audit log
- `POST /api/applications/guest` - Guest application submission
- `GET /api/applications/owner` - Owner's applications (all properties)
- `GET /api/applications/property/:propertyId` - Property's applications
- `PATCH /api/applications/:id/draft` - Auto-save draft
- `POST /api/applications/:propertyId/draft` - Create/get draft
- `GET /api/applications/:id/full` - Full details with related data
- `POST /api/applications/:id/score` - Calculate application score
- `GET /api/applications/compare/:propertyId` - Compare applications

**Co-Applicants (4 endpoints):**
- `POST /api/applications/:applicationId/co-applicants`
- `GET /api/applications/:applicationId/co-applicants`
- `DELETE /api/co-applicants/:id`
- `POST /api/applications/:applicationId/co-applicants/:coApplicantId/resend`

**Comments & Notifications:**
- `POST /api/applications/:applicationId/comments`
- `GET /api/applications/:applicationId/comments`
- `GET /api/applications/:applicationId/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/user/notifications`

**Manager-specific:**
- `GET /api/manager/applications` - Manager's assigned applications
- `POST /api/manager/applications/:id/review` - Mark under review
- `POST /api/manager/applications/:id/approve` - Manager approve
- `POST /api/manager/applications/:id/reject` - Manager reject
- `PATCH /api/manager/applications/:id/application-fee` - Block fee changes

---

### PRIORITY 3: Leases Module (HIGH)
**Impact:** High | **Effort:** High | **Time:** 3-4 days

#### MISSING ENDPOINTS (18 total)

**Lease Status & Management:**
- `PATCH /api/applications/:applicationId/lease-status` - Update lease status

**Lease Drafts (4 endpoints):**
- `POST /api/applications/:applicationId/lease-draft`
- `GET /api/applications/:applicationId/lease-draft`
- `PATCH /api/applications/:applicationId/lease-draft`
- `GET /api/applications/:applicationId/lease-draft/history`

**Lease Delivery & Signing (7 endpoints):**
- `POST /api/applications/:applicationId/lease-draft/send` - Send to tenant
- `GET /api/applications/:applicationId/lease` - Tenant review
- `POST /api/applications/:applicationId/lease/accept` - Tenant accept
- `POST /api/applications/:applicationId/lease/sign` - Tenant sign
- `POST /api/applications/:applicationId/lease/countersign` - Landlord sign
- `GET /api/applications/:applicationId/lease/signatures` - Signature list
- `PATCH /api/applications/:applicationId/lease-draft/signature-enable`

**Move-In Preparation (3 endpoints):**
- `POST /api/applications/:applicationId/move-in/prepare`
- `GET /api/applications/:applicationId/move-in/instructions`
- `PATCH /api/applications/:applicationId/move-in/checklist`

**Lease Decline:**
- `POST /api/applications/:applicationId/lease/decline`

**Manager Lease Operations:**
- `POST /api/manager/leases/:leaseId/send` - Send lease (manager)
- `GET /api/leases/:leaseId/rent-payments` - Get rent payments

---

### PRIORITY 4: Payments Module (HIGH)
**Impact:** High | **Effort:** Medium | **Time:** 2-3 days

#### MISSING ENDPOINTS (15+ total)

**Payment Processing:**
- `POST /api/payments/process` - Mock payment processing
- `GET /api/applications/:applicationId/payments` - Application payments
- `POST /api/payments/:paymentId/verify` - Verify payment (landlord/admin)
- `POST /api/payments/:paymentId/mark-paid` - Tenant mark paid
- `GET /api/payments/:paymentId/receipt` - Payment receipt

**Security Deposits:**
- `GET /api/applications/:applicationId/security-deposit` - Deposit status

**Rent Payments (3 endpoints):**
- `GET /api/leases/:leaseId/rent-payments` - Get rent schedule
- `POST /api/leases/:leaseId/generate-rent-payments` - Generate schedule
- `DELETE /api/payments/:paymentId` - Block deletion (implement properly)

**Audit & Admin:**
- `GET /api/payments/audit-logs` - Payment audit trail
- `GET /api/admin/storage-metrics` - Storage usage (could be admin module)

---

### PRIORITY 5: Auth Module (MEDIUM)
**Impact:** Medium | **Effort:** Low | **Time:** 1 day

#### MISSING ENDPOINTS (3 total)
- `POST /api/auth/logout` - Already in legacy
- `POST /api/auth/resend-verification` - Email verification
- `GET /api/auth/me` - Current user profile

---

### PRIORITY 6: Admin Module (MEDIUM)
**Impact:** Medium | **Effort:** Medium | **Time:** 2-3 days

#### MISSING ENDPOINTS (25+ total)

**Personas (4 endpoints):**
- `GET /api/admin/personas` - List managed profiles
- `POST /api/admin/personas` - Create persona
- `PATCH /api/admin/personas/:id` - Update persona
- `DELETE /api/admin/personas/:id` - Delete persona

**Admin Settings:**
- `GET /api/admin/settings`
- `POST /api/admin/settings`

**User Management (3 endpoints):**
- `GET /api/users` - List all users
- `GET /api/users/:id` - User details
- `PATCH /api/users/:id` - Update user

**Agencies (7 endpoints):**
- `GET /api/agencies` - List agencies
- `GET /api/agencies/:id` - Agency details
- `POST /api/agencies` - Create agency
- `PATCH /api/agencies/:id` - Update agency
- `DELETE /api/agencies/:id` - Delete agency
- `GET /api/agencies/:id/agents` - Agency's agents
- `GET /api/agencies/:id/stats` - Agency performance stats

**Agents (5 endpoints):**
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Agent details
- `PATCH /api/agents/:id/profile` - Update agent profile
- `GET /api/agents/:id/properties` - Agent's properties
- `GET /api/agents/:id/reviews` - Agent reviews
- `POST /api/agents/:id/reviews` - Submit review

**Image Audit:**
- `GET /api/admin/image-audit-logs`

---

### PRIORITY 7: Other/Utility Endpoints (LOW)
**Impact:** Low | **Effort:** Low | **Time:** 1-2 days

**Favorites (3 endpoints):**
- `POST /api/favorites`
- `DELETE /api/favorites/:id`
- `GET /api/favorites/user/:userId`

**Reviews (4 endpoints):**
- `GET /api/reviews/property/:propertyId`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

**Inquiries (3 endpoints):**
- `POST /api/inquiries`
- `GET /api/inquiries/agent/:agentId`
- `PATCH /api/inquiries/:id`

**Requirements (3 endpoints):**
- `POST /api/requirements`
- `GET /api/requirements/user/:userId`
- `GET /api/requirements` (admin)

**Saved Searches (4 endpoints):**
- `POST /api/saved-searches`
- `GET /api/saved-searches/user/:userId`
- `PATCH /api/saved-searches/:id`
- `DELETE /api/saved-searches/:id`

**Newsletter (2 endpoints):**
- `POST /api/newsletter/subscribe`
- `GET /api/newsletter/subscribers` (admin)

**Contact Messages (4 endpoints):**
- `POST /api/messages` (also `/api/contact`)
- `GET /api/messages` (admin)
- `PATCH /api/messages/:id`

**Transactions (3 endpoints):**
- `GET /api/transactions` - Filtered by role
- `POST /api/transactions` - Create
- `PATCH /api/transactions/:id/status` - Update status

**Messaging/Conversations (5 endpoints):**
- `GET /api/conversations`
- `GET /api/conversations/:id`
- `POST /api/conversations`
- `POST /api/conversations/:id/messages`
- `PATCH /api/conversations/:id/read`

**Push Notifications (3 endpoints):**
- `POST /api/push/subscribe`
- `POST /api/push/unsubscribe`
- `GET /api/push/status`

**Dashboard & Utilities (3 endpoints):**
- `GET /api/user/dashboard` - Aggregated user data
- `GET /api/health` - Health check
- `GET /sitemap.xml` - Sitemap generation

---

## MIGRATION STRATEGY

### Phase 1: Dependencies First (Days 1-2)
1. ✅ Auth module - signup/login already done
2. 🔄 Properties module - most other modules depend on it
3. 🔄 Applications module - depends on properties

### Phase 2: Core Functionality (Days 3-5)
4. Leases module
5. Payments module
6. Admin module

### Phase 3: Finishing (Days 6-7)
7. Utility endpoints (favorites, reviews, searches, etc.)
8. Test all migrations
9. Delete legacy routes.ts

### Test Coverage Needed
- All 95+ endpoints must work identically before deletion
- Run integration tests on each module
- Verify cache invalidation behavior
- Check authorization still works

---

## DELETION CHECKLIST (Before Removing routes.ts)

- [ ] All 95+ legacy endpoints migrated to modules
- [ ] Module endpoints tested and verified working
- [ ] Frontend tested against new endpoints
- [ ] Authorization and authentication working
- [ ] Cache invalidation patterns preserved
- [ ] Error handling consistent across modules
- [ ] Supabase queries working correctly
- [ ] Rate limiting applied where needed
- [ ] All integration tests passing
- [ ] Performance benchmarked (no regression)

---

## REMAINING QUESTIONS FOR MIGRATION

1. **Image handling** - Currently in legacy + properties module. Consolidate to properties or create separate media module?
2. **Statistics endpoints** - Keep in properties module or create separate stats module?
3. **Messaging/Conversations** - Create separate messaging module or include in applications?
4. **Push notifications** - Separate module or part of notifications system?
5. **Transactions** - Separate transactions module or part of payments?

**Recommendation:** Group by domain:
- **Properties:** properties + images + stats (market-insights, trust-indicators)
- **Applications:** applications + co-applicants + comments + notifications
- **Leases:** leases + move-in coordination
- **Payments:** payments + transactions + security-deposits
- **Admin:** users + agencies + agents + personas + image-audit
- **Communication:** messaging + conversations + push-notifications + inquiries
- **User Preferences:** favorites + reviews + saved-searches + requirements + newsletter

---

## NEXT STEPS

1. **Prioritize:** Focus on PRIORITY 1 & 2 first (Properties + Applications)
2. **Team:** If solo dev: 2 weeks. With 2 devs: 1 week. With 3+ devs: 3-5 days
3. **Testing:** After each module, run full integration tests
4. **Migration:** Use feature flags to toggle between legacy/new during testing
5. **Cleanup:** Only delete routes.ts after all tests pass

---

**Generated:** 2025-12-21 | **Status:** Ready for Migration Phase 1
