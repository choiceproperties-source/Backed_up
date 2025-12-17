import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, CheckCircle, ArrowRight, Clock, Inbox, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { updateMetaTags } from "@/lib/seo";

export default function VerifyEmail() {
  useEffect(() => {
    updateMetaTags({
      title: "Verify Email - Choice Properties",
      description: "Please verify your email address to continue using Choice Properties.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/verify-email"
    });
  }, []);

  const { user, resendVerificationEmail, logout, isEmailVerified } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Get email from user or localStorage for display
  const displayEmail = user?.email || localStorage.getItem('pending_verification_email') || 'your email address';

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    try {
      await resendVerificationEmail();
      setResent(true);
      setCountdown(60);
      toast({
        title: "Email sent!",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const [, setLocation] = useLocation();
  
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      if (!supabase) {
        toast({
          title: "Service unavailable",
          description: "Authentication service is not available. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      // Re-fetch the session to get the latest email_confirmed_at status
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[Verify Email] Error checking status:', error);
        toast({
          title: "Error checking status",
          description: "Could not verify your status. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (session?.user?.email_confirmed_at) {
        // Email is verified - clear pending email and redirect
        localStorage.removeItem('pending_verification_email');
        toast({
          title: "Email verified!",
          description: "Your email has been verified successfully.",
        });
        
        // Redirect to home after a brief delay
        setTimeout(() => {
          setLocation('/');
        }, 1000);
      } else {
        toast({
          title: "Not verified yet",
          description: "Please check your email and click the verification link, then try again.",
        });
      }
    } catch (err: any) {
      console.error('[Verify Email] Unexpected error:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  if (isEmailVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="max-w-md w-full p-8 shadow-xl text-center border-t-4 border-t-green-500">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
              <p className="text-muted-foreground mb-6">
                Your email has been verified successfully. You can now access all features.
              </p>
              <Link href="/">
                <Button className="w-full" data-testid="button-continue">
                  Continue to Home <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="w-full p-8 shadow-xl border-t-4 border-t-primary">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Check Your Inbox</h2>
                <p className="text-muted-foreground text-sm">
                  We've sent a verification link to
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-muted/50 rounded-lg p-4 mb-6"
            >
              <p className="font-medium text-center text-foreground break-all">
                {displayEmail}
              </p>
            </motion.div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Open your email</p>
                  <p className="text-muted-foreground text-xs">Check your inbox for an email from us</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Click the verification link</p>
                  <p className="text-muted-foreground text-xs">The link will verify your email instantly</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Start exploring</p>
                  <p className="text-muted-foreground text-xs">Access all features after verification</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <Inbox className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Don't see the email? Check your spam or junk folder. Sometimes verification emails end up there.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="w-full"
                data-testid="button-check-status"
              >
                {checkingStatus ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    I've Verified My Email
                  </>
                )}
              </Button>

              <Button
                onClick={handleResend}
                disabled={resending || countdown > 0}
                variant="outline"
                className="w-full"
                data-testid="button-resend-verification"
              >
                <AnimatePresence mode="wait">
                  {resending ? (
                    <motion.span
                      key="sending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center"
                    >
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </motion.span>
                  ) : countdown > 0 ? (
                    <motion.span
                      key="countdown"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Resend in {countdown}s
                    </motion.span>
                  ) : (
                    <motion.span
                      key="resend"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full text-muted-foreground"
                data-testid="button-logout"
              >
                Use a different email address
              </Button>
            </div>
            
            {resent && countdown > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-400">
                      A new verification email has been sent! Check your inbox.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Having trouble?{' '}
            <Link href="/contact">
              <span className="text-primary hover:underline cursor-pointer">Contact support</span>
            </Link>
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
