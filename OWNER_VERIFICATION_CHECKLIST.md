# Owner/Poster Verification Checklist

This checklist defines the verification points for the "Listed by" section in Choice Properties to ensure professional display and data integrity.

## 1. UI Rendering Verification
- **File**: `client/src/pages/property-details.tsx`
- **Component**: `PostedBy` (`client/src/components/property/posted-by.tsx`)
- [ ] **Section Visibility**: "Listed by" section appears prominently below the property title but above the address.
- [ ] **Divider**: A subtle horizontal line (`bg-border/50`) separates the property title from the owner info.
- [ ] **Avatar Display**:
    - [ ] Circle avatar with 48px diameter (`h-12 w-12`).
    - [ ] `AvatarImage` used for `profile_image`.
    - [ ] `AvatarFallback` displays initials (first letter of first and last name) on a light blue background (`bg-blue-50`).
- [ ] **Owner Identity**:
    - [ ] `full_name` renders as the primary name.
    - [ ] `role` displays as "Listing Agent" or "Property Owner" (all caps, small, bold).
- [ ] **Contact Action**:
    - [ ] "Contact" button (Mail icon) is visible only if `display_email` is provided.
    - [ ] Button is hidden on small mobile screens (`hidden sm:flex`).
    - [ ] `href` uses `mailto:` protocol.

## 2. Dynamic Data & Logic Verification
- **API**: `GET /api/v2/properties/:id`
- [ ] **Data Fetching**: Verify the JSON response contains an `owner` object within the property data.
- [ ] **Field Mapping**:
    - `owner.full_name` -> Display Name
    - `owner.profile_image` -> Avatar Source
    - `owner.role` -> Role Label
    - `owner.display_email` -> Contact Link
- [ ] **Edge Case Handling**:
    - [ ] **Missing Image**: Avatar fallback shows initials instead of a broken image.
    - [ ] **Null Email**: Contact button does not render; no layout shift occurs.
    - [ ] **Anonymous Owner**: Fallback name "Property Owner" shows if `full_name` is null.
    - [ ] **Missing Owner**: The entire section is hidden if `property.owner` is null (prevents runtime errors).

## 3. Technical & Type Safety
- **File**: `client/src/lib/types.ts`
- [ ] **Owner Interface**: Must include `display_email`, `display_phone`, and `profile_image`.
- [ ] **Property Interface**: Must include `owner?: Owner`.
- [ ] **Backend Schema**: `users` table in `shared/schema.ts` includes `display_email` and `display_phone`.

## 4. Backend Integrity Audit
- [ ] **Relational Integrity**: Every property must have an `owner_id`.
- [ ] **Orphan Check**: Identify properties where `owner_id` points to a deleted or non-existent user.
- [ ] **Field Availability**: Ensure `display_email` is populated for users intended to be contacted publicly.

---
**High Risk Areas**:
- **Deleted Users**: If a user is deleted but their property remains, the `owner` object will be null. The UI must handle this gracefully without crashing.
- **Type Mismatches**: Ensure the frontend `Owner` interface matches the snake_case keys returned by Supabase.
