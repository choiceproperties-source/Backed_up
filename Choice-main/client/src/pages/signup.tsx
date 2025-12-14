import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Link, useLocation } from 'wouter';
import { Mail, Lock, User, Phone, Eye, EyeOff, Home, Building2, Users, Briefcase } from 'lucide-react';
import { SiGoogle } from 'react-icons/si';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useMemo, useEffect } from 'react';
import { updateMetaTags } from "@/lib/seo";
import { z } from 'zod';
import type { UserRole } from '@/lib/types';

const SIGNUP_ROLES: { value: UserRole; label: string; description: string; icon: typeof Home }[] = [
  { value: 'renter', label: 'Renter', description: 'Looking to rent a property', icon: Home },
  { value: 'buyer', label: 'Buyer', description: 'Looking to buy a property', icon: Home },
  { value: 'landlord', label: 'Landlord', description: 'Individual property owner', icon: Building2 },
  { value: 'property_manager', label: 'Property Manager', description: 'Manage multiple properties', icon: Users },
  { value: 'agent', label: 'Real Estate Agent', description: 'Licensed agent', icon: Briefcase },
];

const extendedSignupSchema = signupSchema.extend({
  phone: z.string().optional(),
  role: z.enum(['renter', 'buyer', 'landlord', 'property_manager', 'agent']),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and privacy policy',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ExtendedSignupInput = z.infer<typeof extendedSignupSchema>;

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

export default function Signup() {
  useEffect(() => {
    updateMetaTags({
      title: "Sign Up - Choice Properties",
      description: "Create your Choice Properties account. Browse rentals, apply for properties, and find your perfect home.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/signup"
    });
  }, []);

  const { signup, loginWithGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ExtendedSignupInput>({
    resolver: zodResolver(extendedSignupSchema),
    defaultValues: {
      email: '',
      fullName: '',
      phone: '',
      role: 'renter',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const password = form.watch('password');
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const onSubmit = async (data: ExtendedSignupInput) => {
    setLoading(true);
    try {
      await signup(data.email, data.fullName, data.password, data.phone, data.role);
      // Redirect to email verification page instead of showing success screen
      setLocation('/verify-email');
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Signup failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      form.setError('root', { message: err.message || 'Google signup failed' });
      setGoogleLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="max-w-md w-full p-8 shadow-xl border-t-4 border-t-primary">
          <h2 className="text-3xl font-bold text-primary mb-2">Create Account</h2>
          <p className="text-sm text-muted-foreground mb-6">Join Choice Properties today and start exploring</p>

          <Button 
            type="button"
            variant="outline" 
            className="w-full mb-4 flex items-center justify-center gap-2"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
            data-testid="button-google-signup"
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
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <User className="h-4 w-4" /> Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        disabled={loading || googleLoading}
                        data-testid="input-fullname"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        disabled={loading || googleLoading}
                        data-testid="input-phone"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-sm">I am a...</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2">
                        {SIGNUP_ROLES.map((roleOption) => {
                          const Icon = roleOption.icon;
                          const isSelected = field.value === roleOption.value;
                          return (
                            <button
                              key={roleOption.value}
                              type="button"
                              onClick={() => field.onChange(roleOption.value)}
                              disabled={loading || googleLoading}
                              data-testid={`button-role-${roleOption.value}`}
                              className={`p-3 rounded-md border text-left transition-all ${
                                isSelected 
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                                  {roleOption.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{roleOption.description}</p>
                            </button>
                          );
                        })}
                      </div>
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
                    <FormLabel className="font-semibold text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 8 chars, uppercase, number"
                          disabled={loading || googleLoading}
                          autoComplete="new-password"
                          data-testid="input-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading || googleLoading}
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
                      <Lock className="h-4 w-4" /> Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          disabled={loading || googleLoading}
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={loading || googleLoading}
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

              <FormField
                control={form.control}
                name="agreeToTerms"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading || googleLoading}
                        data-testid="checkbox-terms"
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                        I agree to the{' '}
                        <Link href="/terms">
                          <span className="text-primary font-semibold hover:underline">Terms of Service</span>
                        </Link>
                        {' '}and{' '}
                        <Link href="/privacy">
                          <span className="text-primary font-semibold hover:underline">Privacy Policy</span>
                        </Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="text-red-600 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded" data-testid="text-error">
                  {form.formState.errors.root.message}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || googleLoading}
                data-testid="button-submit"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
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
