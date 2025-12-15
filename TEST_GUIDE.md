# API Migration Testing Guide

This guide covers how to verify that all 28+ routes have been successfully migrated from legacy endpoints to the new `/api/v2/*` domain-based architecture.

---

## Quick Overview

| Testing Method | Coverage | Time |
|---|---|---|
| **Manual curl tests** | All 28+ endpoints | 15-20 min |
| **Frontend smoke test** | UI still works | 5 min |
| **Database consistency** | Data integrity | 5 min |
| **Legacy route check** | Backward compatibility | 5 min |

---

## Part 1: Manual Endpoint Testing

The application is running on `http://localhost:5000`. You can test endpoints using curl or your API client (Postman, Insomnia, etc).

### Prerequisites
- App running on port 5000
- You may need valid authentication tokens for protected routes
- Some operations require specific IDs (property IDs, application IDs, etc)

---

## Part 2: Testing Each Domain

### 1. AUTH DOMAIN (5 routes)
**Base URL**: `http://localhost:5000/api/v2/auth`

#### Sign Up
```bash
curl -X POST http://localhost:5000/api/v2/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```
**Expected**: 201 status, user object with ID
**Also test legacy**: `POST /api/auth/signup` (should work identically)

#### Login
```bash
curl -X POST http://localhost:5000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```
**Expected**: 200 status, returns user object and session
**Legacy endpoint**: `POST /api/auth/login`

#### Get Current User
```bash
curl -X GET http://localhost:5000/api/v2/auth/me
```
**Expected**: 200 status or 401 if not authenticated
**Legacy endpoint**: `GET /api/auth/me`

#### Logout
```bash
curl -X POST http://localhost:5000/api/v2/auth/logout
```
**Expected**: 200 status
**Legacy endpoint**: `POST /api/auth/logout`

#### Resend Verification
```bash
curl -X POST http://localhost:5000/api/v2/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```
**Expected**: 200 status
**Legacy endpoint**: `POST /api/auth/resend-verification`

---

### 2. PROPERTIES DOMAIN (6 routes)
**Base URL**: `http://localhost:5000/api/v2/properties`

#### Get All Properties
```bash
curl -X GET http://localhost:5000/api/v2/properties
```
**Expected**: 200 status, array of property objects
**Legacy endpoint**: `GET /api/properties`

#### Get Property by ID
```bash
curl -X GET http://localhost:5000/api/v2/properties/1
```
**Expected**: 200 status with property details, or 404 if not found
**Legacy endpoint**: `GET /api/properties/1`

#### Create Property
```bash
curl -X POST http://localhost:5000/api/v2/properties \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Property",
    "address": "123 Main St",
    "price": 2000,
    "bedrooms": 2,
    "bathrooms": 1
  }'
```
**Expected**: 201 status with created property
**Legacy endpoint**: `POST /api/properties`

#### Update Property
```bash
curl -X PATCH http://localhost:5000/api/v2/properties/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 2100}'
```
**Expected**: 200 status with updated property
**Legacy endpoint**: `PATCH /api/properties/1`

#### Delete Property
```bash
curl -X DELETE http://localhost:5000/api/v2/properties/1
```
**Expected**: 204 status (no content) or appropriate error
**Legacy endpoint**: `DELETE /api/properties/1`

#### Record View
```bash
curl -X POST http://localhost:5000/api/v2/properties/1/view
```
**Expected**: 200 status
**Legacy endpoint**: `POST /api/properties/1/view`

---

### 3. APPLICATIONS DOMAIN (6 routes)
**Base URL**: `http://localhost:5000/api/v2/applications`

#### Create Application
```bash
curl -X POST http://localhost:5000/api/v2/applications \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": 1,
    "userId": 1,
    "status": "pending"
  }'
```
**Expected**: 201 status with application
**Legacy endpoint**: `POST /api/applications`

#### Get Application by ID
```bash
curl -X GET http://localhost:5000/api/v2/applications/1
```
**Expected**: 200 status with application details
**Legacy endpoint**: `GET /api/applications/1`

#### Get Applications by User
```bash
curl -X GET http://localhost:5000/api/v2/applications/user/1
```
**Expected**: 200 status, array of user's applications
**Legacy endpoint**: `GET /api/applications/user/1`

#### Get Applications by Property
```bash
curl -X GET http://localhost:5000/api/v2/applications/property/1
```
**Expected**: 200 status, array of property's applications
**Legacy endpoint**: `GET /api/applications/property/1`

#### Update Application
```bash
curl -X PATCH http://localhost:5000/api/v2/applications/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```
**Expected**: 200 status with updated application
**Legacy endpoint**: `PATCH /api/applications/1`

