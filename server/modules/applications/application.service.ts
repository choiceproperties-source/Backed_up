import { insertApplicationSchema, type ApplicationStatus, type RejectionCategory } from "@shared/schema";
import {
  sendEmail,
  getApplicationConfirmationEmailTemplate,
} from "../../email";
import { notifyOwnerOfNewApplication, sendStatusChangeNotification, notifyOwnerOfScoringComplete } from "../../notification-service";
import * as applicationRepository from "./application.repository";

/* ------------------------------------------------ */
/* Constants & Helpers */
/* ------------------------------------------------ */

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

/**
 * Mock Credit Bureau Integration
 * Structure ready for real provider (Experian/TransUnion/Plaid)
 */
async function fetchCreditScore(ssn: string): Promise<number> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Deterministic mock score based on SSN last digit for testing
  const lastDigit = parseInt(ssn.slice(-1)) || 5;
  const baseScore = 600 + (lastDigit * 20); // 600 - 800 range
  return baseScore;
}

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

export async function calculateApplicationScore(application: any): Promise<ScoreBreakdown> {
  const flags: string[] = [];
  let incomeScore = 0;
  let creditScore = 0;
  let rentalHistoryScore = 0;
  let employmentScore = 0;
  let documentsScore = 0;

  // 1. Income score (max 25 points)
  const employment = application.employment || {};
  let monthlyIncome = parseFloat(employment.monthlyIncome || employment.income || 0);
  
  if (application.coApplicants && Array.isArray(application.coApplicants)) {
    const coApplicantIncome = application.coApplicants.reduce((sum: number, co: any) => {
      const coIncome = parseFloat(co.income || 0);
      return sum + coIncome;
    }, 0);
    monthlyIncome += coApplicantIncome;
  }

  if (monthlyIncome >= 5000) incomeScore = 25;
  else if (monthlyIncome >= 4000) incomeScore = 22;
  else if (monthlyIncome >= 3000) incomeScore = 18;
  else if (monthlyIncome >= 2000) incomeScore = 12;
  else if (monthlyIncome > 0) {
    incomeScore = 5;
    flags.push("low_income");
  } else {
    flags.push("no_income_provided");
  }

  // 2. Credit score (max 25 points) - Refactored to use mock API
  const personalInfo = application.personalInfo || {};
  const ssn = personalInfo.ssnProvided || personalInfo.ssn;
  
  if (ssn) {
    const score = await fetchCreditScore(ssn.toString());
    if (score >= 750) creditScore = 25;
    else if (score >= 700) creditScore = 20;
    else if (score >= 650) creditScore = 15;
    else if (score >= 600) creditScore = 10;
    else {
      creditScore = 5;
      flags.push("poor_credit_score");
    }
  } else {
    creditScore = 0;
    flags.push("no_credit_check_authorization");
  }

  // 3. Rental history score (max 20 points)
  const rentalHistory = application.rentalHistory || {};
  let yearsRentingValue = 0;
  const rentalStr = (rentalHistory.yearsRenting || rentalHistory.duration || "0").toString();
  const rentYearMatch = rentalStr.match(/(\d+)\s*(?:year|yr)?/i);
  const rentMonthMatch = rentalStr.match(/(\d+)\s*(?:month|mo)?/);
  
  if (rentYearMatch) yearsRentingValue = parseInt(rentYearMatch[1]) || 0;
  else if (rentMonthMatch) yearsRentingValue = Math.floor(parseInt(rentMonthMatch[1]) / 12) || 0;

  if (yearsRentingValue >= 3) rentalHistoryScore = 20;
  else if (yearsRentingValue >= 2) rentalHistoryScore = 16;
  else if (yearsRentingValue >= 1) rentalHistoryScore = 12;
  else if (yearsRentingValue > 0) rentalHistoryScore = 8;
  else {
    rentalHistoryScore = 5;
    flags.push("limited_rental_history");
  }

  if (rentalHistory.hasEviction || rentalHistory.evicted) {
    rentalHistoryScore = Math.max(0, rentalHistoryScore - 15);
    flags.push("previous_eviction");
  }

  // 4. Employment score (max 15 points)
  let employmentLengthYears = 0;
  const employmentStr = (employment.yearsEmployed || employment.duration || employment.employmentLength || "0").toString();
  const yearMatch = employmentStr.match(/(\d+)\s*(?:year|yr)?/i);
  const monthMatch = employmentStr.match(/(\d+)\s*(?:month|mo)?/);
  
  if (yearMatch) employmentLengthYears = parseInt(yearMatch[1]) || 0;
  else if (monthMatch) employmentLengthYears = Math.floor(parseInt(monthMatch[1]) / 12) || 0;

  const isEmployed = employment.employed !== false && employment.status !== "unemployed";
  
  if (isEmployed && employmentLengthYears >= 2) employmentScore = 15;
  else if (isEmployed && employmentLengthYears >= 1) employmentScore = 12;
  else if (isEmployed) employmentScore = 8;
  else {
    employmentScore = 3;
    flags.push("unemployed");
  }

  // 5. Documents score (max 15 points)
  const docStatus = application.documentStatus || {};
  const requiredDocs = ["id", "proof_of_income", "employment_verification"];
  let uploadedDocs = 0;
  let verifiedDocs = 0;

  for (const doc of requiredDocs) {
    if (docStatus[doc]?.uploaded) uploadedDocs++;
    if (docStatus[doc]?.verified) verifiedDocs++;
  }

  if (verifiedDocs >= 3) documentsScore = 15;
  else if (uploadedDocs >= 3) documentsScore = 12;
  else if (uploadedDocs >= 2) documentsScore = 8;
  else if (uploadedDocs >= 1) documentsScore = 5;
  else {
    documentsScore = 0;
    flags.push("missing_documents");
  }

  return {
    incomeScore,
    creditScore,
    rentalHistoryScore,
    employmentScore,
    documentsScore,
    totalScore: incomeScore + creditScore + rentalHistoryScore + employmentScore + documentsScore,
    maxScore: 100,
    flags,
  };
}

