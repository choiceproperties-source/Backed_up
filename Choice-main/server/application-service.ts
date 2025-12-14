import { supabase } from "./supabase";
import { APPLICATION_STATUSES, REJECTION_CATEGORIES, type ApplicationStatus, type RejectionCategory } from "@shared/schema";
import { sendEmail } from "./email";

// Valid status transitions: draft → submitted → under_review → conditional_approval/info_requested → approved/rejected/withdrawn
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted", "pending_payment", "withdrawn"],
  pending_payment: ["payment_verified", "withdrawn"],
  payment_verified: ["submitted", "withdrawn"],
  submitted: ["under_review", "withdrawn"],
  under_review: ["info_requested", "conditional_approval", "approved", "rejected", "withdrawn"],
  info_requested: ["under_review", "conditional_approval", "approved", "rejected", "withdrawn"],
  conditional_approval: ["approved", "rejected", "withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus
): boolean {
  const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return validTransitions.includes(newStatus);
}

export function getValidNextStatuses(currentStatus: ApplicationStatus): ApplicationStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

// Calculate application score based on provided information
export interface ScoreBreakdown {
  incomeScore: number;
  creditScore: number;
  rentalHistoryScore: number;
  employmentScore: number;
  documentsScore: number;
  totalScore: number;
  maxScore: number;
  flags: string[];
}

export function calculateApplicationScore(application: {
  personalInfo?: any;
  employment?: any;
  rentalHistory?: any;
  documents?: any;
  documentStatus?: any;
  coApplicants?: any[];
}): ScoreBreakdown {
  const flags: string[] = [];
  let incomeScore = 0;
  let creditScore = 0;
  let rentalHistoryScore = 0;
  let employmentScore = 0;
  let documentsScore = 0;

  // Income score (max 25 points) - includes primary applicant + co-applicants
  const employment = application.employment || {};
  let monthlyIncome = parseFloat(employment.monthlyIncome || employment.income || 0);
  
  // Add co-applicant income
  if (application.coApplicants && Array.isArray(application.coApplicants)) {
    const coApplicantIncome = application.coApplicants.reduce((sum: number, co: any) => {
      const coIncome = parseFloat(co.income || 0);
      return sum + coIncome;
    }, 0);
    monthlyIncome += coApplicantIncome;
  }
  if (monthlyIncome >= 5000) {
    incomeScore = 25;
  } else if (monthlyIncome >= 4000) {
    incomeScore = 22;
  } else if (monthlyIncome >= 3000) {
    incomeScore = 18;
  } else if (monthlyIncome >= 2000) {
    incomeScore = 12;
  } else if (monthlyIncome > 0) {
    incomeScore = 5;
    flags.push("low_income");
  } else {
    flags.push("no_income_provided");
  }

  // Credit score placeholder (max 25 points)
  // In real scenario, this would integrate with credit check service
  const personalInfo = application.personalInfo || {};
  if (personalInfo.ssnProvided || personalInfo.ssn) {
    creditScore = 20; // Assume decent credit if SSN provided for check
  } else {
    creditScore = 10;
    flags.push("no_credit_check");
  }

  // Rental history score (max 20 points)
  const rentalHistory = application.rentalHistory || {};
  let yearsRentingValue = 0;
  const rentalStr = rentalHistory.yearsRenting || rentalHistory.duration || "0";
  // Parse strings like "3 years", "3", "6 months", etc.
  const rentYearMatch = rentalStr.toString().match(/(\d+)\s*(?:year|yr)?/i);
  const rentMonthMatch = rentalStr.toString().match(/(\d+)\s*(?:month|mo)?/);
  if (rentYearMatch) {
    yearsRentingValue = parseInt(rentYearMatch[1]) || 0;
  } else if (rentMonthMatch && !rentYearMatch) {
    yearsRentingValue = Math.floor(parseInt(rentMonthMatch[1]) / 12) || 0;
  }
  if (yearsRentingValue >= 3) {
    rentalHistoryScore = 20;
  } else if (yearsRentingValue >= 2) {
    rentalHistoryScore = 16;
  } else if (yearsRentingValue >= 1) {
    rentalHistoryScore = 12;
  } else if (yearsRentingValue > 0) {
    rentalHistoryScore = 8;
  } else {
    rentalHistoryScore = 5;
    flags.push("limited_rental_history");
  }

  // Check for evictions
  if (rentalHistory.hasEviction || rentalHistory.evicted) {
    rentalHistoryScore = Math.max(0, rentalHistoryScore - 15);
    flags.push("previous_eviction");
  }

  // Employment score (max 15 points)
  let employmentLengthYears = 0;
  const employmentStr = employment.yearsEmployed || employment.duration || employment.employmentLength || "0";
  // Parse strings like "2 years", "2", "6 months", etc.
  const yearMatch = employmentStr.toString().match(/(\d+)\s*(?:year|yr)?/i);
  const monthMatch = employmentStr.toString().match(/(\d+)\s*(?:month|mo)?/);
  if (yearMatch) {
    employmentLengthYears = parseInt(yearMatch[1]) || 0;
  } else if (monthMatch && !yearMatch) {
    employmentLengthYears = Math.floor(parseInt(monthMatch[1]) / 12) || 0;
  }
  const isEmployed = employment.employed !== false && employment.status !== "unemployed";
  
  if (isEmployed && employmentLengthYears >= 2) {
    employmentScore = 15;
  } else if (isEmployed && employmentLengthYears >= 1) {
    employmentScore = 12;
  } else if (isEmployed) {
    employmentScore = 8;
  } else {
    employmentScore = 3;
    flags.push("unemployed");
  }

  // Documents score (max 15 points)
  const documents = application.documents || {};
  const documentStatus = application.documentStatus || {};
  const requiredDocs = ["id", "proof_of_income", "employment_verification"];
  let uploadedDocs = 0;
  let verifiedDocs = 0;

  for (const doc of requiredDocs) {
    if (documents[doc] || documentStatus[doc]?.uploaded) {
      uploadedDocs++;
    }
    if (documentStatus[doc]?.verified) {
      verifiedDocs++;
    }
  }

  if (verifiedDocs >= 3) {
    documentsScore = 15;
  } else if (uploadedDocs >= 3) {
    documentsScore = 12;
  } else if (uploadedDocs >= 2) {
    documentsScore = 8;
  } else if (uploadedDocs >= 1) {
    documentsScore = 5;
  } else {
    documentsScore = 0;
    flags.push("missing_documents");
  }

  const totalScore = incomeScore + creditScore + rentalHistoryScore + employmentScore + documentsScore;
  const maxScore = 100;

  return {
    incomeScore,
    creditScore,
    rentalHistoryScore,
    employmentScore,
    documentsScore,
    totalScore,
    maxScore,
    flags,
  };
}