#### Update Application Status
```bash
curl -X PATCH http://localhost:5000/api/v2/applications/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'
```
**Expected**: 200 status with updated application
**Legacy endpoint**: `PATCH /api/applications/1/status`

---

### 4. PAYMENTS DOMAIN (6 routes)
**Base URL**: `http://localhost:5000/api/v2/payments`

#### Process Payment
```bash
curl -X POST http://localhost:5000/api/v2/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": 1,
    "amount": 2000,
    "method": "credit_card"
  }'
```
**Expected**: 201 status with payment record
**Legacy endpoint**: `POST /api/payments/process`

#### Verify Payment
```bash
curl -X POST http://localhost:5000/api/v2/payments/1/verify \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```
**Expected**: 200 status with verification result
**Legacy endpoint**: `POST /api/payments/1/verify`

#### Mark Payment as Paid
```bash
curl -X POST http://localhost:5000/api/v2/payments/1/mark-paid
```
**Expected**: 200 status
**Legacy endpoint**: `POST /api/payments/1/mark-paid`

#### Get Payment Receipt
```bash
curl -X GET http://localhost:5000/api/v2/payments/1/receipt
```
**Expected**: 200 status with receipt details
**Legacy endpoint**: `GET /api/payments/1/receipt`

#### Delete Payment (Should be blocked)
```bash
curl -X DELETE http://localhost:5000/api/v2/payments/1
```
**Expected**: 403 Forbidden (should not be allowed)
**Legacy endpoint**: `DELETE /api/payments/1`

#### Get Audit Logs
```bash
curl -X GET http://localhost:5000/api/v2/payments/audit-logs
```
**Expected**: 200 status with audit log entries
**Legacy endpoint**: `GET /api/payments/audit-logs`

---

### 5. LEASES DOMAIN (3 routes)
**Base URL**: `http://localhost:5000/api/v2/leases`

#### Get Payment History
```bash
curl -X GET http://localhost:5000/api/v2/leases/1/payment-history
```
**Expected**: 200 status with payment history
**Legacy endpoint**: `GET /api/leases/1/payment-history`

#### Generate Rent Payments
```bash
curl -X POST http://localhost:5000/api/v2/leases/1/generate-rent-payments \
  -H "Content-Type: application/json" \
  -d '{"months": 12}'
```
**Expected**: 201 status with generated payments
**Legacy endpoint**: `POST /api/leases/1/generate-rent-payments`

#### Get Rent Payments
```bash
curl -X GET http://localhost:5000/api/v2/leases/1/rent-payments
```
**Expected**: 200 status, array of rent payments
**Legacy endpoint**: `GET /api/leases/1/rent-payments`

---

### 6. ADMIN DOMAIN (7 routes)
**Base URL**: `http://localhost:5000/api/v2/admin`
*Note: These require admin privileges*

#### Get Image Audit Logs
```bash
curl -X GET http://localhost:5000/api/v2/admin/image-audit-logs
```
**Expected**: 200 status with logs or 403 if not admin
**Legacy endpoint**: `GET /api/admin/image-audit-logs`

#### Get Personas
```bash
curl -X GET http://localhost:5000/api/v2/admin/personas
```
**Expected**: 200 status with personas list
**Legacy endpoint**: `GET /api/admin/personas`

#### Create Persona
```bash
curl -X POST http://localhost:5000/api/v2/admin/personas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Persona",
    "description": "A test persona"
  }'
```
**Expected**: 201 status with created persona
**Legacy endpoint**: `POST /api/admin/personas`

#### Update Persona
```bash
curl -X PATCH http://localhost:5000/api/v2/admin/personas/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Persona"}'
```
**Expected**: 200 status with updated persona
**Legacy endpoint**: `PATCH /api/admin/personas/1`

#### Delete Persona
```bash
curl -X DELETE http://localhost:5000/api/v2/admin/personas/1
```
**Expected**: 204 status or 200
**Legacy endpoint**: `DELETE /api/admin/personas/1`

#### Get Settings
```bash
curl -X GET http://localhost:5000/api/v2/admin/settings
```
**Expected**: 200 status with settings
**Legacy endpoint**: `GET /api/admin/settings`

#### Update Settings
```bash
curl -X PATCH http://localhost:5000/api/v2/admin/settings \
  -H "Content-Type: application/json" \
  -d '{"settingKey": "value"}'
```
**Expected**: 200 status with updated settings
**Legacy endpoint**: `PATCH /api/admin/settings`

---

## Part 3: Frontend Smoke Test

Test that the UI still works correctly with the new endpoints:

