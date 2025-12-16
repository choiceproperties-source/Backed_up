import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useLocation } from 'wouter';
import { Mail, Lock, Eye, EyeOff, Sparkles, Shield, Zap, CheckCircle } from 'lucide-react';
import { SiGoogle, SiGithub } from 'react-icons/si';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useEffect } from 'react';
import { updateMetaTags } from "@/lib/seo";
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type MagicLinkInput = z.infer<typeof magicLinkSchema>;

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
  
  const { login, loginWithGoogle, loginWithGithub, sendMagicLink } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic'>('password');

  const form = useForm<LoginInput & { rememberMe: boolean }>({
    resolver: zodResolver(loginSchema.extend({ rememberMe: z.boolean().optional() })),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const magicLinkForm = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: '',
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

  const handleGithubLogin = async () => {
    setGithubLoading(true);
    try {
      await loginWithGithub();
    } catch (err: any) {
      form.setError('root', { message: err.message || 'GitHub login failed' });
      setGithubLoading(false);
    }
  };

  const handleMagicLink = async (data: MagicLinkInput) => {
    setMagicLinkLoading(true);
    try {
      await sendMagicLink(data.email);
      setMagicLinkSent(true);
    } catch (err: any) {
      magicLinkForm.setError('root', { message: err.message || 'Failed to send magic link' });
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const isAnyLoading = loading || googleLoading || githubLoading || magicLinkLoading;

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

            <div className="flex gap-3 mb-6">
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleGoogleLogin}
                disabled={isAnyLoading}
                data-testid="button-google-login"
              >
                <SiGoogle className="h-4 w-4" />
                <span className="hidden sm:inline">{googleLoading ? 'Connecting...' : 'Google'}</span>
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="flex-1 flex items-center justify-center gap-2"
                onClick={handleGithubLogin}
                disabled={isAnyLoading}
                data-testid="button-github-login"
              >
                <SiGithub className="h-4 w-4" />
                <span className="hidden sm:inline">{githubLoading ? 'Connecting...' : 'GitHub'}</span>
              </Button>
            </div>

            <div className="flex items-center gap-4 my-6">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">or continue with</span>
              <Separator className="flex-1" />
            </div>

            <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'password' | 'magic')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="password" className="flex items-center gap-2" data-testid="tab-password">
                  <Lock className="h-3.5 w-3.5" /> Password
                </TabsTrigger>
                <TabsTrigger value="magic" className="flex items-center gap-2" data-testid="tab-magic">
                  <Sparkles className="h-3.5 w-3.5" /> Magic Link
                </TabsTrigger>
              </TabsList>

                <TabsContent value="password" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
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
                                  disabled={isAnyLoading}
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
                                    disabled={isAnyLoading}
                                    autoComplete="current-password"
                                    data-testid="input-password"
                                    className="h-11 pr-10"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isAnyLoading}
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
                                  disabled={isAnyLoading}
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
                          disabled={isAnyLoading}
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
                  </motion.div>
                </TabsContent>

                <TabsContent value="magic" className="mt-0">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {magicLinkSent ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-6"
                      >
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          We've sent a magic link to <strong>{magicLinkForm.getValues('email')}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Click the link in your email to sign in instantly. No password needed!
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setMagicLinkSent(false)}
                          className="w-full"
                          data-testid="button-try-different-email"
                        >
                          Use Different Email
                        </Button>
                      </motion.div>
                    ) : (
                      <Form {...magicLinkForm}>
                        <form onSubmit={magicLinkForm.handleSubmit(handleMagicLink)} className="space-y-4">
                          <div className="bg-muted/50 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-3">
                              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium mb-1">Passwordless Login</p>
                                <p className="text-xs text-muted-foreground">
                                  We'll send you a secure link. Click it to sign in instantly without a password.
                                </p>
                              </div>
                            </div>
                          </div>

                          <FormField
                            control={magicLinkForm.control}
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
                                    disabled={isAnyLoading}
                                    autoComplete="email"
                                    data-testid="input-magic-email"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {magicLinkForm.formState.errors.root && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-600 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded-md"
                              data-testid="text-magic-error"
                            >
                              {magicLinkForm.formState.errors.root.message}
                            </motion.div>
                          )}

                          <Button 
                            type="submit" 
                            className="w-full h-11" 
                            disabled={isAnyLoading}
                            data-testid="button-send-magic-link"
                          >
                            {magicLinkLoading ? (
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 animate-pulse" /> Sending...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> Send Magic Link
                              </span>
                            )}
                          </Button>
                        </form>
                      </Form>
                    )}
                  </motion.div>
                </TabsContent>
            </Tabs>

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
