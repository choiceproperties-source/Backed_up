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
  Eye, 
  EyeOff, 
  Shield, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  MailCheck
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useState, useEffect } from "react";
import { updateMetaTags } from "@/lib/seo";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    updateMetaTags({
      title: "Login - Choice Properties",
      description:
        "Sign in to your Choice Properties account to manage your properties and applications.",
      url: "https://choiceproperties.com/login"
    });
  }, []);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setNeedsVerification(false);
    try {
      await login(data.email, data.password);

      toast({
        title: "Welcome back!",
        description: "You are now signed in."
      });
      
    } catch (err: any) {
      console.error("[Login] Error:", err);
      
      const errorMessage = err.message || "Invalid email or password";
      
      if (errorMessage.toLowerCase().includes("verify") || errorMessage.toLowerCase().includes("confirmed")) {
        setNeedsVerification(true);
        setPendingEmail(data.email);
      }

      form.setError("root", {
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    setResending(true);
    try {
      await resendVerificationEmail();
      toast({
        title: "Verification sent",
        description: `A new verification link has been sent to ${pendingEmail}.`
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to resend verification email",
        variant: "destructive"
      });
    } finally {
      setResending(false);
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
                <Shield className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Welcome Back</h2>
              <p className="text-base text-muted-foreground mt-3">
                Securely access your Choice Properties account.
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
                            disabled={loading}
                            aria-label="Email Address"
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
                        <div className="flex justify-between items-center">
                          <FormLabel className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                            <Lock className="h-3.5 w-3.5" /> 
                            Password
                          </FormLabel>
                          <Link href="/forgot-password">
                            <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                              Forgot password?
                            </span>
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative group">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-all pr-12 text-base"
                              disabled={loading}
                              aria-label="Password"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors p-1"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
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
                      className="flex flex-col gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-sm leading-relaxed"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Authentication failed</p>
                          <p className="opacity-90 font-medium">{form.formState.errors.root.message}</p>
                        </div>
                      </div>

                      {needsVerification && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-2 mt-2 border-t border-destructive/10"
                        >
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-destructive hover:text-destructive/80 font-bold flex items-center gap-2"
                            onClick={handleResendVerification}
                            disabled={resending}
                          >
                            {resending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <MailCheck className="h-3 w-3" />
                            )}
                            Resend verification email
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-primary/30 active-elevate-2" 
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="bg-card px-4 text-muted-foreground/40">Access your dashboard</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground/60">
              New to Choice Properties?{" "}
              <Link href="/signup">
                <span className="text-primary font-bold hover:underline cursor-pointer underline-offset-4 decoration-2">
                  Create an account
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