/* ------------------------------------------------ */
/* Types */
/* ------------------------------------------------ */

export interface CreateApplicationInput {
  body: Record<string, any>;
  userId: string;
}

export interface UpdateApplicationInput {
  id: string;
  body: Record<string, any>;
  userId: string;
  userRole: string;
}

export interface UpdateStatusInput {
  id: string;
  status: ApplicationStatus;
  userId: string;
  userRole: string;
  rejectionCategory?: RejectionCategory;
  rejectionReason?: string;
  rejectionDetails?: {
    categories: string[];
    explanation: string;
    appealable: boolean;
  };
  reason?: string;
  conditionalRequirements?: any[];
  conditionalDocuments?: string[];
  dueDate?: string;
}

/* ------------------------------------------------ */
/* Create Application */
/* ------------------------------------------------ */

export async function createApplication(
  input: CreateApplicationInput
): Promise<{ data?: any; error?: string }> {
  const validation = insertApplicationSchema.safeParse(input.body);

  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const { propertyId } = validation.data;

  // Fetch property to get snapshots
  const property = await applicationRepository.getProperty(propertyId as string);
  if (!property) {
    return { error: "Property not found" };
  }

  // Prevent duplicate application per user per property
  const duplicateCheck =
    await applicationRepository.checkDuplicateApplication(
      input.userId,
      propertyId as string
    );

  if (duplicateCheck.exists) {
    return {
      error:
        "You have already applied for this property. Please check your applications.",
    };
  }

  const applicationPayload = {
    ...validation.data,
    user_id: input.userId,
    status: "submitted",
    // Snapshot pricing & lease terms
    rentSnapshot: property.price ? property.price.toString() : "0.00",
    depositSnapshot: property.price ? property.price.toString() : "0.00", 
    applicationFeeSnapshot: property.application_fee || "50.00",
    leaseTermSnapshot: property.lease_term || "12 Months",
    availableDateSnapshot: property.available_date || null,
    // Property Context
    propertyTitleSnapshot: property.title,
    propertyAddressSnapshot: property.address,
    propertyTypeSnapshot: property.property_type || "Residential",
    // Rules & Policies
    policiesSnapshot: {
      petPolicy: property.pets_allowed ? "Pets Allowed" : "No Pets",
      smokingPolicy: "No Smoking",
      occupancyLimit: 2,
      utilitiesIncluded: property.utilities_included || [],
      hoaRules: null,
    },
    propertyVersionSnapshot: property.version || 1,
    propertyStatusAtApplyTime: property.listing_status || property.status || "available",
    status_history: [
      {
        status: "submitted",
        changedAt: new Date().toISOString(),
        changedBy: input.userId,
      },
    ],
  };

  const application =
    await applicationRepository.createApplication(applicationPayload);

  if (!application?.id) {
    return { error: "Failed to create application" };
  }

  // Calculate initial score
  const scoreBreakdown = await calculateApplicationScore(application);
  await applicationRepository.updateApplication(application.id, {
    score: scoreBreakdown.totalScore,
    score_breakdown: scoreBreakdown,
    scored_at: new Date().toISOString()
  });

  const [user] = await Promise.all([
    applicationRepository.getUser(input.userId),
  ]);

  /* ------------------------------------------------ */
  /* Messaging / Conversation */
  /* ------------------------------------------------ */

  if (property?.owner_id) {
    try {
      const conversation =
        await applicationRepository.createConversation({
          property_id: propertyId,
          application_id: application.id,
          subject: `Application for ${property.title}`,
        });

      if (conversation?.id) {
        await Promise.all([
          applicationRepository.addConversationParticipant(
            conversation.id,
            input.userId
          ),
          applicationRepository.addConversationParticipant(
            conversation.id,
            property.owner_id
          ),
          applicationRepository.updateApplicationConversation(
            application.id,
            conversation.id
          ),
        ]);
      }
    } catch (err) {
      console.error("[APPLICATION] Conversation setup failed:", err);
    }
  }

  /* ------------------------------------------------ */
  /* Email + Notification (Non-blocking) */
  /* ------------------------------------------------ */

  if (user?.email) {
    sendEmail({
      to: user.email,
      subject: "Your Application Has Been Received",
      html: getApplicationConfirmationEmailTemplate({
        applicantName: user.full_name || "Applicant",
        propertyTitle: property?.title || "Property",
      }),
    }).catch((err) =>
      console.error("[APPLICATION] Confirmation email failed:", err)
    );
  }

  notifyOwnerOfNewApplication(application.id).catch((err) =>
    console.error("[APPLICATION] Owner notification failed:", err)
  );

  return { data: application };
}

