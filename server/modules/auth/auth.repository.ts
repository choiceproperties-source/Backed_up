import { supabase } from "../../supabase";

export class AuthRepository {
  async createUser(email: string, password: string, fullName: string, phone: string | null, role: string) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      phone: phone || undefined,
      user_metadata: { full_name: fullName, phone: phone || null, role },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async storeUserProfile(userId: string, email: string, fullName: string, phone: string | null, role: string) {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      throw error;
    }
  }

  async getUserById(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  }
}
