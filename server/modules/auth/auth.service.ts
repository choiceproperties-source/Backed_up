import { AuthRepository } from "./auth.repository";

export class AuthService {
  private repository: AuthRepository;

  constructor() {
    this.repository = new AuthRepository();
  }

  async signup(email: string, password: string, fullName: string, phone: string | null, role: string = 'renter') {
    // Validate input
    if (!email || !password || !fullName) {
      throw { status: 400, message: "Email, password, and full name are required" };
    }

    try {
      // Create user in Supabase Auth
      const authData = await this.repository.createUser(email, password, fullName, phone, role);

      // Store user profile in users table
      if (authData.user) {
        try {
          await this.repository.storeUserProfile(authData.user.id, email, fullName, phone, role);
        } catch (profileError) {
          console.error('Failed to save user profile:', profileError);
        }
      }

      return { success: true, user: authData.user };
    } catch (err: any) {
      if (err.message?.includes("duplicate") || err.message?.includes("already exists")) {
        throw { status: 400, message: "An account with this email already exists. Please sign in instead." };
      }
      console.error("[AUTH] Signup error:", err.message);
      throw { status: 400, message: err.message || "Signup failed. Please try again." };
    }
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw { status: 400, message: "Email and password are required" };
    }

    try {
      const data = await this.repository.signInWithPassword(email, password);
      return { success: true, session: data.session };
    } catch (err: any) {
      console.error("[AUTH] Login error:", err.message);
      throw { status: 401, message: "Invalid credentials" };
    }
  }

  async logout() {
    // Logout is handled on the client side (just clear session)
    return { success: true };
  }

  async resendVerificationEmail(email: string) {
    if (!email) {
      throw { status: 400, message: "Email is required" };
    }

    try {
      await this.repository.resendVerificationEmail(email);
      return { success: true, message: "Verification email sent" };
    } catch (err: any) {
      console.error("[AUTH] Resend verification error:", err.message);
      throw { status: 400, message: err.message || "Failed to resend verification email" };
    }
  }

  async getCurrentUser(userId: string) {
    if (!userId) {
      throw { status: 400, message: "User ID is required" };
    }

    try {
      const user = await this.repository.getUserById(userId);
      return user;
    } catch (err: any) {
      console.error("[AUTH] Get user error:", err);
      throw { status: 500, message: "Failed to fetch user" };
    }
  }
}
