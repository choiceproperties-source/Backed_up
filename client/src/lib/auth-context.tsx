import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User, AuthContextType, UserRole } from "./types";
import { supabase } from "./supabase";

/* ===================================================== */
/* Context */
/* ===================================================== */

const AuthContext = createContext<AuthContextType | null>(null);

/* ===================================================== */
/* Helpers */
/* ===================================================== */

const normalizeRole = (role?: string | null): UserRole | null => {
  if (!role) return null;
  if (role === "buyer") return "renter";
  return role as UserRole;
};

async function buildUser(authUser: any): Promise<User> {
  let profile: any = null;

  try {
    const { data } = await supabase
      .from("users")
      .select("role, full_name, phone, profile_image, bio")
      .eq("id", authUser.id)
      .single();

    profile = data;
  } catch {
    // Non-fatal — user may not exist yet
  }

  const role =
    normalizeRole(profile?.role) ??
    normalizeRole(authUser.user_metadata?.role);

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role: role ?? "renter",
    full_name:
      profile?.full_name ??
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      null,
    phone: profile?.phone ?? authUser.phone ?? null,
    profile_image:
      profile?.profile_image ??
      authUser.user_metadata?.avatar_url ??
      null,
    bio: profile?.bio ?? null,
    created_at: authUser.created_at,
    updated_at: null,
    email_verified: Boolean(authUser.email_confirmed_at),
    needs_role_selection: !role,
  };
}

/* ===================================================== */
/* Provider */
/* ===================================================== */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const booting = useRef(true);

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        const built = await buildUser(data.session.user);
        setUser(built);
      }

      setIsLoading(false);
      booting.current = false;
    };

    init();

    /* ---------- AUTH LISTENER ---------- */
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (booting.current) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          return;
        }

        if (session?.user) {
          const built = await buildUser(session.user);
          setUser(built);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ===================================================== */
  /* Actions */
  /* ===================================================== */

  const login = async (
    email: string,
    password: string
  ): Promise<UserRole> => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    return (
      normalizeRole(data.user?.user_metadata?.role) ?? "renter"
    );
  };

  const signup = async (
    email: string,
    name: string,
    password: string,
    phone?: string,
    role: UserRole = "renter"
  ): Promise<UserRole> => {
    const redirectBase =
      import.meta.env.VITE_APP_URL || window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback`,
        data: {
          full_name: name,
          phone,
          role,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        email,
        full_name: name,
        phone,
        role,
      });
    }

    return role;
  };

  const updateUserRole = async (role: UserRole) => {
    if (!user) throw new Error("No authenticated user");

    await supabase.auth.updateUser({
      data: { role },
    });

    await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role,
    });

    setUser({
      ...user,
      role,
      needs_role_selection: false,
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const redirectBase =
      import.meta.env.VITE_APP_URL || window.location.origin;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectBase}/reset-password`,
    });
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) throw new Error("No email available");

    const redirectBase =
      import.meta.env.VITE_APP_URL || window.location.origin;

    await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback`,
      },
    });
  };

  /* ===================================================== */

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
        isLoggedIn: Boolean(user),
        isLoading,
        isEmailVerified: Boolean(user?.email_verified),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ===================================================== */
/* Hooks */
/* ===================================================== */

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}