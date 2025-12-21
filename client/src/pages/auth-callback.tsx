import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

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

        setLocation("/");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setLocation("/");
        return;
      }

      setError("Authentication failed");
    };

    run();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}