/* ------------------------------------------------ */
/* Read Operations */
/* ------------------------------------------------ */

export async function getApplicationById(id: string): Promise<any> {
  return applicationRepository.findApplicationById(id);
}

export async function getApplicationsByUserId(
  userId: string,
  requesterUserId: string,
  requesterRole: string
): Promise<{ data?: any; error?: string }> {
  if (userId !== requesterUserId && requesterRole !== "admin") {
    return { error: "Not authorized" };
  }

  const data =
    await applicationRepository.findApplicationsByUserId(userId);

  return { data };
}

export async function getApplicationsByPropertyId(
  propertyId: string | undefined,
  requesterUserId: string,
  requesterRole: string
): Promise<{ data?: any; error?: string }> {
  if (!propertyId) {
    return { error: "Property ID is required" };
  }

  const property = await applicationRepository.getProperty(propertyId);

  if (!property) {
    return { error: "Property not found" };
  }

  if (
    property.owner_id !== requesterUserId &&
    requesterRole !== "admin"
  ) {
    return { error: "Not authorized" };
  }

  const data =
    await applicationRepository.findApplicationsByPropertyId(propertyId);

  return { data };
}

/* ------------------------------------------------ */
/* Update Application */
/* ------------------------------------------------ */

export async function updateApplication(
  input: UpdateApplicationInput
): Promise<{ data?: any; error?: string }> {
  const application =
    await applicationRepository.findApplicationById(input.id);

  if (!application) {
    return { error: "Application not found" };
  }

  const property =
    await applicationRepository.getProperty(application.property_id);

  const isApplicant = application.user_id === input.userId;
  const isPropertyOwner = property?.owner_id === input.userId;
  const isAdmin = input.userRole === "admin";

  if (!isApplicant && !isPropertyOwner && !isAdmin) {
    return { error: "Not authorized" };
  }

  const data = await applicationRepository.updateApplication(
    input.id,
    input.body
  );

  // Re-calculate score if employment or personal info changed
  if (input.body.employment || input.body.personal_info) {
    const updatedApp = await applicationRepository.findApplicationById(input.id);
    const scoreBreakdown = await calculateApplicationScore(updatedApp);
    await applicationRepository.updateApplication(input.id, {
      score: scoreBreakdown.totalScore,
      score_breakdown: scoreBreakdown,
      scored_at: new Date().toISOString()
    });
    
    notifyOwnerOfScoringComplete(input.id, scoreBreakdown.totalScore, 100).catch(console.error);
  }

  return { data };
}

