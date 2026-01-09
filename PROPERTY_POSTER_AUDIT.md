# PROPERTY_POSTER_AUDIT Report

## 1. DATABASE SCHEMA ANALYSIS

### Tables & Fields Used
- **`properties` table**:
  - `owner_id` (uuid): Primary link to the property poster. References `users.id`.
  - `listing_agent_id` (uuid): Optional secondary link to a licensed agent. References `users.id`.
  - `agency_id` (uuid): Link to an agency/organization. References `agencies.id`.
  - `listing_status` (text): Tracks listing lifecycle (draft, available, rented, etc.).
- **`users` table**:
  - `full_name` (text): Display name.
  - `role` (text): Determines display label (landlord, agent, property_manager).
  - `profile_image` (text): Avatar URL.
  - `agency_id` (uuid): Link to an agency/organization.
  - `is_managed_profile` (boolean): Indicates if the profile is managed by another user.
  - `managed_by` (uuid): Reference to the managing user.
  - `display_email` & `display_phone`: Public-facing contact details (avoids exposing private auth data).
- **`agencies` table**:
  - `name`, `logo`, `website`: Organization-level details.
  - `owner_id`: Primary contact for the agency.

---

## 2. BACKEND LOGIC

### Modules & Routes
- **`server/modules/properties/property.repository.ts`**:
  - `findAllProperties`: Fetches basic property data. Does NOT currently join owner or agency data by default.
  - `findPropertyById`: Basic fetch. Relies on the service layer for hydration.
- **`server/modules/properties/property.service.ts`**:
  - `getPropertyFull`: Intended for full property details but currently just calls `findPropertyById` (incomplete hydration).
  - `createProperty`: Normalizes input and sets `owner_id` from the authenticated user.
- **`server/notification-service.ts`**:
  - Joins `users` and `properties` to notify owners/agents of new applications.
  - Hardcoded "Property Owner" fallback for names.

---

## 3. FRONTEND COMPONENTS

### Components Rendering Poster Info
- **`client/src/pages/property-details.tsx`**:
  - Fetches property data via `/api/v2/properties/:id`.
  - Uses `PostedBy` component to render owner/agent info.
- **`client/src/components/property/posted-by.tsx`**:
  - **Dynamic logic**: Maps roles to labels (e.g., `agent` -> "Listing Agent").
  - **Verification**: Shows a "Verified" badge if `is_verified` is true.
  - **Contact**: Provides a "Contact" button using `display_email`.
- **`client/src/components/property-card.tsx`**:
  - Displays property details but **lacks** poster information entirely. Users must click through to see who listed it.

---

## 4. NOTIFICATION & DASHBOARD RELATION
- **Dashboards**: Landlord and Tenant dashboards rely on `owner_id` for filtering and display but often lack hydrated user objects, resulting in ID-only displays or separate fetches.
- **Notifications**: Email templates use `full_name` from user records. Profile updates (e.g., avatar changes) reflect dynamically where hydrated objects are used (Property Details), but remain stale in non-hydrated views.

---

## 5. ISSUES & GAPS

- **Inconsistent Hydration**: The property API doesn't consistently return the full `owner` object. Some views (like Property Card) lack owner context entirely.
- **Legacy Logic**: `server/routes.ts` still contains legacy property fetching logic that might bypass the new module-based hydration.
- **Organization Support**: While `agencies` table exists, the logic for "Posted by [Organization]" instead of an individual is not yet implemented in `PostedBy`.
- **Role Display**: "Property Manager" role is defined in schema/auth but `PostedBy` component defaults to "Property Owner" for anything not an `agent`.
- **Missing Data**: No phone number display in `PostedBy` (only email).

---

## 6. RECOMMENDATIONS

1.  **Unified Hydration**: Update `property.repository.ts` to optionally include owner/agency joins in all fetch operations to ensure consistent data availability.
2.  **Organization-First Display**: Update `PostedBy` to check for `agency_id`. If present, offer an "Organization" mode that shows the agency logo and name primarily, with the individual as a secondary representative.
3.  **Property Card Posters**: Add a mini-poster avatar/name to `PropertyCard` for better transparency in search results.
4.  **Role Mapping Expansion**: Explicitly handle the `property_manager` role in `PostedBy` and backend determination logic.
5.  **Audit Cleanup**: Remove legacy routes in `server/routes.ts` that don't follow the module pattern for owner hydration.
