import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useLocation } from 'wouter';
import { Mail, Lock, Eye, EyeOff, Shield, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect } from 'react';
import { updateMetaTags } from "@/lib/seo";
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { toast } = useToast();
  
  useEffect(() => {
    updateMetaTags({
      title: "Login - Choice Properties",
      description: "Sign in to your Choice Properties account to manage your properties, applications, and saved listings.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/login"
    });
  }, []);
  
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput & { rememberMe: boolean }>({
    resolver: zodResolver(loginSchema.extend({ rememberMe: z.boolean().optional() })),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginInput & { rememberMe: boolean }) => {
    setLoading(true);
    try {
      const role = await login(data.email, data.password, data.rememberMe);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
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
        default:
          setLocation('/renter-dashboard');
          break;
      }
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

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
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-1">Welcome Back</h2>
                <p className="text-muted-foreground text-sm">Sign in to continue to your account</p>
              </motion.div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" /> Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          disabled={loading}
                          autoComplete="email"
                          data-testid="input-email"
                          className="h-11"
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
                        <FormLabel className="font-medium text-sm flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" /> Password
                        </FormLabel>
                        <Link href="/forgot-password">
                          <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-forgot-password">
                            Forgot password?
                          </span>
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            disabled={loading}
                            autoComplete="current-password"
                            data-testid="input-password"
                            className="h-11 pr-10"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                          data-testid="checkbox-remember"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                        Remember me for 30 days
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded-md flex items-start gap-2"
                    data-testid="text-error"
                  >
                    <span>{form.formState.errors.root.message}</span>
                  </motion.div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={loading}
                  data-testid="button-submit"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 animate-pulse" /> Signing In...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <Link href="/signup">
                <span className="text-primary font-semibold cursor-pointer hover:underline" data-testid="link-signup">
                  Sign up for free
                </span>
              </Link>
            </p>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By signing in, you agree to our{' '}
            <Link href="/terms">
              <span className="hover:underline cursor-pointer">Terms</span>
            </Link>
            {' '}and{' '}
            <Link href="/privacy">
              <span className="hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
