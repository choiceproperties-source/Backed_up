# Choice Properties - Admin Capability Audit Report
**Date:** January 11, 2026
**Auditor:** Senior SaaS Architect & Security Auditor

## Overview
This report provides a detailed audit of the Admin and Super Admin capabilities currently implemented in the Choice Properties platform.

## 1. Role & Permission Model
- **Identified Roles:** `super_admin`, `admin`, `owner`, `agent`, `landlord`, `property_manager`, `renter`, `guest`.
- **Role Hierarchy:** Defined in `server/auth-middleware.ts` with explicit numeric weights (Super Admin: 1000, Admin: 100).
- **Enforcement Mechanism:**
  - **Middleware:** `authenticateToken` (extracts user/role), `requireRole`, `requireSuperAdmin`, and `requireOwnership`.
  - **Service-level checks:** Some services (e.g., `application.service.ts`) include explicit role-based logic for data redaction or transition validation.
- **Implicit Access:** The `requireOwnership` middleware explicitly allows `admin` and `super_admin` to bypass ownership checks for any resource.

## 2. Admin Access Points
- **API Routes:**
  - `/api/v2/admin/*`: Primarily restricted to `admin` or `super_admin`.
  - `super_admin` only: User management (list/update/role), property deletion, property approval.
  - `admin`/`super_admin`: Image audit logs, personas management, system settings.
- **Frontend Dashboards:**
  - `SuperAdminDashboard.tsx`: High-level management for users, properties, and system logs.
  - `admin.tsx`: Comprehensive management interface (properties, users, reviews, inquiries, applications, reports, disputes).
- **Protection:** Routes are protected using `authenticateToken` and `requireRole` middleware.

## 3. Admin Override Capabilities
- **Application Status:** Admins can update application status via `/api/v2/applications/:id/status`.
- **Modify Applications:** Admins can update application details (restricted to `draft` for applicants, but admins have broader bypasses).
- **Scoring Decisions:** `calculateApplicationScore` is a service-level logic; admins can trigger updates through status changes or manual scoring calls.
- **Lease States:** Admins can manage lease status as they fall under `APPLICATION_REVIEW_ROLES`.
- **User Management:** Super Admins can update user roles and details via `/api/v2/admin/users/:id`.
- **Property Management:** Super Admins can edit/delete any property via `/api/v2/admin/properties/:id`.

## 4. Compliance & Audit Tools
- **Application Status History:** `status_history` JSONB column in `applications` table tracks changes.
- **Lease Signing Logs:** Database has `lease_signed_at` and `lease_accepted_at`.
- **Disclosure Tracking:** `legal_disclosures` and `state_disclosures` JSONB columns in `applications` table track acknowledgments with timestamps.
- **Payment Audit Logs:** `payment_attempts` JSONB column in `applications` table.
- **Admin Activity Logs:** `admin_actions` table logs actions like `delete_property`, `update_user`, `approve_property`.

## 5. Data Visibility & Safety
- **Sensitive Data:** Admins see full SSN; other roles see "REDACTED" version (managed in `application.service.ts`).
- **Access Logs:** Admin actions are logged in the `admin_actions` table, but general "view" access is not logged.
- **Privacy Risks:** High visibility into tenant documents and personal info is necessary for review but poses a risk if not strictly audited for "view" actions.

## 6. UI / UX for Admins
- **Admin Dashboards:** Distinct dashboards for Super Admin and general Admin.
- **Distinction:** Admin actions are performed through dedicated management panels.
- **Missing Indicators:** No clear visual "Admin Override" badge in the UI when an admin modifies a record they don't own.

## 7. Security & Risk Analysis
- **Admin Abuse:** Admins can bypass ownership checks on almost all resources.
- **Audit Trails:** While mutations are logged in `admin_actions`, read access to sensitive data is not tracked.
- **Irreversible Actions:** Property deletion is immediate (though the repository suggests `deleted_at` support, the route calls `deleteProperty` which may be destructive).

## Architectural Observations
- The system uses a centralized `ROLE_HIERARCHY` which is robust but lacks granular "Action-Resource" permission mapping (RBAC is role-centric rather than permission-centric).
- Use of JSONB for history and logs is efficient for prototyping but might require structured tables for high-volume auditing.

## Readiness Level
**Prototype / Beta**
The core permission model is solid, but the lack of granular audit logging for read access and more structured permission controls suggests it is not yet "Production-Ready" for high-compliance environments.
