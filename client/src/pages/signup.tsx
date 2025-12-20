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
  UserPlus
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
import { useState, useEffect } from "react";
import { updateMetaTags } from "@/lib/seo";
import type { UserRole } from "@/lib/types";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const { signup } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    updateMetaTags({
      title: "Sign Up - Choice Properties",
      description: "Create your Choice Properties account.",
      url: "https://choiceproperties.com/signup"
    });
  }, []);

  const form = useForm<{
    email: string;
    fullName: string;
    password: string;
    phone?: string;
    role: UserRole;
  }>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
      phone: "",
      role: "renter"
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await signup(
        data.email,
        data.fullName,
        data.password,
        data.phone,
        data.role
      );

      toast({
        title: "Account created!",
        description: "Check your email to verify your account."
      });

      setLocation("/verify-email");
    } catch (err: any) {
      form.setError("root", {
        message: err.message || "Signup failed"
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
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-3xl font-bold">Create Account</h2>
              <p className="text-sm text-muted-foreground">
                Join Choice Properties
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <User className="inline h-4 w-4 mr-1" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
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
                      <FormLabel>
                        <Mail className="inline h-4 w-4 mr-1" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
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
                      <FormLabel>
                        <Phone className="inline h-4 w-4 mr-1" />
                        Phone (optional)
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={loading} />
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
                      <FormLabel>
                        <Lock className="inline h-4 w-4 mr-1" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            {...field}
                            disabled={loading}
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
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm mt-6">
              Already have an account?{" "}
              <Link href="/login">
                <span className="text-primary font-semibold cursor-pointer">
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