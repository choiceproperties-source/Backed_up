import { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthContextType, UserRole } from './types';
import { supabase } from './supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if user needs to select a role
function checkNeedsRoleSelection(authUser: any): boolean {
  if (!authUser) return false;
  const metadata = authUser.user_metadata || {};
  return !metadata.role;
}

async function fetchUserRole(userId: string): Promise<UserRole> {
  if (!supabase) return 'renter';
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const role = data?.role as UserRole;
    // Migrate legacy "buyer" role to "renter"
    if (role === 'buyer') {
      return 'renter';
    }
    return role || 'renter';
  } catch {
    return 'renter';
  }
}

async function fetchUserProfile(userId: string): Promise<Partial<User>> {
  if (!supabase) return {};
  try {
    const { data } = await supabase
      .from('users')
      .select('full_name, phone, profile_image, bio')
      .eq('id', userId)
      .single();
    return data || {};
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const buildUserData = async (authUser: any): Promise<User> => {
    console.log('[AUTH] Building user data for:', authUser.id);
    const [role, profile] = await Promise.all([
      fetchUserRole(authUser.id),
      fetchUserProfile(authUser.id)
    ]);
    console.log('[AUTH] User role fetched:', role);
    return {
      id: authUser.id,
      email: authUser.email || '',
      full_name: profile.full_name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
      phone: profile.phone || authUser.phone || null,
      role,
      profile_image: profile.profile_image || authUser.user_metadata?.avatar_url || null,
      bio: profile.bio || null,
      created_at: authUser.created_at,
      updated_at: null,
      email_verified: !!authUser.email_confirmed_at,
      needs_role_selection: checkNeedsRoleSelection(authUser)
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!supabase) {
          console.log('[AUTH] Supabase not configured');
          setLoading(false);
          setAuthReady(true);
          return;
        }
        
        console.log('[AUTH] Initializing Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('[AUTH] Session found, building user data');
          const userData = await buildUserData(session.user);
          setUser(userData);
          setEmailVerified(!!session.user.email_confirmed_at);
        } else {
          console.log('[AUTH] No active session');
        }
      } catch (error) {
        console.error('[AUTH] Initialization error:', error);
      } finally {
        setLoading(false);
        // CRITICAL: Mark auth as ready AFTER initial session check
        setAuthReady(true);
      }
    };

    initAuth();

    // Handle "don't remember me" - clear session on browser/tab close
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('clearSessionOnClose') === 'true' && supabase) {
        // Clear the auth session from localStorage when user didn't want to be remembered
        localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (supabase) {
      console.log('[AUTH] Setting up auth state listener');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH] Auth state changed:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('[AUTH] User signed out');
          setUser(null);
          setEmailVerified(false);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            console.log('[AUTH] Building user data after state change');
            const userData = await buildUserData(session.user);
            setUser(userData);
            setEmailVerified(!!session.user.email_confirmed_at);
          }
        }
      });

      return () => {
        subscription?.unsubscribe();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true): Promise<UserRole> => {
    if (!email || !password) throw new Error('Please enter both email and password');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    console.log('[AUTH] Login attempt for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('[AUTH] Login error:', error.message);
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      throw error;
    }
    
    console.log('[AUTH] Login successful, fetching role...');
    
    // Handle session persistence based on rememberMe preference
    // If rememberMe is false, we'll clear session on tab/browser close
    if (!rememberMe && data.session) {
      // Store a flag to clear session on page unload
      sessionStorage.setItem('clearSessionOnClose', 'true');
    } else {
      sessionStorage.removeItem('clearSessionOnClose');
    }
    
    if (data.user) {
      const role = await fetchUserRole(data.user.id);
      console.log('[AUTH] Login completed with role:', role);
      return role;
    }
    return 'renter';
  };

  // Helper to get app URL for email redirects - uses env var if set, falls back to origin
  const getAppUrl = (): string => {
    // Use VITE_APP_URL if configured (for custom domains/staging), otherwise use current origin (works on Replit)
    return import.meta.env.VITE_APP_URL || window.location.origin;
  };

  const signup = async (email: string, name: string, password: string, phone?: string, role?: UserRole): Promise<UserRole> => {
    if (!email || !name || !password) throw new Error('Please fill in all required fields');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const userRole = role || 'renter';
    
    // Store email in localStorage for resend verification fallback
    localStorage.setItem('pending_verification_email', email);
    
    // Get the app URL for email redirect
    const appUrl = getAppUrl();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: { 
          name,
          full_name: name,
          phone: phone || null,
          role: userRole
        }
      }
    });
    
    if (error) throw error;
    
    if (data.user && !data.user.identities?.length) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    
    // Store user data in users table
    if (data.user) {
      try {
        await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: name,
            phone: phone || null,
            role: userRole
          }, { onConflict: 'id' });
      } catch (profileError) {
        console.error('Failed to save user profile:', profileError);
      }
    }
    
    return userRole;
  };

  const sendMagicLink = async (email: string): Promise<void> => {
    if (!email) throw new Error('Please enter your email address');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const appUrl = getAppUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`
      }
    });
    
    if (error) throw error;
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!email) throw new Error('Please enter your email address');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const appUrl = getAppUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`
    });
    
    if (error) throw error;
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    // Try to get email from user state, or fall back to localStorage
    const email = user?.email || localStorage.getItem('pending_verification_email');
    
    if (!email) {
      throw new Error('No email address found. Please sign up again.');
    }
    
    // Get the app URL for email redirect
    const appUrl = getAppUrl();
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`
      }
    });
    
    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a few minutes before trying again.');
      }
      console.error('[Auth] Resend verification error:', error);
      throw error;
    }
  };

  const updateUserRole = async (role: UserRole): Promise<void> => {
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    if (!user?.id) throw new Error('No user found');
    
    // Update user metadata
    const { error: metaError } = await supabase.auth.updateUser({
      data: { role }
    });
    
    if (metaError) throw metaError;
    
    // Update users table
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: role
      }, { onConflict: 'id' });
    
    if (dbError) throw dbError;
    
    // Update local state
    setUser(prev => prev ? { ...prev, role, needs_role_selection: false } : null);
  };

  const logout = async () => {
    try {
      console.log('[AUTH] Logout initiated');
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setEmailVerified(false);
      console.log('[AUTH] Logout completed');
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      setUser(null);
      setEmailVerified(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      sendMagicLink,
      logout, 
      resetPassword,
      resendVerificationEmail,
      updateUserRole,
      isLoggedIn: !!user, 
      isLoading: !authReady,
      isEmailVerified: emailVerified
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (!supabase) {
      return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    return null;
  }
}
