import { useAuth } from "@/lib/auth-context";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

type AppRole =
  | "renter"
  | "landlord"
  | "property_manager"
  | "agent"
  | "admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
  redirectTo?: string;
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = "/login",
  requireEmailVerification = false
}: ProtectedRouteProps) {
  const { user, isLoading, isEmailVerified } = useAuth();

  /* ----------------------------------
     1. Wait for auth initialization
  ---------------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ----------------------------------
     2. Not authenticated
  ---------------------------------- */
  if (!user) {
    return <Redirect to={redirectTo} />;
  }

  /* ----------------------------------
     3. Role not ready (should be rare now)
  ---------------------------------- */
  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ----------------------------------
     4. Role selection gate
  ---------------------------------- */
  if (user.needs_role_selection) {
    return <Redirect to="/select-role" />;
  }

  /* ----------------------------------
     5. Email verification (only when required)
  ---------------------------------- */
  if (requireEmailVerification && !isEmailVerified) {
    return <Redirect to="/verify-email" />;
  }

  /* ----------------------------------
     6. Role authorization (LAST)
  ---------------------------------- */
  if (requiredRoles && !requiredRoles.includes(user.role as AppRole)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}