// Update application status with validation and history tracking
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  userId: string,
  options?: {
    rejectionCategory?: RejectionCategory;
    rejectionReason?: string;
    rejectionDetails?: {
      categories: string[];
      explanation: string;
      appealable: boolean;
    };
    reason?: string;
    conditionalRequirements?: Array<{
      id: string;
      type: 'document' | 'information' | 'verification';
      description: string;
      required: boolean;
      satisfied: boolean;
    }>;
    conditionalDocuments?: string[];
    dueDate?: string;
  }
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Get current application
    const { data: application, error: fetchError } = await supabase
      .from("applications")
      .select("*, users(email, full_name), properties(title)")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      return { success: false, error: "Application not found" };
    }

    const currentStatus = application.status as ApplicationStatus;

    // Validate transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions: ${getValidNextStatuses(currentStatus).join(", ")}`,
      };
    }

    // Build status history entry
    const historyEntry = {
      status: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: userId,
      reason: options?.reason,
    };

    const statusHistory = [...(application.status_history || []), historyEntry];

    // Build update object
    const updateData: any = {
      status: newStatus,
      previous_status: currentStatus,
      status_history: statusHistory,
      updated_at: new Date().toISOString(),
    };

    // Handle rejection-specific fields
    if (newStatus === "rejected") {
      updateData.rejection_category = options?.rejectionCategory;
      updateData.rejection_reason = options?.rejectionReason;
      updateData.rejection_details = options?.rejectionDetails;
      updateData.reviewed_by = userId;
      updateData.reviewed_at = new Date().toISOString();
    }

    // Handle approval
    if (newStatus === "approved") {
      updateData.reviewed_by = userId;
      updateData.reviewed_at = new Date().toISOString();
    }

    // Handle info requested
    if (newStatus === "info_requested") {
      updateData.info_requested_at = new Date().toISOString();
      updateData.info_requested_by = userId;
      updateData.info_requested_reason = options?.reason;
    }

    // Handle conditional approval
    if (newStatus === "conditional_approval") {
      updateData.conditional_approval_at = new Date().toISOString();
      updateData.conditional_approval_by = userId;
      updateData.conditional_approval_reason = options?.reason;
      if (options?.conditionalRequirements) {
        updateData.conditional_requirements = options.conditionalRequirements;
      }
      if (options?.conditionalDocuments) {
        updateData.conditional_documents_required = options.conditionalDocuments;
      }
      if (options?.dueDate) {
        updateData.conditional_approval_due_date = options.dueDate;
      }
    }

    // Update the application
    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update(updateData)
      .eq("id", applicationId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create notification record
    await createApplicationNotification(
      applicationId,
      application.user_id,
      "status_change",
      `Application Status: ${newStatus.replace(/_/g, " ").toUpperCase()}`,
      getStatusChangeEmailContent(newStatus, application, options)
    );

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Create notification and send email
async function createApplicationNotification(
  applicationId: string,
  userId: string,
  notificationType: string,
  subject: string,
  content: string
): Promise<void> {
  try {
    // Get user email
    const { data: user } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    // Create notification record
    await supabase.from("application_notifications").insert([
      {
        application_id: applicationId,
        user_id: userId,
        notification_type: notificationType,
        channel: "email",
        subject,
        content,
        status: "pending",
      },
    ]);

    // Send email (fire and forget)
    if (user?.email) {
      sendEmail({
        to: user.email,
        subject,
        html: content,
      })
        .then(async () => {
          // Update notification status to sent
          await supabase
            .from("application_notifications")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("application_id", applicationId)
            .eq("notification_type", notificationType)
            .eq("status", "pending");
        })
        .catch((err) => {
          console.error("Failed to send notification email:", err);
        });
    }
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

function getStatusChangeEmailContent(
  status: ApplicationStatus,
  application: any,
  options?: { rejectionReason?: string; rejectionDetails?: any }
): string {
  const applicantName = application.users?.full_name || "Applicant";
  const propertyTitle = application.properties?.title || "the property";

  const statusMessages: Record<ApplicationStatus, string> = {
    draft: "",
    pending_payment: `
      <h2>Payment Required</h2>
      <p>Dear ${applicantName},</p>
      <p>Your application for <strong>${propertyTitle}</strong> is ready. Please complete the application fee payment to proceed.</p>
      <p>Once payment is verified, your application will be submitted for review.</p>
    `,
    payment_verified: `
      <h2>Payment Verified</h2>
      <p>Dear ${applicantName},</p>
      <p>Your application fee for <strong>${propertyTitle}</strong> has been verified. Your application is now ready to be submitted for review.</p>
    `,
    submitted: `
      <h2>Application Submitted</h2>
      <p>Dear ${applicantName},</p>
      <p>Your application for <strong>${propertyTitle}</strong> has been successfully submitted and is now pending review.</p>
      <p>We will notify you once the property owner reviews your application.</p>
    `,
    under_review: `
      <h2>Application Under Review</h2>
      <p>Dear ${applicantName},</p>
      <p>Great news! Your application for <strong>${propertyTitle}</strong> is now being reviewed by the property owner.</p>
      <p>We will keep you updated on any changes to your application status.</p>
    `,
    info_requested: `
      <h2>Additional Information Requested</h2>
      <p>Dear ${applicantName},</p>
      <p>The property owner has requested additional information for your application to <strong>${propertyTitle}</strong>.</p>
      <p>Please log in to your account and provide the requested information as soon as possible.</p>
    `,
    conditional_approval: `
      <h2>Conditional Approval</h2>
      <p>Dear ${applicantName},</p>
      <p>Good news! Your application for <strong>${propertyTitle}</strong> has been conditionally approved.</p>
      <p>To complete the approval process, please review the requirements listed in your dashboard and provide the requested documents or information.</p>
      <p>Once all conditions are satisfied, your application will be fully approved.</p>
    `,
    approved: `
      <h2>Congratulations! Application Approved</h2>
      <p>Dear ${applicantName},</p>
      <p>We are pleased to inform you that your application for <strong>${propertyTitle}</strong> has been approved!</p>
      <p>The property owner will be in touch with you shortly regarding the next steps for your lease agreement.</p>
    `,
    rejected: `
      <h2>Application Status Update</h2>
      <p>Dear ${applicantName},</p>
      <p>We regret to inform you that your application for <strong>${propertyTitle}</strong> was not approved at this time.</p>
      ${options?.rejectionReason ? `<p><strong>Reason:</strong> ${options.rejectionReason}</p>` : ""}
      ${options?.rejectionDetails?.appealable ? "<p>If you believe this decision was made in error, you may appeal by contacting the property owner.</p>" : ""}
      <p>We encourage you to continue your search for the perfect home.</p>
    `,
    withdrawn: `
      <h2>Application Withdrawn</h2>
      <p>Dear ${applicantName},</p>
      <p>Your application for <strong>${propertyTitle}</strong> has been withdrawn as requested.</p>
      <p>If you wish to apply again in the future, please submit a new application.</p>
    `,
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        h2 { color: #2563eb; }
        p { margin: 10px 0; }
      </style>
    </head>
    <body>
      ${statusMessages[status]}
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated message from Choice Properties. Please do not reply to this email.
      </p>
    </body>
    </html>
  `;
}

// Check and withdraw old draft applications due to inactivity
export async function withdrawOldDraftApplications(daysOld: number = 30): Promise<number> {
  try {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - daysOld);

    const { data: oldDrafts, error } = await supabase
      .from("applications")
      .select("id, user_id")
      .eq("status", "draft")
      .lt("created_at", expirationDate.toISOString());

    if (error || !oldDrafts) {
      console.error("Error fetching old draft applications:", error);
      return 0;
    }

    let withdrawnCount = 0;
    for (const app of oldDrafts) {
      const result = await updateApplicationStatus(app.id, "withdrawn", "system", {
        reason: "Application withdrawn due to inactivity",
      });
      if (result.success) {
        withdrawnCount++;
      }
    }

    return withdrawnCount;
  } catch (err) {
    console.error("Error withdrawing old applications:", err);
    return 0;
  }
}

// Get application with full details including co-applicants and comments
export async function getApplicationWithDetails(applicationId: string): Promise<any> {
  try {
    const { data: application, error } = await supabase
      .from("applications")
      .select(`
        *,
        properties(*),
        users(id, full_name, email, phone, profile_image)
      `)
      .eq("id", applicationId)
      .single();

    if (error) throw error;

    // Get co-applicants
    const { data: coApplicants } = await supabase
      .from("co_applicants")
      .select("*")
      .eq("application_id", applicationId);

    // Get comments
    const { data: comments } = await supabase
      .from("application_comments")
      .select("*, users(id, full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    // Get notifications
    const { data: notifications } = await supabase
      .from("application_notifications")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    return {
      ...application,
      coApplicants: coApplicants || [],
      comments: comments || [],
      notifications: notifications || [],
    };
  } catch (err) {
    console.error("Error fetching application details:", err);
    return null;
  }
}

// Compare applications for a property (for property owners)
export async function compareApplications(propertyId: string): Promise<any[]> {
  try {
    const { data: applications, error } = await supabase
      .from("applications")
      .select(`
        *,
        users(id, full_name, email, phone)
      `)
      .eq("property_id", propertyId)
      .not("status", "in", '("draft","withdrawn","expired")')
      .order("score", { ascending: false, nullsFirst: false });

    if (error) throw error;

    return (applications || []).map((app) => ({
      id: app.id,
      applicant: app.users,
      status: app.status,
      score: app.score,
      scoreBreakdown: app.score_breakdown,
      submittedAt: app.created_at,
      employment: app.employment,
      personalInfo: app.personal_info,
    }));
  } catch (err) {
    console.error("Error comparing applications:", err);
    return [];
  }
}

// Set application expiration date
export async function setApplicationExpiration(
  applicationId: string,
  daysUntilExpiration: number = 30
): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysUntilExpiration);

    const { error } = await supabase
      .from("applications")
      .update({ expires_at: expiresAt.toISOString() })
      .eq("id", applicationId);

    return !error;
  } catch (err) {
    return false;
  }
}
