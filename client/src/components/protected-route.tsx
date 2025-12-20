import { useAuth } from "@/lib/auth-context";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('user' | 'agent' | 'admin' | 'renter' | 'landlord' | 'property_manager')[];
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

  // CRITICAL: Wait for auth to be fully initialized before any redirects
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

  // Not logged in - redirect to login
  if (!isLoggedIn || !user) {
    console.log('[ROUTE] User not authenticated, redirecting to', redirectTo);
    return <Redirect to={redirectTo} />;
  }

  // User logged in but role not ready - wait (this shouldn't happen with fixed auth)
  if (!user.role) {
    console.log('[ROUTE] User role not loaded yet, showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-role">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Check if user needs to select a role (new OAuth users)
  if (user.needs_role_selection) {
    console.log('[ROUTE] User needs role selection, redirecting to select-role');
    return <Redirect to="/select-role" />;
  }

  // Check email verification if required
  if (requireEmailVerification && !isEmailVerified) {
    console.log('[ROUTE] Email not verified, redirecting to verify-email');
    return <Redirect to="/verify-email" />;
  }

  // Check role-based access LAST - only after all async data is loaded
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = user.role || 'user';
    if (!requiredRoles.includes(userRole as any)) {
      console.log('[ROUTE] User role', userRole, 'not in allowed roles', requiredRoles, 'redirecting to home');
      return <Redirect to="/" />;
    }
  }

  return <>{children}</>;
}
