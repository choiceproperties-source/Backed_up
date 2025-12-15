import { supabase } from "../../supabase";

export interface PaymentData {
  id: string;
  type: string;
  amount: number;
  status: string;
  due_date?: string;
  paid_at?: string;
  verified_at?: string;
  reference_id?: string;
  created_at?: string;
  updated_at?: string;
  leases?: any;
}

export class PaymentRepository {
  async getPaymentById(paymentId: string): Promise<PaymentData | null> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error) throw error;
    return data;
  }

  async getPaymentWithLeaseInfo(paymentId: string): Promise<PaymentData | null> {
    const { data, error } = await supabase
      .from("payments")
      .select("*, leases(landlord_id, application_id, tenant_id)")
      .eq("id", paymentId)
      .single();

    if (error) throw error;
    return data;
  }

  async getPaymentWithFullDetails(paymentId: string): Promise<PaymentData | null> {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        type,
        amount,
        due_date,
        paid_at,
        verified_at,
        reference_id,
        status,
        created_at,
        leases(
          id,
          application_id,
          monthly_rent,
          security_deposit_amount,
          applications(
            id,
            property_id,
            tenant_id,
            properties(title, address),
            users(full_name, email)
          )
        ),
        verified_by_user:users!payments_verified_by_fkey(full_name, email)
      `)
      .eq("id", paymentId)
      .single();

    if (error) throw error;
    return data;
  }

  async updatePaymentVerified(
    paymentId: string,
    userId: string,
    amount: number,
    method: string,
    dateReceived: string
  ): Promise<void> {
    const { error } = await supabase
      .from("payments")
      .update({
        status: "verified",
        verified_by: userId,
        verified_at: new Date().toISOString(),
        paid_at: new Date(dateReceived).toISOString(),
        manual_payment_method: method,
        amount: parseFloat(amount.toString()),
        updated_at: new Date().toISOString()
      })
      .eq("id", paymentId);

    if (error) throw error;
  }

  async updatePaymentMarkPaid(
    paymentId: string,
    referenceId?: string,
    notes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        reference_id: referenceId || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", paymentId);

    if (error) throw error;
  }

  async getUserById(userId: string): Promise<{ full_name: string } | null> {
    const { data, error } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  }
}
