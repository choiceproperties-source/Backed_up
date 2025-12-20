import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";

import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { FavoritesProvider } from "@/hooks/use-favorites";

import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetails from "@/pages/property-details";
import NotFound from "@/pages/not-found";

import { StickyNav } from "@/components/sticky-nav";
import { FloatingCTAButton } from "@/components/floating-cta-button";

import AOS from "aos";
import "aos/dist/aos.css";

/* ---------------- Lazy Pages ---------------- */

const lazyPage = (path: string) =>
  lazy(() => import(path));

const Login = lazyPage("@/pages/login");
const Signup = lazyPage("@/pages/signup");
const ForgotPassword = lazyPage("@/pages/forgot-password");
const ResetPassword = lazyPage("@/pages/reset-password");
const AuthCallback = lazyPage("@/pages/auth-callback");
const VerifyEmail = lazyPage("@/pages/verify-email");
const SelectRole = lazyPage("@/pages/select-role");

const Applications = lazyPage("@/pages/applications");
const ApplicationDetail = lazyPage("@/pages/application-detail");
const Messages = lazyPage("@/pages/messages");

const RenterDashboard = lazyPage("@/pages/renter-dashboard");
const TenantProfile = lazyPage("@/pages/tenant-profile");
const TenantLeaseDashboard = lazyPage("@/pages/tenant-lease-dashboard");
const TenantPaymentsDashboard = lazyPage("@/pages/tenant-payments-dashboard");

const LandlordDashboard = lazyPage("@/pages/landlord-dashboard");
const LandlordProperties = lazyPage("@/pages/landlord-properties");
const LandlordApplications = lazyPage("@/pages/landlord-applications");
const LandlordProfile = lazyPage("@/pages/landlord-profile");
const LandlordLeaseDashboard = lazyPage("@/pages/landlord-lease-dashboard");
const LandlordPaymentsVerification = lazyPage("@/pages/landlord-payments-verification");
const LandlordPaymentHistory = lazyPage("@/pages/landlord-payment-history");

const AgentDashboard = lazyPage("@/pages/agent-dashboard-new");
const AgentProperties = lazyPage("@/pages/agent-properties");
const AgentApplications = lazyPage("@/pages/agent-applications");
const AgentProfile = lazyPage("@/pages/agent-profile");

const Admin = lazyPage("@/pages/admin");
const AdminStorageMonitor = lazyPage("@/pages/admin-storage-monitor");

const Apply = lazyPage("@/pages/apply");
const About = lazyPage("@/pages/about");
const Contact = lazyPage("@/pages/contact");
const Privacy = lazyPage("@/pages/privacy");
const Terms = lazyPage("@/pages/terms");
const FAQ = lazyPage("@/pages/faq");
const SuccessStories = lazyPage("@/pages/success-stories");
const OwnerProfile = lazyPage("@/pages/owner-profile");
const PropertyRequirements = lazyPage("@/pages/property-requirements");

/* ---------------- Loading ---------------- */

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ---------------- Router ---------------- */

function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/properties" component={Properties} />
        <Route path="/property/:id" component={PropertyDetails} />
        <Route path="/owner/:slug" component={OwnerProfile} />

        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/select-role" component={SelectRole} />

        <Route path="/applications">
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        </Route>

        <Route path="/applications/:id">
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        </Route>

        <Route path="/messages">
          <ProtectedRoute requireEmailVerification={false}>
            <Messages />
          </ProtectedRoute>
        </Route>

        <Route path="/renter-dashboard">
          <ProtectedRoute requiredRoles={["renter"]}>
            <RenterDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/tenant-profile">
          <ProtectedRoute requiredRoles={["renter"]}>
            <TenantProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/tenant-lease-dashboard">
          <ProtectedRoute requiredRoles={["renter"]}>
            <TenantLeaseDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/tenant-payments">
          <ProtectedRoute requiredRoles={["renter"]}>
            <TenantPaymentsDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-dashboard">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin"]}>
            <LandlordDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/agent-dashboard">
          <ProtectedRoute requiredRoles={["agent", "admin"]}>
            <AgentDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/admin">
          <ProtectedRoute requiredRoles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  return (
    <AuthProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <FavoritesProvider>
              <Toaster />
              <SonnerToaster richColors position="top-right" />
              <StickyNav />
              <FloatingCTAButton />
              <Router />
            </FavoritesProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </AuthProvider>
  );
}