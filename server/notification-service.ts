// Application notification service for sending automated emails
import { supabase } from "./supabase";
import { 
  sendEmail, 
  getApplicationStatusEmailTemplate,
  getExpirationWarningEmailTemplate,
  getDocumentRequestEmailTemplate,
  getNewApplicationNotificationTemplate,
  getScoringCompleteEmailTemplate 
} from "./email";
import type { ApplicationStatus } from "@shared/schema";

// Notification types
export type NotificationType = 
  | "status_change"
  | "expiration_warning"
  | "document_request"
  | "new_application"
  | "scoring_complete"
  | "reminder"
  | "payment_received"
  | "payment_verified"
  | "deposit_required"
  | "rent_due_soon";

interface NotificationRecord {
  applicationId: string;
  userId: string;
  type: NotificationType;
  subject: string;
  content: string;
}

// Create notification record in database
async function createNotificationRecord(record: NotificationRecord): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("application_notifications")
      .insert([{
        application_id: record.applicationId,
        user_id: record.userId,
        notification_type: record.type,
        channel: "email",
        subject: record.subject,
        content: record.content,
        status: "pending",
      }])
      .select("id")
      .single();
    
    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to create record:", err);
    return null;
  }
}

// Update notification status
async function updateNotificationStatus(
  notificationId: string, 
  status: "sent" | "failed",
  error?: string
): Promise<void> {
  try {
    const updateData: any = { status };
    if (status === "sent") {
      updateData.sent_at = new Date().toISOString();
    }
    
    await supabase
      .from("application_notifications")
      .update(updateData)
      .eq("id", notificationId);
  } catch (err) {
    console.error("[NOTIFICATION] Failed to update status:", err);
  }
}

