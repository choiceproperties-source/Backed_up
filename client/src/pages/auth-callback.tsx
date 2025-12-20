import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

type AppRole =
  | "renter"
  | "landlord"
  | "property_manager"
  | "agent"
  | "admin";

const redirectByRole = (role: AppRole, setLocation: (path: string) => void) => {
  switch (role) {
    case "agent":
      setLocation("/agent-dashboard");
      break;
    case "admin":
      setLocation("/admin");
      break;
    case "landlord":
    case "property_manager":
      setLocation("/seller-dashboard");
      break;
    default:
      setLocation("/");
  }
};

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        if (!supabase) {
          setError("Authentication service unavailable");
          return;
        }

        /* ----------------------------------
           1. Get or restore session
        ---------------------------------- */
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        const user = sessionData.session?.user;

        if (!user) {
          setError("Authentication failed. Please sign in again.");
          return;
        }

        /* ----------------------------------
           2. Email verification success state
        ---------------------------------- */
        if (user.email_confirmed_at) {
          setEmailVerified(true);
        }

        /* ----------------------------------
           3. Ensure user exists in DB
        ---------------------------------- */
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile) {
          await supabase.from("users").upsert({
            id: user.id,
            email: user.email,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              null,
            profile_image: user.user_metadata?.avatar_url || null,
            role: user.user_metadata?.role || null,
          });

          setLocation("/select-role");
          return;
        }

        /* ----------------------------------
           4. Redirect based on role
        ---------------------------------- */
        if (!profile.role) {
          setLocation("/select-role");
          return;
        }

        redirectByRole(profile.role as AppRole, setLocation);
      } catch (err: any) {
        console.error("[AuthCallback]", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setProcessing(false);
      }
    };

    handleAuth();
  }, [setLocation]);

  /* ----------------------------------
     Email verified success UI
  ---------------------------------- */
  if (emailVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center border-t-4 border-t-green-500">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email Verified</h2>
            <p className="text-muted-foreground">
              Redirecting you to your dashboard…
            </p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  /* ----------------------------------
     Loading state
  ---------------------------------- */
  if (processing) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Completing sign in…</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  /* ----------------------------------
     Error state
  ---------------------------------- */
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center border-t-4 border-t-red-500">
            <h2 className="text-xl font-bold mb-2">Authentication Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/login">
              <Button className="w-full">Try Again</Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return null;
}