import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";

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
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AuthCallback from "@/pages/auth-callback";
import VerifyEmail from "@/pages/verify-email";
import SelectRole from "@/pages/select-role";
import Applications from "@/pages/applications";
import ApplicationDetail from "@/pages/application-detail";
import Messages from "@/pages/messages";
import RenterDashboard from "@/pages/renter-dashboard";
import TenantProfile from "@/pages/tenant-profile";
import TenantLeaseDashboard from "@/pages/tenant-lease-dashboard";
import TenantPaymentsDashboard from "@/pages/tenant-payments-dashboard";
import LandlordDashboard from "@/pages/landlord-dashboard";
import LandlordProperties from "@/pages/landlord-properties";
import LandlordApplications from "@/pages/landlord-applications";
import LandlordProfile from "@/pages/landlord-profile";
import LandlordLeaseDashboard from "@/pages/landlord-lease-dashboard";
import LandlordPaymentsVerification from "@/pages/landlord-payments-verification";
import LandlordPaymentHistory from "@/pages/landlord-payment-history";
import AgentDashboard from "@/pages/agent-dashboard-new";
import AgentProperties from "@/pages/agent-properties";
import AgentApplications from "@/pages/agent-applications";
import AgentProfile from "@/pages/agent-profile";
import Admin from "@/pages/admin";
import AdminStorageMonitor from "@/pages/admin-storage-monitor";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import Apply from "@/pages/apply";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import FAQ from "@/pages/faq";
import SuccessStories from "@/pages/success-stories";
import OwnerProfile from "@/pages/owner-profile";
import PropertyRequirements from "@/pages/property-requirements";
import LeaseSigning from "@/pages/lease-signing";
import Legal from "@/pages/Legal";

import { StickyNav } from "@/components/sticky-nav";
import { FloatingCTAButton } from "@/components/floating-cta-button";

import AOS from "aos";
import "aos/dist/aos.css";

/* ---------------- Loading ---------------- */

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

import { useAuth } from "@/lib/auth-context";

function DashboardRedirect() {
  const { user } = useAuth();
  
  if (user?.role === 'renter') return <RenterDashboard />;
  if (user?.role === 'agent') return <AgentDashboard />;
  if (user?.role === 'landlord' || user?.role === 'property_manager') return <LandlordDashboard />;
  if (user?.role === 'admin' || user?.role === 'super_admin') return <Admin />;
  
  return <NotFound />;
}


import Notifications from "@/pages/notifications";

function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        {/* Public Pages */}
        <Route path="/" component={Home} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/properties" component={Properties} />
        <Route path="/property/:id" component={PropertyDetails} />
        <Route path="/owner/:slug" component={OwnerProfile} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/faq" component={FAQ} />
        <Route path="/legal" component={Legal} />
        <Route path="/success-stories" component={SuccessStories} />
        <Route path="/property-requirements" component={PropertyRequirements} />
        <Route path="/lease-signing/:applicationId">
          <ProtectedRoute>
            <LeaseSigning />
          </ProtectedRoute>
        </Route>

        {/* Auth Pages */}
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/select-role" component={SelectRole} />

        {/* Application Pages */}
        <Route path="/apply/:id">
          <ProtectedRoute requireEmailVerification={false}>
            <Apply />
          </ProtectedRoute>
        </Route>

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

        {/* Messaging */}
        <Route path="/messages">
          <ProtectedRoute requireEmailVerification={false}>
            <Messages />
          </ProtectedRoute>
        </Route>

        {/* Renter/Tenant Routes */}
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

        {/* Landlord Routes */}
        <Route path="/landlord-dashboard">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-properties">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordProperties />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-applications">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordApplications />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-profile">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordProfile />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-lease-dashboard">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordLeaseDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-payments-verification">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordPaymentsVerification />
          </ProtectedRoute>
        </Route>

        <Route path="/landlord-payment-history">
          <ProtectedRoute requiredRoles={["landlord", "property_manager", "admin", "super_admin"]}>
            <LandlordPaymentHistory />
          </ProtectedRoute>
        </Route>

        {/* Agent Routes */}
        <Route path="/agent-dashboard">
          <ProtectedRoute requiredRoles={["agent", "admin", "super_admin"]}>
            <AgentDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/agent-properties">
          <ProtectedRoute requiredRoles={["agent", "admin", "super_admin"]}>
            <AgentProperties />
          </ProtectedRoute>
        </Route>

        <Route path="/agent-applications">
          <ProtectedRoute requiredRoles={["agent", "admin", "super_admin"]}>
            <AgentApplications />
          </ProtectedRoute>
        </Route>

        <Route path="/agent-profile">
          <ProtectedRoute requiredRoles={["agent", "admin", "super_admin"]}>
            <AgentProfile />
          </ProtectedRoute>
        </Route>

        {/* Admin Routes */}
        <Route path="/admin">
          <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
            <Admin />
          </ProtectedRoute>
        </Route>

        <Route path="/super-admin">
          <ProtectedRoute requiredRoles={["super_admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/admin-storage-monitor">
          <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
            <AdminStorageMonitor />
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        </Route>

        {/* 404 */}
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
