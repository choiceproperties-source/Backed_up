import { insertApplicationSchema } from "@shared/schema";
import { sendEmail, getApplicationConfirmationEmailTemplate } from "../../email";
import { notifyOwnerOfNewApplication } from "../../notification-service";
import * as applicationRepository from "./application.repository";

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

export async function createApplication(input: CreateApplicationInput): Promise<{ data?: any; error?: string }> {
  const validation = insertApplicationSchema.safeParse(input.body);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  const propertyId = validation.data.propertyId as string;

  // Prevent duplicate applications per property per user
  const { exists } = await applicationRepository.checkDuplicateApplication(input.userId, propertyId);
  if (exists) {
    return { error: "You have already applied for this property. Please check your existing applications." };
  }

  const applicationData = {
    ...validation.data,
    user_id: input.userId,
    status: "submitted",
  };

  const data = await applicationRepository.createApplication(applicationData);

  const appId = data?.id;

  const userData = await applicationRepository.getUser(input.userId);
  const propertyData = await applicationRepository.getProperty(propertyId);

  // Create conversation linking tenant and landlord
  if (appId && propertyData?.owner_id) {
    try {
      const conversation = await applicationRepository.createConversation({
        property_id: propertyId,
        application_id: appId,
        subject: `Application for ${propertyData.title}`,
      });

      if (conversation) {
        // Add both participants
        await applicationRepository.addConversationParticipant(conversation.id, input.userId);
        await applicationRepository.addConversationParticipant(conversation.id, propertyData.owner_id);

        // Update application with conversation_id
        await applicationRepository.updateApplicationConversation(appId, conversation.id);
      }
    } catch (err: any) {
      console.error("Conversation creation error:", err);
    }
  }

  if (userData?.email) {
    // Fire-and-forget email sending (don't block request)
    sendEmail({
      to: userData.email,
      subject: "Your Application Has Been Received",
      html: getApplicationConfirmationEmailTemplate({
        applicantName: userData.full_name || "Applicant",
        propertyTitle: propertyData?.title || "Your Property",
      }),
    }).catch((err) => console.error("Email send error:", err));
  }

  // Notify property owner of new application
  if (appId) {
    notifyOwnerOfNewApplication(appId).catch((err) => 
      console.error("Owner notification error:", err)
    );
  }

  return { data };
}

export async function getApplicationById(id: string): Promise<any> {
  const data = await applicationRepository.findApplicationById(id);
  return data;
}

export async function getApplicationsByUserId(userId: string, requesterUserId: string, requesterRole: string): Promise<{ data?: any; error?: string }> {
  if (userId !== requesterUserId && requesterRole !== "admin") {
    return { error: "Not authorized" };
  }

  const data = await applicationRepository.findApplicationsByUserId(userId);
  return { data };
}

export async function getApplicationsByPropertyId(propertyId: string | undefined, requesterUserId: string, requesterRole: string): Promise<{ data?: any; error?: string }> {
  if (!propertyId) {
    return { error: "Property ID is required" };
  }
  
  const property = await applicationRepository.getProperty(propertyId);

  if (property.owner_id !== requesterUserId && requesterRole !== "admin") {
    return { error: "Not authorized" };
  }

  const data = await applicationRepository.findApplicationsByPropertyId(propertyId);
  return { data };
}

export async function updateApplication(input: UpdateApplicationInput): Promise<{ data?: any; error?: string }> {
  const application = await applicationRepository.findApplicationById(input.id);

  if (!application) {
    return { error: "Application not found" };
  }

  const property = await applicationRepository.getProperty(application.property_id);

  const isOwner = application.user_id === input.userId;
  const isPropertyOwner = property?.owner_id === input.userId;
  const isAdmin = input.userRole === "admin";

  if (!isOwner && !isPropertyOwner && !isAdmin) {
    return { error: "Not authorized" };
  }

  const data = await applicationRepository.updateApplication(input.id, input.body);

  return { data };
}

export async function updateStatus(input: UpdateStatusInput): Promise<{ success: boolean; data?: any; error?: string }> {
  const { status } = input;

  if (!status) {
    return { success: false, error: "Status is required" };
  }

  // Verify authorization
  const application = await applicationRepository.findApplicationById(input.id);

  if (!application) {
    return { success: false, error: "Application not found" };
  }

  const property = await applicationRepository.getProperty(application.property_id);

  const isApplicant = application.user_id === input.userId;
  const isPropertyOwner = property?.owner_id === input.userId;
  const isAdmin = input.userRole === "admin";

  // Only applicant can withdraw, only property owner/admin can approve/reject
  if (status === "withdrawn" && !isApplicant) {
    return { success: false, error: "Only applicant can withdraw application" };
  }

  if (["approved", "rejected", "under_review", "pending_verification"].includes(status) && !isPropertyOwner && !isAdmin) {
    return { success: false, error: "Only property owner can update this status" };
  }

  const statusHistoryEntry = {
    status,
    changedAt: new Date().toISOString(),
    changedBy: input.userId,
    reason: input.reason,
  };

  const existingHistory = application.status_history || [];

  const updateData: Record<string, any> = {
    status,
    previous_status: application.status,
    status_history: [...existingHistory, statusHistoryEntry],
    updated_at: new Date().toISOString(),
  };

  if (input.rejectionCategory) {
    updateData.rejection_category = input.rejectionCategory;
  }
  if (input.rejectionReason) {
    updateData.rejection_reason = input.rejectionReason;
  }
  if (input.rejectionDetails) {
    updateData.rejection_details = input.rejectionDetails;
  }

  const data = await applicationRepository.updateApplicationStatus(input.id, updateData);

  return { success: true, data };
}
