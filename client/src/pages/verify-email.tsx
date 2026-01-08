import { useEffect, useState } from "react";
import { useAuth, buildUserFromAuthHelper } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Clock,
  Inbox,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { updateMetaTags } from "@/lib/seo";

export default function VerifyEmail() {
  const { user, resendVerificationEmail, logout, isEmailVerified, handlePostAuthRedirect } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  const email =
    user?.email ||
    localStorage.getItem("pending_verification_email") ||
    "your email address";

  useEffect(() => {
    updateMetaTags({
      title: "Verify Email - Choice Properties",
      description: "Verify your email to continue using Choice Properties.",
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resendEmail = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      await resendVerificationEmail(email);
      
      setCooldown(60);
      toast({
        title: "Verification email sent",
        description: "Check your inbox for the new link.",
      });
    } catch (err: any) {
      toast({
        title: "Check your inbox",
        description: "If an account exists, a verification link has been sent.",
      });
    } finally {
      setResending(false);
    }
  };

  const checkStatus = async () => {
    if (!supabase) {
      toast({
        title: "Service unavailable",
        description: "Authentication is not available right now.",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session?.user?.email_confirmed_at) {
        localStorage.removeItem("pending_verification_email");
        localStorage.removeItem("auth_redirect_to"); // Ensure redirect is handled cleanly
        toast({
          title: "Email verified",
          description: "You can now continue.",
        });
        
        // Use central redirect logic after verification
        const builtUser = await buildUserFromAuthHelper(data.session.user);
        handlePostAuthRedirect(builtUser);
      } else {
        toast({
          title: "Not verified yet",
          description: "Please click the link in your email first.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error checking status",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (isEmailVerified) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-6">
              Your email has been successfully verified.
            </p>
            <Link href="/">
              <Button className="w-full">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-6">
            <Mail className="h-10 w-10 mx-auto text-primary mb-2" />
            <h2 className="text-xl font-bold">Check your inbox</h2>
            <p className="text-sm text-muted-foreground break-all">{email}</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={checkStatus}
              disabled={checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  I’ve verified my email
                </>
              )}
            </Button>

            <Button
              onClick={resendEmail}
              disabled={resending || cooldown > 0}
              variant="outline"
              className="w-full"
            >
              <AnimatePresence mode="wait">
                {resending ? (
                  <motion.span key="sending">Sending…</motion.span>
                ) : cooldown > 0 ? (
                  <motion.span key="cooldown">
                    Resend in {cooldown}s
                  </motion.span>
                ) : (
                  <motion.span key="resend">
                    Resend verification email
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            <Button
              onClick={logout}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Use a different email
            </Button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground flex gap-2">
            <Inbox className="h-4 w-4" />
            Check spam or junk folders if you don’t see the email.
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}