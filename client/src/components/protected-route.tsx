import { useAuth } from "@/lib/auth-context";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('user' | 'agent' | 'admin' | 'renter' | 'buyer' | 'landlord' | 'property_manager')[];
  redirectTo?: string;
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = "/login",
  requireEmailVerification = true
}: ProtectedRouteProps) {
  const { user, isLoggedIn, isLoading, isEmailVerified } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-auth">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return <Redirect to={redirectTo} />;
  }

  // Check if user needs to select a role (new OAuth users)
  if (user.needs_role_selection) {
    return <Redirect to="/select-role" />;
  }

  // Check email verification if required
  if (requireEmailVerification && !isEmailVerified) {
    return <Redirect to="/verify-email" />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = user.role || 'user';
    if (!requiredRoles.includes(userRole as any)) {
      return <Redirect to="/" />;
    }
  }

  return <>{children}</>;
}
