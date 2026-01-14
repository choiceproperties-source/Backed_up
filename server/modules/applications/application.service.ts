import { insertApplicationSchema, type ApplicationStatus, type RejectionCategory } from "@shared/schema";
import { encrypt } from "../../security/encryption";
import {
  sendEmail,
  getApplicationConfirmationEmailTemplate,
} from "../../email";
import { notifyOwnerOfNewApplication, sendStatusChangeNotification, notifyOwnerOfScoringComplete } from "../../notification-service";
import * as applicationRepository from "./application.repository";
import * as legalRepository from "../legal-documents/legal-documents.repository";
import { getRequiredDisclosures } from "@shared/state-disclosures";
import { generateDisclosurePdf } from "../../services/applicationDisclosurePdf";
import { generateLeasePdf } from "../../services/leaseAgreementPdf";

/* ------------------------------------------------ */
/* Constants & Helpers */
/* ------------------------------------------------ */

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["under_review", "withdrawn", "payment_requested"],
  under_review: ["approved", "rejected", "withdrawn", "payment_requested"],
  payment_requested: ["submitted", "under_review", "withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return validTransitions.includes(newStatus);
}

export function getValidNextStatuses(currentStatus: string): string[] {
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
  legalAcceptance?: boolean;
  paymentRequest?: {
    amount: string;
    purpose: string;
    message?: string;
    landlordMessage?: string;
  };
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
    status: "draft",
    customAnswers: validation.data.customAnswers || {},
    stateDisclosures: validation.data.stateDisclosures || {},
    // Encrypt SSN if provided in personalInfo
    personalInfo: validation.data.personalInfo ? {
      ...(validation.data.personalInfo as object),
      ssn: (validation.data.personalInfo as any).ssn ? encrypt((validation.data.personalInfo as any).ssn.toString()) : undefined
    } : undefined,
    // Snapshot pricing & lease terms
    rentSnapshot: property.price ? property.price.toString() : "0.00",
    depositSnapshot: property.price ? property.price.toString() : "0.00", 
    applicationFeeSnapshot: property.application_fee || property.applicationFee || "50.00",
    leaseTermSnapshot: property.lease_term || property.leaseTerm || "12 Months",
    availableDateSnapshot: property.available_date || property.availableDate || null,
    // Property Context
    propertyTitleSnapshot: property.title,
    propertyAddressSnapshot: property.address,
    propertyTypeSnapshot: property.property_type || property.propertyType || "Residential",
    // Rules & Policies snapshot
    policiesSnapshot: {
      petPolicy: property.pets_allowed ? "Pets Allowed" : (property.pets_allowed === false ? "No Pets" : null),
      smokingPolicy: property.smoking_allowed ? "Smoking Allowed" : (property.smoking_allowed === false ? "No Smoking" : null),
      occupancyLimit: (property as any).occupancy_limit || 2,
      utilitiesIncluded: property.utilities_included || [],
      rulesText: property.rules_text || null,
    },
    propertyVersionSnapshot: property.version || 1,
    propertyStatusAtApplyTime: property.listing_status || property.status || "available",
    status_history: [
      {
        status: "draft",
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

export async function getLatestDraftByPropertyId(
  propertyId: string,
  userId: string
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findLatestDraftByPropertyId(propertyId, userId);
  return { data: application };
}

export async function autosaveApplication(
  id: string,
  body: Record<string, any>,
  userId: string
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(id);

  if (!application) {
    return { error: "Application not found" };
  }

  if (application.user_id !== userId) {
    return { error: "Not authorized" };
  }

  // ALLOW autosave ONLY if status is draft or in_progress
  if (application.status !== "draft" && application.status !== "in_progress") {
    return { error: `Application is in ${application.status} status and cannot be edited` };
  }

  // Enforce immutability of legal disclosures after initial set if status is not draft
  // (though the above check already handles it, we be explicit)
  if (body.legalDisclosures && application.status !== "draft") {
    return { error: "Legal disclosures cannot be modified after submission" };
  }

  // Encrypt SSN if provided in personalInfo during autosave
  const processedBody = { ...body };
  
  // Ensure we don't accidentally change status during autosave
  delete processedBody.status;

  if (processedBody.personalInfo?.ssn) {
    const ssnValue = processedBody.personalInfo.ssn.toString();
    // Only encrypt if it's not already redacted or empty
    if (ssnValue && ssnValue !== "REDACTED" && !ssnValue.includes("*")) {
      processedBody.personalInfo = {
        ...processedBody.personalInfo,
        ssn: encrypt(ssnValue.replace(/\D/g, ""))
      };
    } else if (ssnValue === "REDACTED" || ssnValue.includes("*")) {
      // Prevent overwriting the real encrypted SSN with a masked version
      const { ssn, ...rest } = processedBody.personalInfo;
      processedBody.personalInfo = rest;
    }
  }

  // Ensure stateDisclosures and customAnswers are included in partial update
  if (processedBody.stateDisclosures) {
    processedBody.state_disclosures = processedBody.stateDisclosures;
  }
  if (processedBody.customAnswers) {
    processedBody.custom_answers = processedBody.customAnswers;
  }

  // Track lastSavedStep
  if (processedBody.step !== undefined) {
    processedBody.lastSavedStep = processedBody.step;
  }

  // Partial update without strict validation
  const data = await applicationRepository.updateApplication(id, processedBody);

  return { data };
}

/* ------------------------------------------------ */
/* Read Operations */
/* ------------------------------------------------ */

function redactSensitiveData(application: any, requesterRole: string): any {
  if (!application) return application;
  const redacted = { ...application };
  
  // Never return SSN to anyone but Admin or if explicitly required for internal processing
  // Property Managers and Owners should never see the full SSN
  if (redacted.personalInfo?.ssn) {
    if (requesterRole !== "admin") {
      const { ssn, ...rest } = redacted.personalInfo;
      redacted.personalInfo = {
        ...rest,
        ssn_provided: true,
        ssn: "REDACTED"
      };
    }
  }

  // Ensure payment_request is handled correctly
  // Only include it if it exists and status is appropriate, or if user is owner/admin
  if (redacted.payment_request) {
    const isOwner = requesterRole === "landlord" || requesterRole === "property_manager" || requesterRole === "admin";
    const isRequested = redacted.status === "payment_requested" || redacted.payment_request.status !== "pending";
    
    if (!isOwner && !isRequested) {
      delete redacted.payment_request;
    }
  }

  return redacted;
}

export async function verifyPayment(
  id: string,
  userId: string
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(id);
  if (!application) return { error: "Application not found" };

  const property = await applicationRepository.getProperty(application.property_id);
  if (!property || property.owner_id !== userId) return { error: "Not authorized" };

  if (application.status !== "payment_completed") {
    return { error: "Payment not completed yet" };
  }

  const paymentRequest = application.payment_request as any;
  if (!paymentRequest || paymentRequest.payment_status !== 'COMPLETED') {
    return { error: "Payment intent not completed" };
  }

  const statusHistory = [
    ...(application.status_history as any[] || []),
    {
      from: 'payment_completed',
      to: 'under_review',
      changedAt: new Date().toISOString(),
      changedBy: userId,
      reason: 'Payment verified by landlord'
    }
  ];

  const updatedApplication = await applicationRepository.updateApplication(id, {
    status: 'under_review',
    status_history: statusHistory
  });

  return { data: updatedApplication };
}

export async function approveApplication(
  id: string,
  landlordId: string
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(id);
  if (!application) return { error: "Application not found" };

  const property = await applicationRepository.getProperty(application.property_id);
  if (!property || property.owner_id !== landlordId) return { error: "Not authorized" };

  if (application.status !== "under_review" && application.status !== "payment_completed") {
    return { error: "Application is not in a reviewable state" };
  }

  const statusHistory = [
    ...(application.status_history as any[] || []),
    {
      status: 'approved',
      changedAt: new Date().toISOString(),
      changedBy: landlordId,
      action: 'approved',
      reason: 'Application approved by landlord'
    }
  ];

  const updatedApplication = await applicationRepository.updateApplication(id, {
    status: 'approved',
    status_history: statusHistory,
    reviewed_at: new Date().toISOString(),
    reviewed_by: landlordId
  });

  // Trigger notification
  sendStatusChangeNotification(id, "approved", { rejectionReason: 'Application approved by landlord' }).catch(console.error);

  return { data: updatedApplication };
}

export async function rejectApplication(
  id: string,
  landlordId: string,
  rejectionCategory: RejectionCategory,
  rejectionReason: string,
  rejectionDetails?: any
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(id);
  if (!application) return { error: "Application not found" };

  const property = await applicationRepository.getProperty(application.property_id);
  if (!property || property.owner_id !== landlordId) return { error: "Not authorized" };

  const statusHistory = [
    ...(application.status_history as any[] || []),
    {
      status: 'rejected',
      changedAt: new Date().toISOString(),
      changedBy: landlordId,
      action: 'rejected',
      reason: rejectionReason,
      category: rejectionCategory
    }
  ];

  const updatedApplication = await applicationRepository.updateApplication(id, {
    status: 'rejected',
    status_history: statusHistory,
    rejection_category: rejectionCategory,
    rejection_reason: rejectionReason,
    rejection_details: rejectionDetails,
    reviewed_at: new Date().toISOString(),
    reviewed_by: landlordId
  });

  // Trigger notification
  sendStatusChangeNotification(id, "rejected", { rejectionReason }).catch(console.error);

  return { data: updatedApplication };
}

export async function completePayment(
  id: string,
  userId: string
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(id);
  if (!application) return { error: "Application not found" };

  if (application.user_id !== userId) return { error: "Not authorized" };
  if (application.status !== "payment_requested") return { error: "Payment not requested" };

  const paymentRequest = application.payment_request as any;
  if (!paymentRequest || !paymentRequest.payment_intent_id) {
    return { error: "No payment intent found" };
  }

  if (paymentRequest.payment_status === 'COMPLETED') {
    return { error: "Payment already completed" };
  }

  if (paymentRequest.payment_status !== 'PENDING') {
    return { error: "Invalid payment status" };
  }

  const updatedPaymentRequest = {
    ...paymentRequest,
    payment_status: 'COMPLETED',
    completed_at: new Date().toISOString()
  };

  const statusHistory = [
    ...(application.status_history as any[] || []),
    {
      from: 'payment_requested',
      to: 'payment_completed',
      changedAt: new Date().toISOString(),
      changedBy: userId,
      reason: 'Application fee paid'
    }
  ];

  const updatedApplication = await applicationRepository.updateApplication(id, {
    status: 'payment_completed',
    payment_request: updatedPaymentRequest,
    status_history: statusHistory
  });

  return { data: updatedApplication };
}

export async function initiatePayment(
  id: string,
  userId: string
): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(id);
  if (!application) return { error: "Application not found" };

  if (application.user_id !== userId) return { error: "Not authorized" };
  if (application.status !== "payment_requested") return { error: "Payment not requested" };

  const paymentRequest = application.payment_request as any;
  
  // Check if payment already initiated/completed
  if (paymentRequest.payment_intent_id) {
    return { error: "Payment already initiated" };
  }

  const paymentIntentId = `pi_${Math.random().toString(36).substring(7)}`;
  
  // Create a placeholder payment_intent in the application metadata
  const updatedPaymentRequest = {
    ...paymentRequest,
    payment_intent_id: paymentIntentId,
    payment_status: 'PENDING',
    initiated_by: userId,
    initiated_at: new Date().toISOString()
  };

  await applicationRepository.updateApplication(id, {
    payment_request: updatedPaymentRequest
  });

  return { data: { payment_intent_id: paymentIntentId } };
}

export async function getApplicationById(id: string, requesterRole: string = "user"): Promise<any> {
  const application = await applicationRepository.findApplicationById(id);
  return redactSensitiveData(application, requesterRole);
}

export async function getApplicationsByUserId(
  userId: string,
  requesterUserId: string,
  requesterRole: string
): Promise<{ data?: any; error?: string }> {
  if (userId !== requesterUserId && requesterRole !== "admin") {
    return { error: "Not authorized" };
  }

  const applications = await applicationRepository.findApplicationsByUserId(userId);
  const data = applications.map((app: any) => redactSensitiveData(app, requesterRole));

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
    requesterRole !== "admin" &&
    requesterRole !== "property_manager"
  ) {
    return { error: "Not authorized" };
  }

  const applications = await applicationRepository.findApplicationsByPropertyId(propertyId);
  const data = applications.map((app: any) => redactSensitiveData(app, requesterRole));

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

  // Block edits after submission for applicants
  if (isApplicant && !isAdmin && (application.status === "submitted" || application.status === "under_review" || application.status === "approved" || application.status === "rejected")) {
    return { error: "Application is locked and cannot be edited after submission" };
  }

  const processedBody = { ...input.body };
  if (processedBody.personalInfo?.ssn) {
    processedBody.personalInfo = {
      ...processedBody.personalInfo,
      ssn: encrypt(processedBody.personalInfo.ssn.toString())
    };
  }

  const data = await applicationRepository.updateApplication(
    input.id,
    processedBody
  );

  // Re-calculate score if employment or personal info changed
  if (input.body.employment || input.body.personalInfo) {
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

  const application = await applicationRepository.findApplicationById(input.id);
  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const property = await applicationRepository.getProperty(application.property_id);
  const isApplicant = application.user_id === input.userId;
  const isPropertyOwner = property?.owner_id === input.userId;
  const isAdmin = input.userRole === "admin";
  const isPropertyManager = input.userRole === "property_manager";

  // Validate transition
  if (!isValidStatusTransition(application.status as string, input.status)) {
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
    ["approved", "rejected", "under_review", "info_requested", "conditional_approval"].includes(input.status) &&
    !isPropertyOwner &&
    !isAdmin &&
    !isPropertyManager
  ) {
    return {
      success: false,
      error: "Not authorized to update application status",
    };
  }

  if (input.status === "submitted" && !isApplicant) {
    return {
      success: false,
      error: "Only the applicant can submit the application",
    };
  }

  if (input.status === "submitted") {
    // Basic structural checks first
    if (!application.personalInfo || !application.employment || !application.rentalHistory) {
      return {
        success: false,
        error: "Personal, employment, and rental history details are required for submission",
      };
    }

    // Property snapshot check
    if (!application.rentSnapshot || !application.propertyTitleSnapshot) {
      return {
        success: false,
        error: "Property information snapshot is missing. Please contact support.",
      };
    }

    // Legal Acceptance check (mandatory for submission)
    if (input.legalAcceptance !== true) {
      return {
        success: false,
        error: "Legal acceptance is required before submitting an application.",
      };
    }

    const personal = application.personalInfo as any;
    const employment = application.employment as any;
    
    const requiredFields = {
      firstName: personal.firstName,
      lastName: personal.lastName,
      email: personal.email,
      phone: personal.phone,
      employerName: employment.employerName,
      monthlyIncome: employment.monthlyIncome,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        return {
          success: false,
          error: `Required field missing: ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        };
      }
    }

    // Federal Disclosures
    if (!application.legalDisclosures?.fairHousingAcknowledged ||
        !application.legalDisclosures?.creditCheckAuthorized ||
        !application.legalDisclosures?.accuracyCertified ||
        !application.legalDisclosures?.feeAcknowledged) {
      return {
        success: false,
        error: "All legal disclosures must be acknowledged before submission",
      };
    }

    // State Disclosures
    const property = await applicationRepository.getProperty(application.property_id);
    const requiredStateDisclosures = getRequiredDisclosures(property?.state);
    
    if (requiredStateDisclosures.length > 0) {
      const acknowledged = application.stateDisclosures || {};
      for (const disclosure of requiredStateDisclosures) {
        if (!acknowledged[disclosure.id]?.acknowledged) {
          return {
            success: false,
            error: `State disclosure required: ${disclosure.label}`,
          };
        }
      }
    }
  }

  // Enforce one-way transitions for critical states
  if (application.status === "submitted" && input.status === "draft") {
    return {
      success: false,
      error: "Cannot move application back to draft after submission",
    };
  }

  // Handle PAYMENT_REQUESTED specific checks
  if (input.status === "payment_requested") {
    if (!isPropertyOwner && !isAdmin && !isPropertyManager) {
      return {
        success: false,
        error: "Only landlords or authorized managers can request payment",
      };
    }

    if (application.paymentRequest) {
      return {
        success: false,
        error: "A payment request already exists for this application",
      };
    }

    if (!input.paymentRequest || !input.paymentRequest.amount || !input.paymentRequest.purpose) {
      return {
        success: false,
        error: "Payment request details (amount and purpose) are required",
      };
    }
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

  if (input.status === "submitted" && input.legalAcceptance === true) {
    const activeDocs = await legalRepository.getActiveLegalDocuments();
    const documentVersions: Record<string, string> = {};
    activeDocs.forEach((doc: any) => {
      documentVersions[doc.key] = doc.version;
    });

    updatePayload.legalAcceptance = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      documents: documentVersions
    };
  }

  if (input.rejectionCategory) updatePayload.rejection_category = input.rejectionCategory;
  if (input.rejectionReason) updatePayload.rejection_reason = input.rejectionReason;
  if (input.rejectionDetails) updatePayload.rejection_details = input.rejectionDetails;

  if (input.status === "payment_requested" && input.paymentRequest) {
    updatePayload.payment_request = {
      amount: input.paymentRequest.amount,
      purpose: input.paymentRequest.purpose,
      landlordMessage: input.paymentRequest.landlordMessage || input.paymentRequest.message,
      requestedAt: new Date().toISOString(),
      status: "pending"
    };
  }

  if (input.status === "approved" || input.status === "rejected") {
    updatePayload.reviewed_by = input.userId;
    updatePayload.reviewed_at = new Date().toISOString();
  }

  const data =
    await applicationRepository.updateApplicationStatus(
      input.id,
      updatePayload
    );

  // Generate Lease PDF once approved
  if (input.status === "approved" && !application.leasePdfUrl) {
    try {
      const leaseUrl = await generateLeasePdf(input.id);
      await applicationRepository.updateApplication(input.id, {
        leasePdfUrl: leaseUrl,
        leaseGeneratedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("[APPLICATION] Lease PDF generation failed:", err);
    }
  }

  // Generate PDF once at submission
  if (input.status === "submitted" && !application.disclosurePdfUrl) {
    try {
      const pdfUrl = await generateDisclosurePdf(input.id);
      await applicationRepository.updateApplication(input.id, {
        disclosurePdfUrl: pdfUrl
      });
    } catch (err) {
      console.error("[APPLICATION] PDF generation failed:", err);
    }
  }

  // Send Notifications
  sendStatusChangeNotification(input.id, input.status, {
    rejectionReason: input.rejectionReason,
    appealable: input.rejectionDetails?.appealable
  }).catch(console.error);

  return { success: true, data };
}