1. **Load the Application**
   - Navigate to `http://localhost:5000`
   - Page should load without console errors

2. **Check Authentication**
   - Sign up with new account
   - Login with credentials
   - Verify "Get Current User" works (check `/api/v2/auth/me`)
   - Logout

3. **Check Main Features**
   - Browse properties (GET `/api/v2/properties`)
   - View property details (GET `/api/v2/properties/:id`)
   - Create application (POST `/api/v2/applications`)
   - Check other major features

4. **Browser Console**
   - Open DevTools (F12)
   - Check Console tab - should have no `4xx` or `5xx` errors
   - Check Network tab - verify requests go to `/api/v2/*`

---

## Part 4: Database Consistency Check

### Verify Data Integrity

```bash
# Check that new routes write to the same database as legacy
# 1. Create via legacy endpoint: POST /api/properties
# 2. Read via new endpoint: GET /api/v2/properties
# Should see the property created via legacy in the new endpoint result

# 3. Create via new endpoint: POST /api/v2/applications
# 4. Read via legacy endpoint: GET /api/applications
# Should see the application created via new in the legacy endpoint result
```

This confirms both routes write to and read from the same database.

---

## Part 5: Response Format Validation

For each endpoint, verify:

1. **Status Codes**
   - Success: 200, 201, 204 (no content)
   - Client error: 400, 401, 403, 404
   - Server error: 500

2. **Response Headers**
   - `Content-Type: application/json` (for most endpoints)

3. **Response Body**
   - Should match the same format as legacy endpoints
   - No extra fields that weren't there before
   - All required fields present

4. **Error Responses**
   - Should have `error` or `message` field
   - Should have consistent error format between old and new

---

## Part 6: Checklist

Use this checklist to verify all routes are working:

### Auth Domain ✓
- [ ] POST /api/v2/auth/signup
- [ ] POST /api/v2/auth/login
- [ ] GET /api/v2/auth/me
- [ ] POST /api/v2/auth/logout
- [ ] POST /api/v2/auth/resend-verification

### Properties Domain ✓
- [ ] GET /api/v2/properties
- [ ] GET /api/v2/properties/:id
- [ ] POST /api/v2/properties
- [ ] PATCH /api/v2/properties/:id
- [ ] DELETE /api/v2/properties/:id
- [ ] POST /api/v2/properties/:id/view

### Applications Domain ✓
- [ ] POST /api/v2/applications
- [ ] GET /api/v2/applications/:id
- [ ] GET /api/v2/applications/user/:userId
- [ ] GET /api/v2/applications/property/:propertyId
- [ ] PATCH /api/v2/applications/:id
- [ ] PATCH /api/v2/applications/:id/status

### Payments Domain ✓
- [ ] POST /api/v2/payments/process
- [ ] POST /api/v2/payments/:paymentId/verify
- [ ] POST /api/v2/payments/:paymentId/mark-paid
- [ ] GET /api/v2/payments/:paymentId/receipt
- [ ] DELETE /api/v2/payments/:paymentId (should fail)
- [ ] GET /api/v2/payments/audit-logs

### Leases Domain ✓
- [ ] GET /api/v2/leases/:leaseId/payment-history
- [ ] POST /api/v2/leases/:leaseId/generate-rent-payments
- [ ] GET /api/v2/leases/:leaseId/rent-payments

### Admin Domain ✓
- [ ] GET /api/v2/admin/image-audit-logs
- [ ] GET /api/v2/admin/personas
- [ ] POST /api/v2/admin/personas
- [ ] PATCH /api/v2/admin/personas/:id
- [ ] DELETE /api/v2/admin/personas/:id
- [ ] GET /api/v2/admin/settings
- [ ] PATCH /api/v2/admin/settings

---

## Troubleshooting

### Endpoint Returns 404
- Check the URL path is exactly `/api/v2/...`
- Verify the HTTP method (GET, POST, etc) matches
- Check the server logs for registration errors

### Endpoint Returns 500
- Check server logs in the console
- Verify database connection is active
- Check request body format matches expected schema

### Endpoint Works but Response is Different
- Compare response with legacy endpoint
- Verify all required fields are present
- Check data types match

### Frontend Not Connecting
- Verify browser Network tab shows requests to `/api/v2/...`
- Check CORS headers if making cross-origin requests
- Verify session/auth tokens are being sent correctly

---

## How to Run Automated Tests (Future)

Once you're satisfied with manual testing, you can set up automated tests:

```bash
# Install test framework
npm install --save-dev vitest @testing-library/react supertest

# Create test files in server/tests/ and client/src/__tests__/
# Run with: npm run test
```

For now, manual testing validates that the migration was successful!
