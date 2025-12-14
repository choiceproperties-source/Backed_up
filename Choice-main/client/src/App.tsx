import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedRoute } from "@/components/protected-route";
import { lazy, Suspense as ReactSuspense } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetails from "@/pages/property-details";
import { AuthProvider } from "@/lib/auth-context";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

// Lazy load pages that aren't immediately needed
const Apply = lazy(() => import("@/pages/apply"));
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const OwnerProfile = lazy(() => import("@/pages/owner-profile"));
const Applications = lazy(() => import("@/pages/applications"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const AuthCallback = lazy(() => import("@/pages/auth-callback"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const SelectRole = lazy(() => import("@/pages/select-role"));
const FAQ = lazy(() => import("@/pages/faq"));
const Admin = lazy(() => import("@/pages/admin"));
const RenterDashboard = lazy(() => import("@/pages/renter-dashboard"));
const ApplicationDetail = lazy(() => import("@/pages/application-detail"));
const TenantProfile = lazy(() => import("@/pages/tenant-profile"));
const LandlordDashboard = lazy(() => import("@/pages/landlord-dashboard"));
const LandlordProperties = lazy(() => import("@/pages/landlord-properties"));
const LandlordApplications = lazy(() => import("@/pages/landlord-applications"));
const ApplicationReview = lazy(() => import("@/pages/application-review"));
const LandlordProfile = lazy(() => import("@/pages/landlord-profile"));
const AgentDashboard = lazy(() => import("@/pages/agent-dashboard-new"));
const AgentProperties = lazy(() => import("@/pages/agent-properties"));
const AgentApplications = lazy(() => import("@/pages/agent-applications"));
const AgentProfile = lazy(() => import("@/pages/agent-profile"));
const Messages = lazy(() => import("@/pages/messages"));
const TenantLeaseDashboard = lazy(() => import("@/pages/tenant-lease-dashboard"));
const LandlordLeaseDashboard = lazy(() => import("@/pages/landlord-lease-dashboard"));
const TenantPaymentsDashboard = lazy(() => import("@/pages/tenant-payments-dashboard"));
const LandlordPaymentsVerification = lazy(() => import("@/pages/landlord-payments-verification"));
const LandlordPaymentHistory = lazy(() => import("@/pages/landlord-payment-history"));
const AdminStorageMonitor = lazy(() => import("@/pages/admin-storage-monitor"));
const PropertyRequirements = lazy(() => import("@/pages/property-requirements"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading page content">
      <div className="text-muted-foreground flex flex-col items-center gap-2">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
        <span>Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/property/:id" component={PropertyDetails} />
      <Route path="/owner/:slug" component={OwnerProfile} />
      <Route path="/apply">
        <ReactSuspense fallback={<LoadingFallback />}>
          <Apply />
        </ReactSuspense>
      </Route>
      <Route path="/applications">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute>
            <Applications />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/applications/:id">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/login">
        <ReactSuspense fallback={<LoadingFallback />}>
          <Login />
        </ReactSuspense>
      </Route>
      <Route path="/signup">
        <ReactSuspense fallback={<LoadingFallback />}>
          <Signup />
        </ReactSuspense>
      </Route>
      <Route path="/forgot-password">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ForgotPassword />
        </ReactSuspense>
      </Route>
      <Route path="/reset-password">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ResetPassword />
        </ReactSuspense>
      </Route>
      <Route path="/auth/callback">
        <ReactSuspense fallback={<LoadingFallback />}>
          <AuthCallback />
        </ReactSuspense>
      </Route>
      <Route path="/verify-email">
        <ReactSuspense fallback={<LoadingFallback />}>
          <VerifyEmail />
        </ReactSuspense>
      </Route>
      <Route path="/select-role">
        <ReactSuspense fallback={<LoadingFallback />}>
          <SelectRole />
        </ReactSuspense>
      </Route>
      <Route path="/faq">
        <ReactSuspense fallback={<LoadingFallback />}>
          <FAQ />
        </ReactSuspense>
      </Route>
      <Route path="/admin">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['admin']}>
            <Admin />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/renter-dashboard">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute>
            <RenterDashboard />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/about">
        <ReactSuspense fallback={<LoadingFallback />}>
          <About />
        </ReactSuspense>
      </Route>
      <Route path="/contact">
        <ReactSuspense fallback={<LoadingFallback />}>
          <Contact />
        </ReactSuspense>
      </Route>
      <Route path="/privacy">
        <ReactSuspense fallback={<LoadingFallback />}>
          <Privacy />
        </ReactSuspense>
      </Route>
      <Route path="/terms">
        <ReactSuspense fallback={<LoadingFallback />}>
          <Terms />
        </ReactSuspense>
      </Route>
      <Route path="/tenant-profile">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['renter']}>
            <TenantProfile />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-dashboard">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordDashboard />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-properties">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordProperties />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-applications">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordApplications />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/application-review/:id">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'agent', 'admin']}>
            <ApplicationReview />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-profile">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordProfile />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/agent-dashboard">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['agent', 'admin']}>
            <AgentDashboard />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/agent-properties">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['agent', 'admin']}>
            <AgentProperties />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/agent-applications">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['agent', 'admin']}>
            <AgentApplications />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/agent-profile">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['agent', 'admin']}>
            <AgentProfile />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/messages">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/tenant-lease-dashboard">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['renter']}>
            <TenantLeaseDashboard />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-lease-dashboard">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordLeaseDashboard />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/tenant-payments">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['renter']}>
            <TenantPaymentsDashboard />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-payments-verification">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordPaymentsVerification />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/landlord-payment-history/:leaseId">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['landlord', 'admin']}>
            <LandlordPaymentHistory />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/admin/storage-monitor">
        <ReactSuspense fallback={<LoadingFallback />}>
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminStorageMonitor />
          </ProtectedRoute>
        </ReactSuspense>
      </Route>
      <Route path="/property-requirements">
        <ReactSuspense fallback={<LoadingFallback />}>
          <PropertyRequirements />
        </ReactSuspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  return (
    <AuthProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