// Send application status change notification
export async function sendStatusChangeNotification(
  applicationId: string,
  newStatus: ApplicationStatus,
  options?: {
    rejectionReason?: string;
    appealable?: boolean;
  }
): Promise<boolean> {
  try {
    // Get application with user and property info
    const { data: application, error } = await supabase
      .from("applications")
      .select(`
        id,
        user_id,
        users(id, email, full_name),
        properties(id, title)
      `)
      .eq("id", applicationId)
      .single();

    if (error || !application) {
      console.error("[NOTIFICATION] Application not found:", applicationId);
      return false;
    }

    const user = application.users as any;
    const property = application.properties as any;

    if (!user?.email) {
      console.error("[NOTIFICATION] User email not found");
      return false;
    }

    const subject = getStatusSubject(newStatus);
    const content = getApplicationStatusEmailTemplate({
      applicantName: user.full_name || "Applicant",
      propertyTitle: property?.title || "Property",
      status: newStatus,
      rejectionReason: options?.rejectionReason,
      appealable: options?.appealable,
    });

    // Create notification record
    const notificationId = await createNotificationRecord({
      applicationId,
      userId: user.id,
      type: "status_change",
      subject,
      content,
    });

    // Send email
    const result = await sendEmail({
      to: user.email,
      subject,
      html: content,
    });

    // Update status
    if (notificationId) {
      await updateNotificationStatus(
        notificationId,
        result.success ? "sent" : "failed"
      );
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send status change:", err);
    return false;
  }
}

// Get subject line for status
function getStatusSubject(status: ApplicationStatus): string {
  const subjects: Record<ApplicationStatus, string> = {
    draft: "Application Draft Saved",
    pending_payment: "Payment Required for Your Application",
    payment_verified: "Payment Verified",
    submitted: "Application Submitted Successfully",
    under_review: "Application Under Review",
    info_requested: "Information Requested for Your Application",
    conditional_approval: "Application Conditionally Approved",
    approved: "Congratulations! Application Approved",
    rejected: "Application Status Update",
    withdrawn: "Application Withdrawn",
  };
  return subjects[status] || "Application Status Update";
}

// Send expiration warning
export async function sendExpirationWarningNotification(
  applicationId: string,
  daysRemaining: number
): Promise<boolean> {
  try {
    const { data: application, error } = await supabase
      .from("applications")
      .select(`
        id,
        user_id,
        users(id, email, full_name),
        properties(id, title)
      `)
      .eq("id", applicationId)
      .single();

    if (error || !application) return false;

    const user = application.users as any;
    const property = application.properties as any;

    if (!user?.email) return false;

    const subject = `Action Required: Application Expiring in ${daysRemaining} Days`;
    const content = getExpirationWarningEmailTemplate({
      applicantName: user.full_name || "Applicant",
      propertyTitle: property?.title || "Property",
      daysRemaining,
    });

    const notificationId = await createNotificationRecord({
      applicationId,
      userId: user.id,
      type: "expiration_warning",
      subject,
      content,
    });

    const result = await sendEmail({ to: user.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send expiration warning:", err);
    return false;
  }
}

// Send document request notification
export async function sendDocumentRequestNotification(
  applicationId: string,
  requiredDocuments: string[]
): Promise<boolean> {
  try {
    const { data: application, error } = await supabase
      .from("applications")
      .select(`
        id,
        user_id,
        users(id, email, full_name),
        properties(id, title)
      `)
      .eq("id", applicationId)
      .single();

    if (error || !application) return false;

    const user = application.users as any;
    const property = application.properties as any;

    if (!user?.email) return false;

    const subject = "Documents Required for Your Application";
    const content = getDocumentRequestEmailTemplate({
      applicantName: user.full_name || "Applicant",
      propertyTitle: property?.title || "Property",
      requiredDocuments,
    });

    const notificationId = await createNotificationRecord({
      applicationId,
      userId: user.id,
      type: "document_request",
      subject,
      content,
    });

    const result = await sendEmail({ to: user.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send document request:", err);
    return false;
  }
}

// Notify property owner of new application
export async function notifyOwnerOfNewApplication(
  applicationId: string
): Promise<boolean> {
  try {
    const { data: application, error } = await supabase
      .from("applications")
      .select(`
        id,
        users(id, full_name),
        properties(id, title, owner_id)
      `)
      .eq("id", applicationId)
      .single();

    if (error || !application) return false;

    const applicant = application.users as any;
    const property = application.properties as any;

    if (!property?.owner_id) return false;

    // Get owner info
    const { data: owner } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", property.owner_id)
      .single();

    if (!owner?.email) return false;

    const subject = `New Application for ${property.title}`;
    const content = getNewApplicationNotificationTemplate({
      ownerName: owner.full_name || "Property Owner",
      propertyTitle: property.title,
      applicantName: applicant?.full_name || "Applicant",
      applicationId,
    });

    const notificationId = await createNotificationRecord({
      applicationId,
      userId: owner.id,
      type: "new_application",
      subject,
      content,
    });

    const result = await sendEmail({ to: owner.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to notify owner:", err);
    return false;
  }
}

// Notify owner when scoring is complete
export async function notifyOwnerOfScoringComplete(
  applicationId: string,
  score: number,
  maxScore: number
): Promise<boolean> {
  try {
    const { data: application, error } = await supabase
      .from("applications")
      .select(`
        id,
        users(id, full_name),
        properties(id, title, owner_id)
      `)
      .eq("id", applicationId)
      .single();

    if (error || !application) return false;

    const applicant = application.users as any;
    const property = application.properties as any;

    if (!property?.owner_id) return false;

    const { data: owner } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", property.owner_id)
      .single();

    if (!owner?.email) return false;

    const subject = `Application Scored: ${applicant?.full_name || "Applicant"}`;
    const content = getScoringCompleteEmailTemplate({
      ownerName: owner.full_name || "Property Owner",
      propertyTitle: property.title,
      applicantName: applicant?.full_name || "Applicant",
      score,
      maxScore,
    });

    const notificationId = await createNotificationRecord({
      applicationId,
      userId: owner.id,
      type: "scoring_complete",
      subject,
      content,
    });

    const result = await sendEmail({ to: owner.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to notify scoring complete:", err);
    return false;
  }
}

// Send payment received notification (to landlord when tenant marks as paid)
export async function sendPaymentReceivedNotification(
  paymentId: string,
  tenantName: string,
  paymentType: string,
  amount: string
): Promise<boolean> {
  try {
    const { data: payment } = await supabase
      .from("payments")
      .select("id, lease_id, leases(landlord_id)")
      .eq("id", paymentId)
      .single();

    if (!payment || !(payment as any).leases?.landlord_id) return false;

    const { data: landlord } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", (payment as any).leases.landlord_id)
      .single();

    if (!landlord?.email) return false;

    // Check for duplicate notification (prevent duplicates sent in last 1 hour)
    const { data: existingNotif } = await supabase
      .from("application_notifications")
      .select("id")
      .eq("user_id", landlord.id)
      .eq("notification_type", "payment_received")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .single();

    if (existingNotif) return false;

    const propertyTitle = "Property";
    const subject = `Payment Received from ${tenantName}`;
    const content = `
      <p>Hi ${landlord.full_name},</p>
      <p>${tenantName} has marked a ${paymentType} payment of $${amount} as paid for <strong>${propertyTitle}</strong>.</p>
      <p>Please verify the payment in the landlord portal.</p>
      <p>Best regards,<br>Choice Properties</p>
    `;

    const notificationId = await createNotificationRecord({
      applicationId: "", // Payment notifications not tied to applications
      userId: landlord.id,
      type: "payment_received",
      subject,
      content,
    });

    // Send in-app notification only (email is optional)
    if (notificationId) {
      await supabase
        .from("application_notifications")
        .update({ channel: "in_app" })
        .eq("id", notificationId);
    }

    return true;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send payment received:", err);
    return false;
  }
}

// Send payment verified notification (to tenant when landlord verifies)
export async function sendPaymentVerifiedNotification(
  paymentId: string,
  tenantId: string,
  paymentType: string,
  amount: string
): Promise<boolean> {
  try {
    const { data: tenant } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", tenantId)
      .single();

    if (!tenant?.email) return false;

    // Check for duplicate (prevent in last 1 hour)
    const { data: existingNotif } = await supabase
      .from("application_notifications")
      .select("id")
      .eq("user_id", tenant.id)
      .eq("notification_type", "payment_verified")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .single();

    if (existingNotif) return false;

    const subject = `Payment Verified: ${paymentType}`;
    const content = `
      <p>Hi ${tenant.full_name},</p>
      <p>Your ${paymentType} payment of $${amount} has been verified and received.</p>
      <p>Thank you for your timely payment.</p>
      <p>Best regards,<br>Choice Properties</p>
    `;

    const notificationId = await createNotificationRecord({
      applicationId: "",
      userId: tenant.id,
      type: "payment_verified",
      subject,
      content,
    });

    // Send in-app + email notification
    const result = await sendEmail({ to: tenant.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send payment verified:", err);
    return false;
  }
}

// Send deposit required notification (to tenant when lease is accepted)
export async function sendDepositRequiredNotification(
  tenantId: string,
  depositAmount: string,
  propertyTitle: string
): Promise<boolean> {
  try {
    const { data: tenant } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", tenantId)
      .single();

    if (!tenant?.email) return false;

    // Check for duplicate
    const { data: existingNotif } = await supabase
      .from("application_notifications")
      .select("id")
      .eq("user_id", tenant.id)
      .eq("notification_type", "deposit_required")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existingNotif) return false;

    const subject = `Security Deposit Required for ${propertyTitle}`;
    const content = `
      <p>Hi ${tenant.full_name},</p>
      <p>Your lease for <strong>${propertyTitle}</strong> has been accepted!</p>
      <p>A security deposit of <strong>$${depositAmount}</strong> is now required.</p>
      <p>Please submit your deposit payment to proceed with move-in.</p>
      <p>Best regards,<br>Choice Properties</p>
    `;

    const notificationId = await createNotificationRecord({
      applicationId: "",
      userId: tenant.id,
      type: "deposit_required",
      subject,
      content,
    });

    const result = await sendEmail({ to: tenant.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send deposit required:", err);
    return false;
  }
}

// Send rent due soon notification
export async function sendRentDueSoonNotification(
  tenantId: string,
  rentAmount: string,
  dueDate: string,
  daysUntilDue: number
): Promise<boolean> {
  try {
    const { data: tenant } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", tenantId)
      .single();

    if (!tenant?.email) return false;

    // Check for duplicate (prevent multiple in same day)
    const { data: existingNotif } = await supabase
      .from("application_notifications")
      .select("id")
      .eq("user_id", tenant.id)
      .eq("notification_type", "rent_due_soon")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existingNotif) return false;

    const subject = `Rent Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? 's' : ''}`;
    const content = `
      <p>Hi ${tenant.full_name},</p>
      <p>Reminder: Your rent payment of <strong>$${rentAmount}</strong> is due on ${dueDate}.</p>
      <p>Please ensure your payment is submitted on time.</p>
      <p>Best regards,<br>Choice Properties</p>
    `;

    const notificationId = await createNotificationRecord({
      applicationId: "",
      userId: tenant.id,
      type: "rent_due_soon",
      subject,
      content,
    });

    // In-app + email for payment reminders
    const result = await sendEmail({ to: tenant.email, subject, html: content });

    if (notificationId) {
      await updateNotificationStatus(notificationId, result.success ? "sent" : "failed");
    }

    return result.success;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to send rent due soon:", err);
    return false;
  }
}

// Check for applications nearing expiration and send warnings
export async function checkAndSendExpirationWarnings(): Promise<number> {
  try {
    const warningDays = [7, 3, 1]; // Send warnings at 7, 3, and 1 days before expiration
    let totalSent = 0;

    for (const days of warningDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      // Find applications expiring on target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: expiringApps } = await supabase
        .from("applications")
        .select("id")
        .gte("expires_at", startOfDay.toISOString())
        .lte("expires_at", endOfDay.toISOString())
        .in("status", ["pending", "under_review", "pending_verification"]);

      if (expiringApps) {
        for (const app of expiringApps) {
          // Check if we already sent a warning for this day
          const { data: existingNotification } = await supabase
            .from("application_notifications")
            .select("id")
            .eq("application_id", app.id)
            .eq("notification_type", "expiration_warning")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (!existingNotification) {
            const sent = await sendExpirationWarningNotification(app.id, days);
            if (sent) totalSent++;
          }
        }
      }
    }

    return totalSent;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to check expirations:", err);
    return 0;
  }
}
