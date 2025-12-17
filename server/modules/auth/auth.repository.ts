import { supabase } from "../../supabase";

export class AuthRepository {
  private ensureSupabase() {
    if (!supabase) {
      throw new Error('Database connection unavailable');
    }
    return supabase;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const sb = this.ensureSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[AUTH] Email check error:', error);
      return false;
    }

    return !!data;
  }

  async createUser(email: string, password: string, fullName: string, phone: string | null, role: string) {
    const sb = this.ensureSupabase();
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      phone: phone || undefined,
      user_metadata: { full_name: fullName, phone: phone || null, role },
      email_confirm: false,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async deleteAuthUser(userId: string): Promise<void> {
    try {
      const sb = this.ensureSupabase();
      await sb.auth.admin.deleteUser(userId);
    } catch (err) {
      console.error('[AUTH] Failed to delete auth user:', err);
    }
  }

  async storeUserProfile(userId: string, email: string, fullName: string, phone: string | null, role: string) {
    const sb = this.ensureSupabase();
    const { data, error } = await sb
      .from('users')
      .upsert({
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        phone: phone || null,
        role
      }, { onConflict: 'id' })
      .select();

    if (error) {
      throw error;
    }

    return data;
  }

  async signInWithPassword(email: string, password: string) {
    const sb = this.ensureSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async resendVerificationEmail(email: string) {
    const sb = this.ensureSupabase();
    const { error } = await sb.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      throw error;
    }
  }

  async getUserById(userId: string) {
    const sb = this.ensureSupabase();
    const { data, error } = await sb
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  }
}
