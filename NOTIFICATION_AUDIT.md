# Notifications System Audit - Choice Properties

## 1. Inventory of Notification Types

| Event Type | Trigger (Backend) | Recipient | Channel | Frontend Display / Action |
|------------|-------------------|-----------|---------|---------------------------|
| `status_change` | `sendStatusChangeNotification` | Renter | Email + In-App | Navigates to Application Details (`/applications/:id`) |
| `expiration_warning` | `sendExpirationWarningNotification` | Renter | Email + In-App | Navigates to Application Details (`/applications/:id`) |
| `document_request` | `sendDocumentRequestNotification` | Renter | Email + In-App | Navigates to Application Details (`/applications/:id`) |
| `new_application` | `notifyOwnerOfNewApplication` | Landlord/Agent | Email + In-App | Navigates to Application Management |
| `scoring_complete` | `notifyOwnerOfScoringComplete` | Landlord/Agent | Email + In-App | Navigates to Application Scoring |
| `payment_received` | `sendPaymentReceivedNotification` | Landlord | In-App (Only) | Navigates to Payments (`/payments`) |
| `payment_verified` | `sendPaymentVerifiedNotification` | Renter | Email + In-App | Navigates to Payments (`/payments`) |
| `deposit_required` | `sendDepositRequiredNotification` | Renter | Email + In-App | Navigates to Payments (`/payments`) |
| `rent_due_soon` | `sendRentDueSoonNotification` | Renter | Email + In-App | Navigates to Payments (`/payments`) |

## 2. Identified Gaps & Inconsistencies

### Priority 1: Missing Triggers (Functional Gaps)
- **Payment Failure**: No notification exists for failed payment attempts (e.g., Stripe failure or manual rejection).
- **Lease Updates**: No specific notification for lease signature completions (countersigning) or move-in instruction changes.
- **Property Status**: No notifications for "Saved Property" price drops or availability changes (schema exists but no service logic).
- **Messaging**: `message` type exists in UI but is not currently triggered by any backend service.

### Priority 2: Security & Visibility (Role Scoping)
- **Landlord Access**: Landlords currently receive `payment_received` only as an in-app notification. This should be elevated to email for mission-critical cash flow events.
- **Agent Roles**: Listing agents should be copied on `status_change` and `new_application` notifications to ensure they can act on behalf of the owner.
- **Row Level Security (RLS)**: Ensure `application_notifications` table has strict RLS so users cannot read others' notifications.

### Priority 3: UX & UI Polish
- **Duplicate Components**: `NotificationBell` and `NotificationsPanel` share logic but differ in implementation.
- **Navigation**: Some components still use `window.location.href` which causes full page reloads. Transition to `wouter`'s `navigate` is partially complete.
- **Iconography**: Icon colors are inconsistent (some use orange-500, others primary).

## 3. Recommended Reusable Structure

### Component Architecture
```tsx
// src/components/notifications/NotificationProvider.tsx
// Context for managing notification state and real-time updates via Supabase Realtime.

// src/components/notifications/NotificationItem.tsx
// Atomic component that handles icon mapping, date formatting, and navigation logic.

// src/components/notifications/NotificationList.tsx
// Shared list component used by both the Bell (dropdown) and a dedicated /notifications page.
```

### Backend Service Pattern
Extend `notification-service.ts` to support:
- **Batched Notifications**: For daily/weekly digest preferences.
- **Dynamic Action URLs**: Store the specific path in the database instead of hardcoding mapping in the frontend.
