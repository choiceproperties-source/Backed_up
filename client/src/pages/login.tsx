import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, Shield, Zap } from "lucide-react";
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
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    try {
      const role = await login(data.email, data.password);

      toast({
        title: "Welcome back!",
        description: "You are now signed in."
      });

      switch (role) {
        case "admin":
          setLocation("/admin");
          break;
        case "agent":
          setLocation("/agent-dashboard");
          break;
        case "landlord":
        case "property_manager":
          setLocation("/landlord-dashboard");
          break;
        default:
          setLocation("/renter-dashboard");
      }
    } catch (err: any) {
      form.setError("root", {
        message: err.message || "Invalid email or password"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 shadow-xl border-t-4 border-primary">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl font-bold">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          disabled={loading}
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
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            disabled={loading}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.root.message}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 animate-pulse" /> Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm mt-6">
              Don’t have an account?{" "}
              <Link href="/signup">
                <span className="text-primary font-semibold cursor-pointer">
                  Sign up
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