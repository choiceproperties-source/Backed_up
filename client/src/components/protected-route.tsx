import { useAuth } from "@/lib/auth-context";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export type AppRole =
  | "renter"
  | "landlord"
  | "property_manager"
  | "agent"
  | "admin"
  | "super_admin";

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
  requireEmailVerification = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isEmailVerified } = useAuth();

  /* ----------------------------------
     1. Wait for auth to initialize
  ---------------------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Verifying access...
          </p>
        </div>
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
     3. Role selection required
  ---------------------------------- */
  if (user.needs_role_selection) {
    return <Redirect to="/select-role" />;
  }

  /* ----------------------------------
     4. Email verification gate
  ---------------------------------- */
  if (requireEmailVerification && !isEmailVerified) {
    return <Redirect to="/verify-email" />;
  }

  /* ----------------------------------
     5. Role authorization (LAST)
  ---------------------------------- */
  if (requiredRoles && !requiredRoles.includes(user.role as AppRole)) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}