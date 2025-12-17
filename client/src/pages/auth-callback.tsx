import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { CheckCircle } from 'lucide-react';

async function fetchUserRole(userId: string): Promise<'user' | 'agent' | 'admin' | 'renter' | 'landlord' | 'property_manager'> {
  if (!supabase) return 'renter';
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    return (data?.role as 'user' | 'agent' | 'admin' | 'renter' | 'landlord' | 'property_manager') || 'renter';
  } catch {
    return 'renter';
  }
}

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!supabase) {
          setError('Authentication service unavailable');
          setProcessing(false);
          return;
        }

        // Get session from URL hash (Supabase OAuth/email verification redirect includes tokens in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorDescription = hashParams.get('error_description');
        const type = hashParams.get('type');

        // Handle errors from Supabase
        if (errorDescription) {
          const decodedError = decodeURIComponent(errorDescription);
          console.error('[Auth Callback] Error from Supabase:', decodedError);
          
          // Provide user-friendly error messages
          if (decodedError.includes('expired')) {
            setError('This verification link has expired. Please request a new one.');
          } else if (decodedError.includes('invalid')) {
            setError('This verification link is invalid. Please request a new one.');
          } else {
            setError(decodedError);
          }
          setProcessing(false);
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[Auth Callback] Session error:', sessionError);
            setError(sessionError.message);
            setProcessing(false);
            return;
          }

          if (data.user) {
            // Clear the pending verification email from localStorage on successful verification
            localStorage.removeItem('pending_verification_email');
            
            // Check if this is an email verification callback
            const isEmailVerification = type === 'signup' || type === 'email_change' || !!data.user.email_confirmed_at;
            
            if (isEmailVerification && data.user.email_confirmed_at) {
              console.log('[Auth Callback] Email verified successfully');
              setEmailVerified(true);
              
              // Brief delay to show success message, then redirect
              const userId = data.user.id;
              setTimeout(async () => {
                const role = await fetchUserRole(userId);
                redirectBasedOnRole(role);
              }, 2000);
              return;
            }
            
            // Check if this is a new user (created within the last minute)
            const createdAt = new Date(data.user.created_at);
            const now = new Date();
            const isNewUser = (now.getTime() - createdAt.getTime()) < 60000;
            
            // Check if user exists in our table
            const { data: existingUser } = await supabase
              .from('users')
              .select('id, role')
              .eq('id', data.user.id)
              .single();
            
            if (!existingUser) {
              // New OAuth user - create profile and redirect to role selection
              const { error: upsertError } = await supabase
                .from('users')
                .upsert({
                  id: data.user.id,
                  email: data.user.email,
                  full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
                  profile_image: data.user.user_metadata?.avatar_url || null,
                  role: data.user.user_metadata?.role || null
                }, { onConflict: 'id' });

              if (upsertError) {
                console.error('[Auth Callback] Failed to create user profile:', upsertError);
              }
              
              // Check if role was set during signup
              const signupRole = data.user.user_metadata?.role;
              if (signupRole && signupRole !== 'user') {
                redirectBasedOnRole(signupRole);
                return;
              }
              
              // Redirect new users to role selection
              setLocation('/select-role');
              return;
            }
            
            // Existing user - check role and redirect
            if (!existingUser.role || existingUser.role === 'user') {
              // User exists but hasn't selected a role yet
              if (isNewUser) {
                setLocation('/select-role');
                return;
              }
            }

            // Redirect based on user role
            const role = existingUser.role || await fetchUserRole(data.user.id);
            redirectBasedOnRole(role);
            return;
          }
        }

        // Check for existing session (might be a page refresh)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          redirectBasedOnRole(role);
          return;
        }

        // No session found
        setError('Authentication failed. Please try signing in again.');
        setProcessing(false);
      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred. Please try again.');
        setProcessing(false);
      }
    };

    const redirectBasedOnRole = (role: string) => {
      if (role === 'agent') {
        setLocation('/agent-dashboard');
      } else if (role === 'admin') {
        setLocation('/admin');
      } else if (role === 'landlord' || role === 'property_manager') {
        setLocation('/seller-dashboard');
      } else {
        setLocation('/');
      }
    };

    handleCallback();
  }, [setLocation]);

  // Show email verified success state
  if (emailVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl text-center border-t-4 border-t-green-500">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-muted-foreground mb-4">Your email has been verified successfully.</p>
            <p className="text-sm text-muted-foreground">Redirecting you to the app...</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (processing) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Completing Sign In...</h2>
            <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-red-500 text-center">
            <h2 className="text-2xl font-bold mb-2">Authentication Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-try-again">
                Try Again
              </Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return null;
}
