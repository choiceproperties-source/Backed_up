import { getSupabaseOrThrow } from "../../supabase";

export class LeaseRepository {
  async getLeaseById(leaseId: string): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("leases")
      .select("id, landlord_id, tenant_id, monthly_rent, security_deposit_amount, applications(property_id, properties(title, address))")
      .eq("id", leaseId)
      .single();

    if (error) throw error;
    return data;
  }

  async getLeaseWithDates(leaseId: string): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("leases")
      .select("id, tenant_id, landlord_id, monthly_rent, rent_due_day, lease_start_date, lease_end_date")
      .eq("id", leaseId)
      .single();

    if (error) throw error;
    return data;
  }

  async getLeaseForRentPayments(leaseId: string): Promise<any> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("leases")
      .select("tenant_id, landlord_id")
      .eq("id", leaseId)
      .single();

    if (error) throw error;
    return data;
  }

  async getPaymentsForLease(leaseId: string): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("payments")
      .select("*, verified_by_user:users!payments_verified_by_fkey(full_name)")
      .eq("lease_id", leaseId)
      .order("due_date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getRentPaymentsForLease(leaseId: string): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("lease_id", leaseId)
      .eq("type", "rent")
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getExistingRentPayments(leaseId: string): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("payments")
      .select("due_date, type")
      .eq("lease_id", leaseId)
      .eq("type", "rent");

    if (error) throw error;
    return data || [];
  }

  async createRentPayments(paymentsToCreate: any[]): Promise<any[]> {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("payments")
      .insert(paymentsToCreate)
      .select();

    if (error) throw error;
    return data || [];
  }

  async findSignaturesByApplicationId(applicationId: string) {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("lease_signatures")
      .select("*")
      .eq("application_id", applicationId);

    if (error) throw error;
    return data || [];
  }

  async recordSignature(signature: any) {
    const supabase = getSupabaseOrThrow();
    // Prevent modification by setting is_locked: true
    const { data, error } = await supabase
      .from("lease_signatures")
      .insert([{ 
        ...signature, 
        is_locked: true,
        state_code: signature.state_code,
        state_disclosure_acknowledged: signature.state_disclosure_acknowledged
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateLeaseSignatureStatus(applicationId: string, status: string, fullySignedAt?: string) {
    const supabase = getSupabaseOrThrow();
    const updateData: any = { 
      lease_signature_status: status,
      updated_at: new Date().toISOString()
    };
    if (fullySignedAt) {
      updateData.lease_fully_signed_at = fullySignedAt;
    }

    const { data, error } = await supabase
      .from("applications")
      .update(updateData)
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateApplicationSignedLeaseUrl(applicationId: string, url: string) {
    const supabase = getSupabaseOrThrow();
    const { data, error } = await supabase
      .from("applications")
      .update({ 
        signed_lease_pdf_url: url,
        updated_at: new Date().toISOString()
      })
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
