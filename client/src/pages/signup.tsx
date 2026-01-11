import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { updateMetaTags } from "@/lib/seo";
import type { UserRole } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function Signup() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    updateMetaTags({
      title: "Sign Up - Choice Properties",
      description: "Create your Choice Properties account and find your next home.",
      url: "https://choiceproperties.com/signup"
    });
  }, []);

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "renter" as UserRole,
      agreeToTerms: false
    }
  });

  const password = form.watch("password");

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "Empty", color: "bg-muted" };
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-red-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-yellow-500" };
    if (score === 3) return { score: 75, label: "Medium", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-green-500" };
  }, [password]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      console.log("[Signup] Submitting:", { ...data, password: "...", confirmPassword: "..." });
      await signup(
        data.email,
        data.fullName,
        data.password,
        data.phone,
        data.role,
        {
          termsVersion: "1.0",
          privacyVersion: "1.0",
          acceptedTermsAt: new Date().toISOString(),
          acceptedPrivacyAt: new Date().toISOString(),
          acceptedIp: "client-side-captured" // In a real app, this would be captured server-side
        }
      );

      localStorage.setItem("pending_verification_email", data.email);

      toast({
        title: "Account created!",
        description: "Welcome to Choice Properties. Check your email to verify your account."
      });

      // No immediate redirect or login, stay on verify-email or redirect there
      setLocation("/verify-email");
    } catch (err: any) {
      console.error("[Signup] Error:", err);
      form.setError("root", {
        message: err.message || "Signup failed. Please try again."
      });
      toast({
        title: "Signup failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 py-12 bg-gradient-to-b from-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="p-6 md:p-8 shadow-2xl border border-border/50 hover-elevate transition-all duration-300 overflow-visible bg-card/95 backdrop-blur-sm">
            <div className="text-center mb-8">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ring-8 ring-primary/5"
              >
                <UserPlus className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Create Account</h2>
              <p className="text-base text-muted-foreground mt-3 max-w-[280px] mx-auto">
                Join Choice Properties and unlock the best real estate opportunities.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                          <User className="h-3.5 w-3.5" />
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-colors text-base"
                            {...field} 
                            disabled={loading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                            <Mail className="h-3.5 w-3.5" />
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              autoComplete="email"
                              className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-colors text-base"
                              {...field}
                              disabled={loading}
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
                        <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                          <Phone className="h-3.5 w-3.5" />
                          Phone Number (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 (555) 000-0000" 
                            className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-colors text-base"
                            {...field} 
                            disabled={loading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Professional Role
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-colors text-base">
                            <SelectValue placeholder="How will you use Choice?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border-border/50 shadow-xl">
                          <SelectItem value="renter" className="py-3">Searching for a Home (Renter)</SelectItem>
                          <SelectItem value="landlord" className="py-3">Managing My Property (Landlord)</SelectItem>
                          <SelectItem value="agent" className="py-3">Representing Clients (Agent)</SelectItem>
                          <SelectItem value="property_manager" className="py-3">Full Service Management (Manager)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                        <Lock className="h-3.5 w-3.5" />
                        Secure Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-all pr-12 text-base"
                            {...field}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors p-1"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <div className="mt-3 space-y-2 px-1">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                          <span>Security Check</span>
                          <span className={passwordStrength.label === "Strong" ? "text-green-500" : "text-muted-foreground"}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <Progress 
                          value={passwordStrength.score} 
                          className="h-1.5 bg-muted/50 overflow-hidden" 
                          indicatorClassName={`${passwordStrength.color} transition-all duration-500 ease-out`}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                        <Lock className="h-3.5 w-3.5" />
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-all text-base"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-xs text-muted-foreground">
                          I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                </div>

                <AnimatePresence mode="wait">
                  {form.formState.errors.root && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-sm leading-relaxed"
                    >
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Unable to proceed</p>
                        <p className="opacity-90">{form.formState.errors.root.message}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-primary/30 active-elevate-2" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Setting up your profile...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </form>
            </Form>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="bg-card px-4 text-muted-foreground/40">Secure verification required</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground/60">
              Already a member?{" "}
              <Link href="/login">
                <span className="text-primary font-bold hover:underline cursor-pointer underline-offset-4 decoration-2">
                  Sign in to your account
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