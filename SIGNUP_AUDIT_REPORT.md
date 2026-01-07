# Sign-Up Flow Audit Report: Choice Properties

## 1. Inventory of Sign-Up Pages and Components
- **Pages**:
  - `client/src/pages/signup.tsx`: Main registration form.
  - `client/src/pages/select-role.tsx`: Role selection post-registration (for users needing role assignment).
  - `client/src/pages/verify-email.tsx`: Post-signup verification landing.
- **Components**:
  - `client/src/components/ui/form.tsx`: Standard Shadcn form wrapper.
  - `client/src/lib/auth-context.tsx`: Handles `signup` and `updateUserRole` logic via Supabase.
- **Backend**:
  - `server/modules/auth/auth.routes.ts`: API endpoints for v2 registration.
  - `server/modules/auth/auth.service.ts`: Business logic for user creation and profile storage.
  - `server/modules/auth/auth.repository.ts`: Supabase interface for auth and user table operations.

---

## 2. High-Impact Functional Issues
- **Profile Synchronization**: The `signup` method in `auth-context.tsx` calls `supabase.auth.signUp` and then immediately calls `supabase.from("users").upsert`. If the second call fails, the auth user exists but the profile record might be missing or desynchronized.
- **Role Enforcement**: The backend `signup` route defaults to `'renter'` but doesn't strictly validate that the user isn't attempting to assign a restricted role (e.g., `'admin'`) during public signup.
- **Rate Limiting**: `signupLimiter` is applied to `/api/v2/auth/signup`, but the frontend `auth-context.tsx` calls Supabase Auth directly (client-side), bypassing backend rate limits for the actual account creation.

---

## 3. Medium-Impact Visual/UX Improvements
- **Password Strength Feedback**: The signup form lacks a visual indicator of password strength.
- **Role Selection UX**: `select-role.tsx` uses a vertical list of buttons. While clear, it could benefit from more distinct visual hierarchy or "Recommended" tags for Renters.
- **Loading States**: The "Create Account" button correctly shows "Creating account..." but lacks a spinner icon for better visual feedback.

---

## 4. Security & Accessibility Observations
- **Password Masking**: The form includes a show/hide toggle, which is good for accessibility.
- **Aria Labels**: Input fields use standard Shadcn labels, but could be enhanced with `aria-describedby` for error messages.
- **Validation Mirroring**: Frontend `signupSchema` in `shared/schema.ts` is mirrored in the backend, which is a strong pattern.

---

## 5. Prioritized Recommendations

### Immediate Fixes (Functional/Security)
1. **Move Signup Logic to Backend**: To ensure rate limiting and atomic transactions (Auth User + Profile Record), the frontend should call the `/api/v2/auth/signup` endpoint instead of Supabase SDK directly.
2. **Strict Role Validation**: Add a check in `auth.service.ts` to prevent signup with protected roles.

### UX Refinements
1. **Add Spinners**: Add `Loader2` from `lucide-react` to the signup button.
2. **Success Feedback**: Enhance the toast message with instructions on what to look for in the verification email.

---

## Code-Level Suggestions (Example Fix for Auth Context)
```typescript
// client/src/lib/auth-context.tsx - Recommendation:
// Replace direct Supabase signup with backend API call
const signup = async (email, name, password, phone, role) => {
  const response = await apiRequest("POST", "/api/v2/auth/signup", {
    email, fullName: name, password, phone, role
  });
  // ... handle response
};
```
