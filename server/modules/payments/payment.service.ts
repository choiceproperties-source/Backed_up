import { PaymentRepository, type PaymentData } from "./payment.repository";
import { logPaymentAction } from "../../security/audit-logger";
import {
  sendPaymentReceivedNotification,
  sendPaymentVerifiedNotification,
} from "../../notification-service";
import { success } from "../../response";

export class PaymentService {
  private repository: PaymentRepository;

  constructor() {
    this.repository = new PaymentRepository();
  }

  async processPayment(applicationId: string, amount: number, cardToken?: string): Promise<any> {
    // Simulate payment processing (in real app, would call Stripe/PayPal/etc)
    const mockPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockTransactionId = `txn_${Date.now()}`;

    // In production, verify amount matches application fee
    // For now, mock success after 100ms delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      paymentId: mockPaymentId,
      transactionId: mockTransactionId,
      amount,
      status: "completed",
      timestamp: new Date().toISOString(),
      message: "[MOCK PAYMENT] In production, this would process with real payment provider"
    };
  }

  async verifyPayment(
    paymentId: string,
    userId: string,
    userRole: string,
    amount: number,
    method: string,
    dateReceived: string,
    req: any
  ): Promise<void> {
    // Get payment with lease info
    const payment = await this.repository.getPaymentWithLeaseInfo(paymentId);

    if (!payment) {
      throw { status: 404, message: "Payment not found" };
    }

    const isLandlord = payment.leases?.landlord_id === userId;
    const isAdmin = userRole === "admin";

    if (!isLandlord && !isAdmin) {
      throw { status: 403, message: "Only landlord or admin can verify payments" };
    }

    if (payment.status === "verified") {
      throw { status: 400, message: "Payment already verified" };
    }

    // Update payment status to verified with manual verification details
    await this.repository.updatePaymentVerified(paymentId, userId, amount, method, dateReceived);

    // Log payment audit event
    await logPaymentAction(
      userId,
      paymentId,
      "payment_verified",
      payment.status,
      "verified",
      {
        method,
        amount,
        dateReceived,
        type: payment.type,
        verifiedByRole: userRole,
      },
      req
    );

    // Send notification to tenant that payment was verified
    try {
      const tenantData = await this.repository.getUserById(payment.leases?.tenant_id);

      if (tenantData?.full_name) {
        await sendPaymentVerifiedNotification(
          paymentId,
          payment.leases?.tenant_id,
          payment.type === "rent" ? "Rent" : "Security Deposit",
          amount.toString()
        );
      }
    } catch (notificationErr) {
      console.error("[PAYMENTS] Failed to send verification notification:", notificationErr);
      // Continue even if notification fails
    }
  }

  async markPaymentPaid(
    paymentId: string,
    userId: string,
    userRole: string,
    referenceId?: string,
    notes?: string,
    req?: any
  ): Promise<void> {
    // Get payment
    const payment = await this.repository.getPaymentWithLeaseInfo(paymentId);

    if (!payment) {
      throw { status: 404, message: "Payment not found" };
    }

    const isTenant = payment.leases?.tenant_id === userId;
    const isAdmin = userRole === "admin";

    if (!isTenant && !isAdmin) {
      throw { status: 403, message: "Only tenant can mark their own payment as paid" };
    }

    if (payment.status === "verified" || payment.status === "paid") {
      throw { status: 400, message: "Payment already processed" };
    }

    // Update payment status to paid (awaiting verification)
    await this.repository.updatePaymentMarkPaid(paymentId, referenceId, notes);

    // Log payment audit event
    await logPaymentAction(
      userId,
      paymentId,
      "payment_marked_paid",
      payment.status,
      "paid",
      {
        referenceId,
        notes,
        amount: payment.amount,
        type: payment.type,
      },
      req
    );

    // Send notification to landlord that payment was marked as paid
    try {
      const tenantData = await this.repository.getUserById(userId);

      if (tenantData?.full_name) {
        await sendPaymentReceivedNotification(
          paymentId,
          tenantData.full_name,
          payment.type === "rent" ? "Rent" : "Security Deposit",
          payment.amount.toString()
        );
      }
    } catch (notificationErr) {
      console.error("[PAYMENTS] Failed to send notification:", notificationErr);
      // Continue with response even if notification fails
    }
  }

  async getReceipt(
    paymentId: string,
    userId: string,
    userRole: string
  ): Promise<any> {
    const payment = await this.repository.getPaymentWithFullDetails(paymentId);

    if (!payment) {
      throw { status: 404, message: "Payment not found" };
    }

    // Authorization: tenant or landlord
    const paymentAny = payment as any;
    const isTenant = paymentAny.leases?.[0]?.applications?.[0]?.tenant_id === userId;
    const isLandlord = paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.owner_id === userId;
    const isAdmin = userRole === "admin";

    if (!isTenant && !isLandlord && !isAdmin) {
      throw { status: 403, message: "Not authorized to view this receipt" };
    }

    // Format receipt data
    const receipt = {
      receiptNumber: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
      paymentId: payment.id,
      type: payment.type === "rent" ? "Monthly Rent" : "Security Deposit",
      amount: parseFloat(payment.amount.toString()),
      dueDate: payment.due_date,
      paidDate: payment.paid_at || payment.verified_at,
      verificationDate: payment.verified_at,
      status: payment.status,
      referenceId: payment.reference_id,
      property: {
        title: paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.title,
        address: paymentAny.leases?.[0]?.applications?.[0]?.properties?.[0]?.address,
      },
      tenant: {
        name: paymentAny.leases?.[0]?.applications?.[0]?.users?.[0]?.full_name,
        email: paymentAny.leases?.[0]?.applications?.[0]?.users?.[0]?.email,
      },
      verifiedBy: paymentAny.verified_by_user?.full_name || "Pending verification",
      createdAt: payment.created_at,
    };

    return receipt;
  }

  async blockPaymentDeletion(paymentId: string, userId: string, userRole: string, req: any): Promise<void> {
    // Log the blocked deletion attempt
    await logPaymentAction(
      userId,
      paymentId,
      "payment_delete_blocked",
      undefined,
      undefined,
      {
        attemptedBy: userId,
        role: userRole,
        reason: "Payment deletion is blocked for financial accountability",
      },
      req
    );

    throw {
      status: 403,
      message: "Payment records cannot be deleted for audit and compliance purposes",
      code: "PAYMENT_DELETE_BLOCKED",
    };
  }
}
