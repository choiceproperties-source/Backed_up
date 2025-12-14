import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link, useLocation } from 'wouter';
import { Mail, Lock } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect } from 'react';
import { updateMetaTags } from "@/lib/seo";

export default function Login() {
  useEffect(() => {
    updateMetaTags({
      title: "Login - Choice Properties",
      description: "Sign in to your Choice Properties account to manage your properties, applications, and saved listings.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/login"
    });
  }, []);
  const { login, loginWithGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const role = await login(data.email, data.password);
      // Redirect based on user role
      switch (role) {
        case 'admin':
          setLocation('/admin');
          break;
        case 'agent':
          setLocation('/agent-dashboard');
          break;
        case 'landlord':
        case 'property_manager':
          setLocation('/landlord-dashboard');
          break;
        case 'renter':
        case 'buyer':
        default:
          setLocation('/');
          break;
      }
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Google login failed' });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-primary">
          <h2 className="text-3xl font-bold text-primary mb-2">Welcome Back</h2>
          <p className="text-muted-foreground mb-6">Sign in to your account</p>

          <Button 
            type="button"
            variant="outline" 
            className="w-full mb-4 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            data-testid="button-google-login"
          >
            <SiGoogle className="h-4 w-4" />
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          <div className="flex items-center gap-4 my-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={loading || googleLoading}
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-semibold text-sm flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Password
                      </FormLabel>
                      <Link href="/forgot-password">
                        <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-forgot-password">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 8 characters, with uppercase and number"
                        disabled={loading || googleLoading}
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters, contain an uppercase letter and a number
                    </p>
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
                disabled={loading || googleLoading}
                data-testid="button-submit"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link href="/signup">
              <span className="text-primary font-semibold cursor-pointer hover:underline" data-testid="link-signup">Sign up</span>
            </Link>
          </p>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
