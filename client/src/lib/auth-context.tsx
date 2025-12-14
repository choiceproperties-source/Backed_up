import { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthContextType, UserRole } from './types';
import { supabase } from './supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if user needs to select a role (new OAuth users)
function checkNeedsRoleSelection(authUser: any): boolean {
  if (!authUser) return false;
  const provider = authUser.app_metadata?.provider;
  if (provider === 'google' || provider === 'oauth') {
    const createdAt = new Date(authUser.created_at);
    const now = new Date();
    const isNewUser = (now.getTime() - createdAt.getTime()) < 60000; // within 1 minute
    return isNewUser;
  }
  return false;
}

async function fetchUserRole(userId: string): Promise<UserRole> {
  if (!supabase) return 'renter';
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    return (data?.role as UserRole) || 'renter';
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
  const [emailVerified, setEmailVerified] = useState(false);

  const buildUserData = async (authUser: any): Promise<User> => {
    const [role, profile] = await Promise.all([
      fetchUserRole(authUser.id),
      fetchUserProfile(authUser.id)
    ]);
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
          setLoading(false);
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userData = await buildUserData(session.user);
          setUser(userData);
          setEmailVerified(!!session.user.email_confirmed_at);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setEmailVerified(false);
          return;
        }
        
        if (session?.user) {
          const userData = await buildUserData(session.user);
          setUser(userData);
          setEmailVerified(!!session.user.email_confirmed_at);
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserRole> => {
    if (!email || !password) throw new Error('Please enter both email and password');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      throw error;
    }
    
    if (data.user) {
      const role = await fetchUserRole(data.user.id);
      return role;
    }
    return 'renter';
  };

  const signup = async (email: string, name: string, password: string, phone?: string, role?: UserRole): Promise<UserRole> => {
    if (!email || !name || !password) throw new Error('Please fill in all required fields');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const userRole = role || 'renter';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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

  const loginWithGoogle = async (): Promise<void> => {
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!email) throw new Error('Please enter your email address');
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (!supabase) throw new Error('Authentication service unavailable. Please try again later.');
    if (!user?.email) throw new Error('No email address found');
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    
    if (error) throw error;
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
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setEmailVerified(false);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setEmailVerified(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      loginWithGoogle,
      logout, 
      resetPassword,
      resendVerificationEmail,
      updateUserRole,
      isLoggedIn: !!user, 
      isLoading: loading,
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
