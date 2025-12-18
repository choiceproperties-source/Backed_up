import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useLocation } from 'wouter';
import { Mail, Lock, User, Phone, Eye, EyeOff, Home, Building2, Users, Briefcase, Check, X, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useState, useMemo, useEffect } from 'react';
import { updateMetaTags } from "@/lib/seo";
import { z } from 'zod';
import type { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const SIGNUP_ROLES: { value: UserRole; label: string; description: string; icon: typeof Home }[] = [
  { value: 'renter', label: 'Renter', description: 'Looking to rent a property', icon: Home },
  { value: 'landlord', label: 'Landlord', description: 'Individual property owner', icon: Building2 },
  { value: 'property_manager', label: 'Property Manager', description: 'Manage multiple properties', icon: Users },
  { value: 'agent', label: 'Real Estate Agent', description: 'Licensed agent', icon: Briefcase },
];

const extendedSignupSchema = signupSchema.extend({
  phone: z.string().optional(),
  role: z.enum(['renter', 'landlord', 'property_manager', 'agent']),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and privacy policy',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ExtendedSignupInput = z.infer<typeof extendedSignupSchema>;

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

const getStrengthLabel = (strength: number) => {
  if (strength === 0) return { label: 'Very weak', color: 'bg-red-500' };
  if (strength === 1) return { label: 'Weak', color: 'bg-red-500' };
  if (strength === 2) return { label: 'Fair', color: 'bg-yellow-500' };
  if (strength === 3) return { label: 'Good', color: 'bg-yellow-500' };
  if (strength === 4) return { label: 'Strong', color: 'bg-green-500' };
  return { label: 'Very strong', color: 'bg-green-500' };
};

export default function Signup() {
  const { toast } = useToast();
  
  useEffect(() => {
    updateMetaTags({
      title: "Sign Up - Choice Properties",
      description: "Create your Choice Properties account. Browse rentals, apply for properties, and find your perfect home.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/signup"
    });
  }, []);

  const { signup } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const STORAGE_KEY = 'signup_step1_data';

  const getStoredData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          email: parsed.email || '',
          fullName: parsed.fullName || '',
          phone: parsed.phone || '',
          role: parsed.role || 'renter',
        };
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  };

  const storedData = getStoredData();

  const form = useForm<ExtendedSignupInput>({
    resolver: zodResolver(extendedSignupSchema),
    defaultValues: {
      email: storedData?.email || '',
      fullName: storedData?.fullName || '',
      phone: storedData?.phone || '',
      role: storedData?.role || 'renter',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthInfo = getStrengthLabel(passwordStrength);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const saveStep1Data = () => {
    const values = form.getValues();
    const step1Data = {
      email: values.email,
      fullName: values.fullName,
      phone: values.phone,
      role: values.role,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(step1Data));
  };

  const clearStoredData = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const parseServerError = (message: string) => {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('email') && (lowerMsg.includes('exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('already'))) {
      form.setError('email', { message: 'An account with this email already exists. Please sign in instead.' });
      setStep(1);
      return;
    }
    if (lowerMsg.includes('password')) {
      form.setError('password', { message });
      return;
    }
    form.setError('root', { message });
  };

  const onSubmit = async (data: ExtendedSignupInput) => {
    setLoading(true);
    try {
      await signup(data.email, data.fullName, data.password, data.phone, data.role);
      clearStoredData();
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
      setLocation('/verify-email');
    } catch (err: any) {
      parseServerError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToStep2 = async () => {
    const isValid = await form.trigger(['fullName', 'email', 'phone', 'role']);
    if (isValid) {
      saveStep1Data();
      setStep(2);
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
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-1">Create Account</h2>
                <p className="text-muted-foreground text-sm">Join Choice Properties and find your perfect home</p>
              </motion.div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-sm flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" /> Full Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="John Doe"
                                disabled={loading}
                                autoComplete="name"
                                data-testid="input-fullname"
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
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-sm flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" /> Phone 
                              <span className="text-muted-foreground font-normal">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                disabled={loading}
                                autoComplete="tel"
                                data-testid="input-phone"
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
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-sm">I am a...</FormLabel>
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
                                      disabled={loading}
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

                      {form.formState.errors.root && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-600 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded-md"
                          data-testid="text-error"
                        >
                          {form.formState.errors.root.message}
                        </motion.div>
                      )}

                      <Button 
                        type="button"
                        onClick={goToStep2}
                        className="w-full h-11" 
                        disabled={loading}
                        data-testid="button-continue"
                      >
                        Continue
                      </Button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-1"
                        data-testid="button-back"
                      >
                        <span>Back to details</span>
                      </button>

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium text-sm flex items-center gap-2">
                              <Lock className="h-4 w-4 text-muted-foreground" /> Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Create a strong password"
                                  disabled={loading}
                                  autoComplete="new-password"
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
                            
                            {password && (
                              <div className="mt-3 space-y-3">
                                <div className="flex gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                                        i < passwordStrength ? strengthInfo.color : 'bg-muted'
                                      }`} 
                                    />
                                  ))}
                                </div>
                                <p className={`text-xs font-medium ${
                                  passwordStrength <= 1 ? 'text-red-500' : 
                                  passwordStrength <= 3 ? 'text-yellow-600' : 
                                  'text-green-600'
                                }`}>
                                  {strengthInfo.label}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  {PASSWORD_REQUIREMENTS.map((req, i) => {
                                    const passed = req.test(password);
                                    return (
                                      <div key={i} className="flex items-center gap-2">
                                        {passed ? (
                                          <Check className="h-3.5 w-3.5 text-green-500" />
                                        ) : (
                                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                        <span className={`text-xs ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
                                          {req.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
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
                            <FormLabel className="font-medium text-sm flex items-center gap-2">
                              <Lock className="h-4 w-4 text-muted-foreground" /> Confirm Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  placeholder="Confirm your password"
                                  disabled={loading}
                                  autoComplete="new-password"
                                  data-testid="input-confirm-password"
                                  className="h-11 pr-10"
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
                            {confirmPassword && (
                              <div className="flex items-center gap-2 mt-2">
                                {passwordsMatch ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-xs text-green-600">Passwords match</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-xs text-red-500">Passwords don't match</span>
                                  </>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="agreeToTerms"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 space-y-0 pt-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={loading}
                                data-testid="checkbox-terms"
                                className="mt-0.5"
                              />
                            </FormControl>
                            <div className="flex-1">
                              <FormLabel className="text-sm font-normal text-muted-foreground leading-relaxed cursor-pointer">
                                I agree to the{' '}
                                <Link href="/terms">
                                  <span className="text-primary hover:underline">Terms of Service</span>
                                </Link>
                                {' '}and{' '}
                                <Link href="/privacy">
                                  <span className="text-primary hover:underline">Privacy Policy</span>
                                </Link>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.formState.errors.root && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-600 text-sm bg-red-50 dark:bg-red-950/50 p-3 rounded-md"
                          data-testid="text-error"
                        >
                          {form.formState.errors.root.message}
                        </motion.div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full h-11" 
                        disabled={loading}
                        data-testid="button-create-account"
                      >
                        {loading ? 'Creating Account...' : 'Create Account'}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link href="/login">
                <span className="text-primary font-semibold cursor-pointer hover:underline" data-testid="link-login">
                  Sign in
                </span>
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
