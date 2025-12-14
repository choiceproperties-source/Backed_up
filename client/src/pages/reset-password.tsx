import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Link, useLocation } from 'wouter';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Password requirements must match signup requirements: 8+ chars, uppercase, number
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    const handleRecovery = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const errorDescription = hashParams.get('error_description');
      
      if (errorDescription) {
        form.setError('root', { message: decodeURIComponent(errorDescription) });
        setTokenError(true);
        return;
      }
      
      if (type === 'recovery' && accessToken && supabase) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            form.setError('root', { message: error.message });
            setTokenError(true);
          }
        } catch (err: any) {
          form.setError('root', { message: err.message || 'Failed to validate reset link' });
          setTokenError(true);
        }
      } else if (!accessToken) {
        setTokenError(true);
      }
    };
    
    handleRecovery();
  }, [form]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    try {
      if (!supabase) throw new Error('Authentication service unavailable');
      
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      
      if (error) throw error;
      setResetSuccess(true);
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-red-500 text-center">
            <h2 className="text-2xl font-bold mb-2">Invalid or Expired Link</h2>
            <p className="text-muted-foreground mb-6">
              This password reset link is invalid or has expired. Please request a new password reset link.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full" data-testid="button-request-new-link">
                Request New Link
              </Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-green-500 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button className="w-full" data-testid="button-go-to-login">
                Go to Login
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
        <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-primary">
          <h2 className="text-3xl font-bold text-primary mb-2">Reset Password</h2>
          <p className="text-muted-foreground mb-6">
            Create a strong password. It must be at least 8 characters and include an uppercase letter and a number.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" /> New Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="At least 8 characters, with uppercase and number"
                          disabled={loading}
                          autoComplete="new-password"
                          data-testid="input-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="button-toggle-password"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {password && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i < passwordStrength 
                                  ? passwordStrength <= 2 
                                    ? 'bg-red-500' 
                                    : passwordStrength <= 3 
                                      ? 'bg-yellow-500' 
                                      : 'bg-green-500'
                                  : 'bg-muted'
                              }`} 
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {passwordStrength === 0 ? 'Very weak' : 
                           passwordStrength === 1 ? 'Weak' : 
                           passwordStrength === 2 ? 'Fair' : 
                           passwordStrength === 3 ? 'Good' : 
                           passwordStrength === 4 ? 'Strong' : 
                           'Very strong'}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Confirm New Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          disabled={loading}
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={loading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="button-toggle-confirm-password"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-red-600 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded" data-testid="text-error">
                  {form.formState.errors.root.message}
                </p>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                data-testid="button-submit"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
