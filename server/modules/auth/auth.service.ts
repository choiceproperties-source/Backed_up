import { AuthRepository } from "./auth.repository";

export class AuthService {
  private repository: AuthRepository;

  constructor() {
    this.repository = new AuthRepository();
  }

  async signup(email: string, password: string, fullName: string, phone: string | null, role: string = 'renter', legalConsent?: any) {
    const allowedRoles = ['renter', 'landlord', 'agent', 'property_manager', 'buyer'];
    if (!allowedRoles.includes(role)) {
      throw { status: 400, message: `Invalid role selected: ${role}. Please choose a valid role.` };
    }

    if (!email || !password || !fullName) {
      throw { status: 400, message: "Email, password, and full name are required" };
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const emailExists = await this.repository.checkEmailExists(normalizedEmail);
      if (emailExists) {
        throw { status: 400, message: "An account with this email already exists. Please sign in instead." };
      }

      const authData = await this.repository.createUser(normalizedEmail, password, fullName, phone, role);

      if (!authData.user) {
        throw { status: 500, message: "Failed to create user account. Please try again." };
      }

      // Explicitly send verification email after admin user creation
      await this.repository.resendVerificationEmail(normalizedEmail);

      try {
        await this.repository.storeUserProfile(authData.user.id, normalizedEmail, fullName, phone, role, legalConsent);
      } catch (profileError: any) {
        console.error('Failed to save user profile, rolling back auth user:', profileError);
        await this.repository.deleteAuthUser(authData.user.id);
        throw { status: 500, message: "Failed to create user profile. Please try again." };
      }

      return { success: true, user: authData.user };
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
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

  async forgotPassword(email: string) {
    if (!email) {
      throw { status: 400, message: "Email is required" };
    }

    try {
      await this.repository.resetPasswordForEmail(email);
      return { success: true, message: "Password reset email sent" };
    } catch (err: any) {
      console.error("[AUTH] Forgot password error:", err.message);
      throw { status: 400, message: err.message || "Failed to send reset email" };
    }
  }

  async resetPassword(password: string) {
    if (!password) {
      throw { status: 400, message: "Password is required" };
    }

    try {
      await this.repository.updateUserPassword(password);
      return { success: true, message: "Password updated successfully" };
    } catch (err: any) {
      console.error("[AUTH] Reset password error:", err.message);
      throw { status: 400, message: err.message || "Failed to update password" };
    }
  }

  async updateProfile(userId: string, data: { fullName?: string; displayEmail?: string; displayPhone?: string; profileImage?: string }) {
    if (!userId) {
      throw { status: 400, message: "User ID is required" };
    }

    try {
      const updatedUser = await this.repository.updateUserProfile(userId, data);
      return { success: true, user: updatedUser };
    } catch (err: any) {
      console.error("[AUTH] Update profile error:", err);
      throw { status: 500, message: "Failed to update profile" };
    }
  }
}
