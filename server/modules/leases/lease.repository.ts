import { supabase } from "../../supabase";

export class LeaseRepository {
  async getLeaseById(leaseId: string): Promise<any> {
    const { data, error } = await supabase
      .from("leases")
      .select("id, landlord_id, tenant_id, monthly_rent, security_deposit_amount, applications(property_id, properties(title, address))")
      .eq("id", leaseId)
      .single();

    if (error) throw error;
    return data;
  }

  async getLeaseWithDates(leaseId: string): Promise<any> {
    const { data, error } = await supabase
      .from("leases")
      .select("id, tenant_id, landlord_id, monthly_rent, rent_due_day, lease_start_date, lease_end_date")
      .eq("id", leaseId)
      .single();

    if (error) throw error;
    return data;
  }

  async getLeaseForRentPayments(leaseId: string): Promise<any> {
    const { data, error } = await supabase
      .from("leases")
      .select("tenant_id, landlord_id")
      .eq("id", leaseId)
      .single();

    if (error) throw error;
    return data;
  }

  async getPaymentsForLease(leaseId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*, verified_by_user:users!payments_verified_by_fkey(full_name)")
      .eq("lease_id", leaseId)
      .order("due_date", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getRentPaymentsForLease(leaseId: string): Promise<any[]> {
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
    const { data, error } = await supabase
      .from("payments")
      .select("due_date, type")
      .eq("lease_id", leaseId)
      .eq("type", "rent");

    if (error) throw error;
    return data || [];
  }

  async createRentPayments(paymentsToCreate: any[]): Promise<any[]> {
    const { data, error } = await supabase
      .from("payments")
      .insert(paymentsToCreate)
      .select();

    if (error) throw error;
    return data || [];
  }
}
