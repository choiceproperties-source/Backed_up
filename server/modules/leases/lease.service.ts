import { LeaseRepository } from "./lease.repository";
import { logAuditEvent } from "../../security/audit-logger";
import { insertLeaseSignatureSchema } from "@shared/schema";

export class LeaseService {
  private repository: LeaseRepository;

  constructor() {
    this.repository = new LeaseRepository();
  }

  async getPaymentHistory(leaseId: string, userId: string, userRole: string): Promise<any> {
    const lease = await this.repository.getLeaseById(leaseId);

    if (!lease) {
      throw { status: 404, message: "Lease not found" };
    }

    const isLandlord = lease.landlord_id === userId;
    const isTenant = lease.tenant_id === userId;
    const isAdmin = userRole === "admin";

    if (!isLandlord && !isTenant && !isAdmin) {
      throw { status: 403, message: "Not authorized to view payment history" };
    }

    const payments = await this.repository.getPaymentsForLease(leaseId);

    // Mark overdue payments
    const now = new Date();
    const enrichedPayments = (payments || []).map((p: any) => {
      const dueDate = new Date(p.due_date);
      const isOverdue = p.status === "pending" && dueDate < now;
      return {
        ...p,
        status: isOverdue ? "overdue" : p.status
      };
    });

    // Calculate summary
    const summary = {
      totalPayments: enrichedPayments.length,
      verified: enrichedPayments.filter((p: any) => p.status === "verified").length,
      paid: enrichedPayments.filter((p: any) => p.status === "paid").length,
      pending: enrichedPayments.filter((p: any) => p.status === "pending").length,
      overdue: enrichedPayments.filter((p: any) => p.status === "overdue").length,
      totalVerifiedAmount: enrichedPayments
        .filter((p: any) => p.status === "verified")
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0),
      totalOutstandingAmount: enrichedPayments
        .filter((p: any) => ["pending", "overdue"].includes(p.status))
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0)
    };

    return {
      lease: {
        id: lease.id,
        property: (lease.applications as any)?.[0]?.properties,
        monthlyRent: lease.monthly_rent,
        securityDepositAmount: lease.security_deposit_amount
      },
      payments: enrichedPayments,
      summary
    };
  }

  async generateRentPayments(leaseId: string, userId: string, userRole: string, gracePeriodDays: number = 0, req: any): Promise<any> {
    const lease = await this.repository.getLeaseWithDates(leaseId);

    if (!lease) {
      throw { status: 404, message: "Lease not found" };
    }

    const isTenant = lease.tenant_id === userId;
    const isLandlord = lease.landlord_id === userId;
    const isAdmin = userRole === "admin";

    if (!isTenant && !isLandlord && !isAdmin) {
      throw { status: 403, message: "Not authorized to generate rent payments" };
    }

    const startDate = new Date(lease.lease_start_date);
    const endDate = new Date(lease.lease_end_date);
    const rentDueDay = lease.rent_due_day || 1;
    const rentAmount = parseFloat(lease.monthly_rent.toString());

    // Generate monthly rent payment dates
    const paymentsToCreate = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      // Calculate the due date for this month (rentDueDay of current month)
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), rentDueDay);

      // If the due date is before the lease start, set it to next month
      if (dueDate < startDate) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Only add if due date is within lease period
      if (dueDate <= endDate) {
        paymentsToCreate.push({
          lease_id: leaseId,
          tenant_id: lease.tenant_id,
          amount: rentAmount,
          type: "rent",
          status: "pending",
          due_date: dueDate.toISOString()
        });
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    if (paymentsToCreate.length === 0) {
      return { created: 0, message: "No rent payments to create for lease period" };
    }

    // Check for existing rent payments to prevent duplicates
    const existingPayments = await this.repository.getExistingRentPayments(leaseId);

    // Filter out duplicate payment dates
    const existingDates = new Set(existingPayments?.map(p => new Date(p.due_date).toDateString()) || []);
    const newPayments = paymentsToCreate.filter(p => !existingDates.has(new Date(p.due_date).toDateString()));

    if (newPayments.length === 0) {
      return { created: 0, message: "All rent payments already exist" };
    }

    // Insert new rent payments
    const inserted = await this.repository.createRentPayments(newPayments);

    // Log audit event
    await logAuditEvent({
      userId,
      action: "create",
      resourceType: "payment",
      resourceId: leaseId,
      previousData: {} as Record<string, any>,
      newData: { count: inserted?.length || 0, type: "rent" },
      req
    });

    return {
      created: inserted?.length || 0,
      payments: inserted || [],
      message: `Generated ${inserted?.length || 0} rent payment records`
    };
  }

  async getRentPayments(leaseId: string, userId: string, userRole: string): Promise<any> {
    const lease = await this.repository.getLeaseForRentPayments(leaseId);

    if (!lease) {
      throw { status: 404, message: "Lease not found" };
    }

    const isTenant = lease.tenant_id === userId;
    const isLandlord = lease.landlord_id === userId;
    const isAdmin = userRole === "admin";

    if (!isTenant && !isLandlord && !isAdmin) {
      throw { status: 403, message: "Not authorized to view rent payments" };
    }

    const payments = await this.repository.getRentPaymentsForLease(leaseId);

    // Group by payment status
    const grouped = {
      pending: payments?.filter(p => p.status === "pending") || [],
      paid: payments?.filter(p => p.status === "paid") || [],
      verified: payments?.filter(p => p.status === "verified") || [],
      overdue: payments?.filter(p => p.status === "overdue") || []
    };

    const stats = {
      totalRent: payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0,
      pendingAmount: grouped.pending.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
      paidAmount: grouped.paid.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
      verifiedAmount: grouped.verified.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
      overdueAmount: grouped.overdue.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)
    };

    return { payments: grouped, stats };
  }

  async signLease(applicationId: string, userId: string, userRole: string, signatureData: any, req: any): Promise<any> {
    const signatures = await this.repository.findSignaturesByApplicationId(applicationId);
    
    // Fetch state disclosures logic (e.g. from properties table or hardcoded lookup)
    const stateDisclosuresLookup: Record<string, string> = {
      "CA": "California E-Signature Disclosure: You agree that your electronic signature is the legal equivalent of your manual signature on this Agreement. Under the California Uniform Electronic Transactions Act (UETA), this Agreement is legally binding.",
      "NY": "New York E-Signature Disclosure: This document is being signed electronically pursuant to the New York Electronic Signatures and Records Act (ESRA). Your electronic signature has the same validity and enforceability as a handwritten signature.",
      "TX": "Texas E-Signature Disclosure: You acknowledge that your electronic signature on this Agreement is legally binding under the Texas Uniform Electronic Transactions Act.",
    };

    const stateDisclosureText = stateDisclosuresLookup[signatureData.stateCode] || "Standard E-Signature Disclosure: By signing this document, you agree that your electronic signature is legally binding and has the same effect as a handwritten signature.";

    // Validate state disclosure acknowledgment
    if (!signatureData.stateCode || !signatureData.stateDisclosureAcknowledged) {
      throw { status: 400, message: "You must acknowledge the state-specific e-signature disclosure" };
    }

    // Validate attestation for legal compliance
    if (!signatureData.attestationAcknowledged) {
      throw { status: 400, message: "You must certify that this is your legal signature" };
    }

    // 1. Validate role & identity
    // Map roles to normalized 'tenant' or 'landlord'
    let signerRole = "";
    if (userRole === "renter") signerRole = "tenant";
    else if (userRole === "owner" || userRole === "landlord") signerRole = "landlord";
    else if (userRole === "admin") signerRole = "landlord"; // Admin can sign as landlord if needed, or we might need specific logic
    
    if (!signerRole) {
      throw { status: 403, message: "Only tenants and landlords can sign leases" };
    }

    // 2. Check for existing signature by this role
    if (signatures.some((s: any) => s.signer_role === signerRole)) {
      throw { status: 400, message: `The ${signerRole} has already signed this lease` };
    }

    // 3. Enforce signing order (Tenant first)
    if (signerRole === "landlord") {
      const tenantSigned = signatures.some((s: any) => s.signer_role === "tenant");
      if (!tenantSigned) {
        throw { status: 400, message: "The tenant must sign the lease before the landlord" };
      }
    }

    // 4. Record signature
    const signatureRecord = {
      application_id: applicationId,
      signer_user_id: userId,
      signer_role: signerRole,
      signer_name: signatureData.signerName,
      signature_data: signatureData.signatureData,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      consent_esign: signatureData.consentElectronic ?? true,
      consent_terms: signatureData.consentBinding ?? true,
      pet_policy_acknowledged: signatureData.petPolicyAcknowledged,
      vehicle_disclosure_acknowledged: signatureData.vehicleDisclosureAcknowledged,
      damage_disclosure_acknowledged: signatureData.damageDisclosureAcknowledged,
      state_code: signatureData.stateCode,
      state_disclosure_acknowledged: signatureData.stateDisclosureAcknowledged,
      attestation_text: signatureData.attestationText || "I certify under penalty of perjury that this is my legal signature.",
      signed_at: new Date().toISOString(),
      is_locked: true,
    };

    const recorded = await this.repository.recordSignature(signatureRecord);

    // 5. Update lease_status
    let newStatus = "partially_signed";
    let fullySignedAt = undefined;

    if (signerRole === "landlord") {
      newStatus = "signed";
      fullySignedAt = new Date().toISOString();
    }

    await this.repository.updateLeaseSignatureStatus(applicationId, newStatus, fullySignedAt);

    // If fully signed, update the signed lease URL
    if (newStatus === "signed") {
      await this.repository.updateApplicationSignedLeaseUrl(
        applicationId, 
        `/api/v2/applications/${applicationId}/lease-agreement-signed.pdf`
      );
    }

    // Audit log
    await logAuditEvent({
      userId,
      action: "lease_sign",
      resourceType: "application",
      resourceId: applicationId,
      newData: { role: signerRole, status: newStatus },
      req
    });

    return {
      success: true,
      status: newStatus,
      signature: recorded
    };
  }

  async getSignatures(applicationId: string): Promise<any> {
    return await this.repository.findSignaturesByApplicationId(applicationId);
  }
}
