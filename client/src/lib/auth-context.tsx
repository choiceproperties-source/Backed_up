import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import type { User, AuthContextType, UserRole } from "./types";
import { supabase, initPromise } from "./supabase";
import { useLocation } from "wouter";

/* ------------------------------------------------ */
/* Context */
/* ------------------------------------------------ */

const AuthContext = createContext<AuthContextType | null>(null);

/* ------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------ */

const normalizeRole = (role?: string | null): UserRole | null => {
  if (!role || role === "buyer" || role === "user") return null;
  return role as UserRole;
};

const getDefaultRedirectForRole = (role: UserRole | null) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "agent":
      return "/agent-dashboard";
    case "landlord":
    case "property_manager":
      return "/landlord-dashboard";
    case "renter":
      return "/renter-dashboard";
    case "tenant":
      return "/tenant-dashboard";
    default:
      return "/select-role";
  }
};

  const buildUserFromAuth = async (authUser: any): Promise<User> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data } = await supabase
    .from("users")
    .select(`
      role, 
      full_name, 
      phone, 
      profile_image, 
      bio, 
      location, 
      specialties, 
      years_experience, 
      total_sales, 
      rating, 
      review_count, 
      license_number, 
      license_verified, 
      display_email, 
      display_phone
    `)
    .eq("id", authUser.id)
    .single();

  const role = normalizeRole(
    data?.role ?? authUser.user_metadata?.role
  );

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role,
    full_name:
      data?.full_name ??
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      null,
    phone: data?.phone ?? authUser.phone ?? null,
    profile_image:
      data?.profile_image ??
      authUser.user_metadata?.avatar_url ??
      null,
    bio: data?.bio ?? null,
    location: data?.location ?? null,
    specialties: data?.specialties ?? null,
    years_experience: data?.years_experience ?? null,
    total_sales: data?.total_sales ?? null,
    rating: data?.rating ?? null,
    review_count: data?.review_count ?? null,
    license_number: data?.license_number ?? null,
    license_verified: data?.license_verified ?? null,
    display_email: data?.display_email ?? null,
    display_phone: data?.display_phone ?? null,
    created_at: authUser.created_at,
    updated_at: null,
    email_verified: !!authUser.email_confirmed_at,
    needs_role_selection: !role
  };
};

export const buildUserFromAuthHelper = buildUserFromAuth;

