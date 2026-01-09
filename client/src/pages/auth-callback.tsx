import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { authRedirect, clearAuthRedirect, user, isLoading } = useAuth();

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setError("Auth service unavailable");
        return;
      }

      const hash = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });

        if (error) {
          setError(error.message);
          return;
        }
      }
    };

    run();
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (authRedirect) {
        const target = authRedirect;
        clearAuthRedirect();
        setLocation(target);
      } else if (user.needs_role_selection) {
        setLocation("/select-role");
      } else {
        // Redirect to role-specific dashboard
        switch (user.role) {
          case "renter":
            setLocation("/renter-dashboard");
            break;
          case "landlord":
          case "property_manager":
          case "admin":
            setLocation("/landlord-dashboard");
            break;
          case "agent":
            setLocation("/agent-dashboard");
            break;
          default:
            setLocation("/");
        }
      }
    } else if (!isLoading && !user && !window.location.hash) {
      setLocation("/login");
    }
  }, [user, isLoading, authRedirect, clearAuthRedirect, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6 max-w-sm mx-auto">
          <p className="text-destructive font-bold mb-2">Authentication Error</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button 
            onClick={() => setLocation("/login")}
            className="mt-4 text-primary font-bold hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground font-medium animate-pulse">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}