import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState } from 'react';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    try {
      await resetPassword(data.email);
      setEmailSent(true);
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Failed to send reset email' });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
          <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-green-500 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">
              We've sent password reset instructions to <strong>{form.getValues('email')}</strong>.
              Please check your inbox and follow the link to reset your password.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Didn't receive the email? Check your spam folder or wait a few minutes before trying again.
            </p>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setEmailSent(false)}
                data-testid="button-try-again"
              >
                Try Different Email
              </Button>
              <Link href="/login">
                <Button className="w-full" data-testid="button-back-to-login">
                  Back to Login
                </Button>
              </Link>
            </div>
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
          <Link href="/login">
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to login
            </span>
          </Link>
          
          <h2 className="text-3xl font-bold text-primary mb-2">Forgot Password?</h2>
          <p className="text-muted-foreground mb-6">
            No worries! Enter your email address and we'll send you instructions to reset your password.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={loading}
                        data-testid="input-email"
                        {...field}
                      />
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{' '}
            <Link href="/login">
              <span className="text-primary font-semibold cursor-pointer hover:underline" data-testid="link-login">Sign in</span>
            </Link>
          </p>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
