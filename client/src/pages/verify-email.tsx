import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

export default function VerifyEmail() {
  const { user, resendVerificationEmail, logout, isEmailVerified } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      setResent(true);
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

  if (isEmailVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-6">
              Your email has been verified successfully.
            </p>
            <Link href="/">
              <Button className="w-full" data-testid="button-continue">
                Continue to Home <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="max-w-md w-full p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
          <p className="text-muted-foreground mb-2">
            We've sent a verification link to:
          </p>
          <p className="font-medium text-foreground mb-6">
            {user?.email || 'your email address'}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Please check your inbox and click the verification link to continue.
            Don't forget to check your spam folder!
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleResend}
              disabled={resending || resent}
              variant="outline"
              className="w-full"
              data-testid="button-resend-verification"
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resent ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Email Sent!
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>
            
            <Button
              onClick={logout}
              variant="ghost"
              className="w-full"
              data-testid="button-logout"
            >
              Sign out and use a different email
            </Button>
          </div>
          
          {resent && (
            <p className="text-sm text-green-600 mt-4">
              A new verification email has been sent. You can request another in 60 seconds.
            </p>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}