/* ------------------------------------------------ */
/* Provider */
/* ------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRedirect, setAuthRedirect] = useState<string | null>(null);
  const initializing = useRef(true);
  const [, setLocation] = useLocation();

  /* ---------- INITIAL SESSION LOAD ---------- */
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      // Wait for Supabase to initialize before using it
      await initPromise;
      
      if (!supabase) {
        setAuthReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        const builtUser = await buildUserFromAuth(data.session.user);
        setUser(builtUser);
        if (builtUser.role) {
          setAuthRedirect(getDefaultRedirectForRole(builtUser.role as UserRole));
        }
      }

      setAuthReady(true);
      initializing.current = false;

  /* ---------- AUTH STATE CHANGES ---------- */
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (initializing.current) return;

          if (event === "SIGNED_OUT") {
            setUser(null);
            setAuthRedirect(null);
            return;
          }

          if (session?.user) {
            // Check if we already have a user with a role to avoid double fetch
            if (user && user.id === session.user.id && user.role) {
              return;
            }

            const builtUser = await buildUserFromAuth(session.user);
            setUser(builtUser);
            // We removed the automatic setAuthRedirect here to avoid unexpected redirects
            // during background token refreshes or state restores.
          }
        }
      );

      unsubscribe = () => {
        listener.subscription.unsubscribe();
      };
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /* ------------------------------------------------ */
  /* Actions */
  /* ------------------------------------------------ */

  const handlePostAuthRedirect = (builtUser: User) => {
    // 1. Email Verification Gate
    if (!builtUser.email_verified) {
      setLocation("/verify-email");
      return;
    }

    // 2. Intent-based Redirect
    const redirectTo = localStorage.getItem("auth_redirect_to");
    if (redirectTo) {
      localStorage.removeItem("auth_redirect_to");
      setLocation(redirectTo);
      return;
    }

    // 3. Role-based Redirect
    // Landlord -> /dashboard/landlord
    // Tenant -> /dashboard/tenant
    // Others -> /dashboard
    if (builtUser.role === "landlord" || builtUser.role === "property_manager") {
      setLocation("/landlord-dashboard");
    } else if (builtUser.role === "renter") {
      setLocation("/renter-dashboard");
    } else if (builtUser.role === "agent") {
      setLocation("/agent-dashboard");
    } else if (builtUser.role === "admin") {
      setLocation("/admin");
    } else {
      setLocation("/select-role");
    }
  };

  const login = async (email: string, password: string): Promise<UserRole> => {
    await initPromise;
    if (!supabase) throw new Error("Supabase not configured");
    
    setAuthReady(false); // Show loading state during role resolution
    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (!data.user) throw new Error("User not found");

      const builtUser = await buildUserFromAuth(data.user);
      setUser(builtUser);
      
      const role = builtUser.role as UserRole;
      if (!role) throw new Error("User role not found");
      
      handlePostAuthRedirect(builtUser);
      return role;
    } finally {
      setAuthReady(true);
    }
  };

  const signup = async (
    email: string,
    name: string,
    password: string,
    phone?: string,
    role: UserRole = "renter",
    legalConsent?: {
      termsVersion: string;
      privacyVersion: string;
      acceptedTermsAt: string;
      acceptedPrivacyAt: string;
      acceptedIp: string;
    }
  ): Promise<UserRole> => {
    await initPromise;
    
    const response = await fetch("/api/v2/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        confirmPassword: password,
        fullName: name,
        phone,
        role,
        agreeToTerms: true,
        ...legalConsent
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Signup failed");
    }

    // After backend signup, the user must verify their email before logging in.
    // We do NOT call login() here anymore to avoid establishing an unverified session.
    return role;
  };

  const updateUserRole = async (role: UserRole) => {
    await initPromise;
    if (!supabase) throw new Error("Supabase not configured");
    if (!user) throw new Error("No user");

    await supabase.auth.updateUser({ data: { role } });

    await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role
    });

    const updated = {
      ...user,
      role,
      needs_role_selection: false
    };

    setUser(updated);
    setAuthRedirect(getDefaultRedirectForRole(role));
  };

  const sendMagicLink = async (email: string) => {
    await initPromise;
    if (!supabase) throw new Error("Supabase not configured");
    await supabase.auth.signInWithOtp({ email });
  };

  const logout = async () => {
    await initPromise;
    if (!supabase) throw new Error("Supabase not configured");
    await supabase.auth.signOut();
    setUser(null);
    setAuthRedirect(null);
  };

  const resetPassword = async (email: string) => {
    await initPromise;
    if (!supabase) throw new Error("Supabase not configured");
    
    const redirectTo =
      import.meta.env.VITE_APP_URL || window.location.origin;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectTo}/reset-password`
    });
  };

  const resendVerificationEmail = async (email?: string) => {
    await initPromise;
    if (!supabase) throw new Error("Supabase not configured");
    
    const targetEmail = email || user?.email;
    if (!targetEmail) throw new Error("No email provided for verification");

    const redirectTo =
      import.meta.env.VITE_APP_URL || window.location.origin;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: { emailRedirectTo: `${redirectTo}/auth/callback` }
    });

    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        updateUserRole,
        resetPassword,
        resendVerificationEmail,
        sendMagicLink,
        isLoggedIn: !!user,
        isLoading: !authReady,
        isEmailVerified: !!user?.email_verified,
        authRedirect,
        handlePostAuthRedirect,
        updateUser: (updates: Partial<User>) => {
          setUser((prev) => {
            if (!prev) return null;
            return { ...prev, ...updates };
          });
        },
        clearAuthRedirect: () => setAuthRedirect(null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------ */

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}