import { insertApplicationSchema } from "@shared/schema";
import {
  sendEmail,
  getApplicationConfirmationEmailTemplate,
} from "../../email";
import { notifyOwnerOfNewApplication } from "../../notification-service";
import * as applicationRepository from "./application.repository";

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
  status: string;
  userId: string;
  userRole: string;
  rejectionCategory?: string;
  rejectionReason?: string;
  rejectionDetails?: any;
  reason?: string;
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

  // Prevent duplicate application per user per property
  const duplicateCheck =
    await applicationRepository.checkDuplicateApplication(
      input.userId,
      propertyId
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

  const [user, property] = await Promise.all([
    applicationRepository.getUser(input.userId),
    applicationRepository.getProperty(propertyId),
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

  // Permission rules
  if (input.status === "withdrawn" && !isApplicant) {
    return {
      success: false,
      error: "Only the applicant can withdraw this application",
    };
  }

  if (
    ["approved", "rejected", "under_review", "pending_verification"].includes(
      input.status
    ) &&
    !isPropertyOwner &&
    !isAdmin
  ) {
    return {
      success: false,
      error: "Only the property owner can update this status",
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

  if (input.rejectionCategory) {
    updatePayload.rejection_category = input.rejectionCategory;
  }

  if (input.rejectionReason) {
    updatePayload.rejection_reason = input.rejectionReason;
  }

  if (input.rejectionDetails) {
    updatePayload.rejection_details = input.rejectionDetails;
  }

  const data =
    await applicationRepository.updateApplicationStatus(
      input.id,
      updatePayload
    );

  return { success: true, data };
}