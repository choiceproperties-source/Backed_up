import { 
  isValidStatusTransition, 
  getValidNextStatuses, 
  calculateApplicationScore,
  updateStatus,
  getApplicationById
} from "./modules/applications/application.service";

// Re-export core logic from modular service for backward compatibility
export { 
  isValidStatusTransition, 
  getValidNextStatuses, 
  calculateApplicationScore,
  getApplicationById
};

// Map legacy updateApplicationStatus to modular updateStatus
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: any,
  userId: string,
  options?: any
): Promise<{ success: boolean; error?: string; data?: any }> {
  return updateStatus({
    id: applicationId,
    status: newStatus,
    userId,
    userRole: options?.userRole || "renter", // Fallback to safe default
    ...options
  });
}