/* ------------------------------------------------ */
/* Update Status */
/* ------------------------------------------------ */

export async function updateStatus(
  input: UpdateStatusInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!input.status) {
    return { success: false, error: "Status is required" };
  }

  const application =
    await applicationRepository.findApplicationById(input.id);

  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const property =
    await applicationRepository.getProperty(application.property_id);

  const isApplicant = application.user_id === input.userId;
  const isPropertyOwner = property?.owner_id === input.userId;
  const isAdmin = input.userRole === "admin";

  // Validate transition
  if (!isValidStatusTransition(application.status as ApplicationStatus, input.status)) {
    return {
      success: false,
      error: `Invalid status transition from ${application.status} to ${input.status}`,
    };
  }

  // Role-based enforcement
  if (input.status === "withdrawn" && !isApplicant) {
    return {
      success: false,
      error: "Only the applicant can withdraw this application",
    };
  }

  if (
    ["approved", "rejected", "under_review", "info_requested", "conditional_approval"].includes(
      input.status
    ) &&
    !isPropertyOwner &&
    !isAdmin
  ) {
    return {
      success: false,
      error: "Only the property owner can perform this action",
    };
  }

  if (input.status === "submitted" && !isApplicant) {
    return {
      success: false,
      error: "Only the applicant can submit the application",
    };
  }

  const historyEntry = {
    status: input.status,
    changedAt: new Date().toISOString(),
    changedBy: input.userId,
    reason: input.reason,
  };

  const updatePayload: Record<string, any> = {
    status: input.status,
    previous_status: application.status,
    status_history: [...(application.status_history || []), historyEntry],
    updated_at: new Date().toISOString(),
  };

  if (input.rejectionCategory) updatePayload.rejection_category = input.rejectionCategory;
  if (input.rejectionReason) updatePayload.rejection_reason = input.rejectionReason;
  if (input.rejectionDetails) updatePayload.rejection_details = input.rejectionDetails;

  if (input.status === "approved" || input.status === "rejected") {
    updatePayload.reviewed_by = input.userId;
    updatePayload.reviewed_at = new Date().toISOString();
  }

  const data =
    await applicationRepository.updateApplicationStatus(
      input.id,
      updatePayload
    );

  // Send Notifications
  sendStatusChangeNotification(input.id, input.status, {
    rejectionReason: input.rejectionReason,
    appealable: input.rejectionDetails?.appealable
  }).catch(console.error);

  return { success: true, data };
}