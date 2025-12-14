/**
 * Shared Constants
 * 
 * Centralized definitions for business logic constants used across
 * frontend and backend. These are imported by application code.
 */

// ===== USER ROLES =====
export const USER_ROLES = {
  RENTER: "renter",
  AGENT: "agent",
  LANDLORD: "landlord",
  PROPERTY_MANAGER: "property_manager",
  ADMIN: "admin",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role hierarchy for permission checks
// Higher number = more permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.RENTER]: 10,
  [USER_ROLES.AGENT]: 30,
  [USER_ROLES.PROPERTY_MANAGER]: 60,
  [USER_ROLES.LANDLORD]: 60,
  [USER_ROLES.ADMIN]: 100,
};

// ===== PROPERTY STATUS =====
export const PROPERTY_LISTING_STATUS = {
  DRAFT: "draft",
  AVAILABLE: "available",
  RENTED: "rented",
  UNDER_MAINTENANCE: "under_maintenance",
  COMING_SOON: "coming_soon",
  UNPUBLISHED: "unpublished",
} as const;

export const PROPERTY_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
  FEATURED: "featured",
} as const;

// ===== APPLICATION WORKFLOW =====
// Complete state machine for rental applications
export const APPLICATION_STATUS = {
  DRAFT: "draft",
  PENDING_PAYMENT: "pending_payment",
  PAYMENT_VERIFIED: "payment_verified",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  INFO_REQUESTED: "info_requested",
  CONDITIONAL_APPROVAL: "conditional_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

// Valid state transitions for applications
// Key is source state, value is array of allowed destination states
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [APPLICATION_STATUS.DRAFT]: [APPLICATION_STATUS.PENDING_PAYMENT],
  [APPLICATION_STATUS.PENDING_PAYMENT]: [APPLICATION_STATUS.PAYMENT_VERIFIED],
  [APPLICATION_STATUS.PAYMENT_VERIFIED]: [APPLICATION_STATUS.SUBMITTED],
  [APPLICATION_STATUS.SUBMITTED]: [APPLICATION_STATUS.UNDER_REVIEW],
  [APPLICATION_STATUS.UNDER_REVIEW]: [
    APPLICATION_STATUS.INFO_REQUESTED,
    APPLICATION_STATUS.CONDITIONAL_APPROVAL,
    APPLICATION_STATUS.APPROVED,
    APPLICATION_STATUS.REJECTED,
  ],
  [APPLICATION_STATUS.INFO_REQUESTED]: [
    APPLICATION_STATUS.UNDER_REVIEW,
    APPLICATION_STATUS.APPROVED,
    APPLICATION_STATUS.REJECTED,
  ],
  [APPLICATION_STATUS.CONDITIONAL_APPROVAL]: [
    APPLICATION_STATUS.APPROVED,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.WITHDRAWN,
  ],
  [APPLICATION_STATUS.APPROVED]: [],
  [APPLICATION_STATUS.REJECTED]: [],
  [APPLICATION_STATUS.WITHDRAWN]: [],
};

// ===== LEASE WORKFLOW =====
export const LEASE_STATUS = {
  LEASE_PREPARATION: "lease_preparation",
  LEASE_SENT: "lease_sent",
  LEASE_ACCEPTED: "lease_accepted",
  LEASE_DECLINED: "lease_declined",
  MOVE_IN_READY: "move_in_ready",
  COMPLETED: "completed",
} as const;

export type LeaseStatus = typeof LEASE_STATUS[keyof typeof LEASE_STATUS];

// Valid lease status transitions
export const LEASE_TRANSITIONS: Record<LeaseStatus, LeaseStatus[]> = {
  [LEASE_STATUS.LEASE_PREPARATION]: [LEASE_STATUS.LEASE_SENT, LEASE_STATUS.LEASE_DECLINED],
  [LEASE_STATUS.LEASE_SENT]: [
    LEASE_STATUS.LEASE_ACCEPTED,
    LEASE_STATUS.LEASE_DECLINED,
    LEASE_STATUS.LEASE_SENT, // Allow re-sending
  ],
  [LEASE_STATUS.LEASE_ACCEPTED]: [LEASE_STATUS.MOVE_IN_READY],
  [LEASE_STATUS.LEASE_DECLINED]: [LEASE_STATUS.LEASE_PREPARATION],
  [LEASE_STATUS.MOVE_IN_READY]: [LEASE_STATUS.COMPLETED],
  [LEASE_STATUS.COMPLETED]: [],
};

// ===== PAYMENT =====
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  MANUALLY_VERIFIED: "manually_verified",
  OVERDUE: "overdue",
} as const;

export const PAYMENT_VERIFICATION_METHOD = {
  CASH: "cash",
  CHECK: "check",
  BANK_TRANSFER: "bank_transfer",
  WIRE_TRANSFER: "wire_transfer",
  MONEY_ORDER: "money_order",
  OTHER: "other",
} as const;

// ===== REJECTION REASONS =====
export const REJECTION_REASON = {
  INCOME_INSUFFICIENT: "income_insufficient",
  CREDIT_ISSUES: "credit_issues",
  BACKGROUND_CHECK_FAILED: "background_check_failed",
  RENTAL_HISTORY_ISSUES: "rental_history_issues",
  INCOMPLETE_APPLICATION: "incomplete_application",
  MISSING_DOCUMENTS: "missing_documents",
  VERIFICATION_FAILED: "verification_failed",
  OTHER: "other",
} as const;

// ===== NOTIFICATION TYPES =====
export const NOTIFICATION_TYPE = {
  STATUS_CHANGE: "status_change",
  DOCUMENT_REQUEST: "document_request",
  REMINDER: "reminder",
  EXPIRATION_WARNING: "expiration_warning",
  NEW_APPLICATION: "new_application",
  PROPERTY_SAVED: "property_saved",
  PRICE_CHANGED: "price_changed",
  LEASE_SENT: "lease_sent",
  LEASE_REMINDER: "lease_reminder",
  MOVE_IN_READY: "move_in_ready",
} as const;

export const NOTIFICATION_CHANNEL = {
  EMAIL: "email",
  IN_APP: "in_app",
  SMS: "sms",
} as const;

export const NOTIFICATION_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
  READ: "read",
} as const;

// ===== AUDIT ACTIONS =====
// All possible audit log actions
export const AUDIT_ACTION = {
  // User actions
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
  PROFILE_UPDATE: "profile_update",

  // 2FA
  TWO_FA_ENABLE: "2fa_enable",
  TWO_FA_DISABLE: "2fa_disable",
  TWO_FA_VERIFY: "2fa_verify",

  // Resource CRUD
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  VIEW: "view",

  // Application workflow
  APPLICATION_REVIEW: "application_review",
  APPLICATION_APPROVE: "application_approve",
  APPLICATION_REJECT: "application_reject",
  APPLICATION_INFO_REQUEST: "application_info_request",
  APPLICATION_CONDITIONAL_APPROVE: "application_conditional_approve",

  // Document handling
  DOCUMENT_UPLOAD: "document_upload",
  DOCUMENT_VERIFY: "document_verify",

  // Payment
  PAYMENT_VERIFY_MANUAL: "payment_verify_manual",
  PAYMENT_ATTEMPT: "payment_attempt",

  // Lease
  LEASE_CREATED: "lease_created",
  LEASE_EDITED: "lease_edited",
  LEASE_SENT: "lease_sent",
  LEASE_ACCEPTED: "lease_accepted",
  LEASE_DECLINED: "lease_declined",
  LEASE_SIGNED_TENANT: "lease_signed_tenant",
  LEASE_SIGNED_LANDLORD: "lease_signed_landlord",
  MOVE_IN_SCHEDULED: "move_in_scheduled",

  // Image operations
  IMAGE_UPLOAD: "image_upload",
  IMAGE_DELETE: "image_delete",
  IMAGE_REPLACE: "image_replace",
  IMAGE_REORDER: "image_reorder",

  // Role/Status changes
  ROLE_CHANGE: "role_change",
  STATUS_CHANGE: "status_change",
} as const;

// ===== FILE UPLOADS =====
export const FILE_UPLOAD = {
  MAX_FILE_SIZE_MB: 10,
  MAX_IMAGES_PER_PROPERTY: 20,
  MAX_DOCUMENTS_PER_APPLICATION: 50,
  ALLOWED_IMAGE_FORMATS: ["jpg", "jpeg", "png", "webp"],
  ALLOWED_DOCUMENT_FORMATS: ["pdf", "doc", "docx", "xls", "xlsx"],
} as const;

// ===== CACHE TTL (in milliseconds) =====
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  PROPERTIES_LIST: 5 * 60 * 1000, // 5 minutes
  PROPERTY_DETAIL: 10 * 60 * 1000, // 10 minutes
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes
  STATISTICS: 15 * 60 * 1000, // 15 minutes
} as const;

// ===== PAGINATION =====
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const;

// ===== LEASE DEFAULTS =====
export const LEASE_DEFAULTS = {
  DEFAULT_EXPIRATION_DAYS: 90,
  APPLICATION_FEE: "45.00",
} as const;

// ===== PROPERTY FILTERS =====
export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "condo",
  "townhouse",
  "studio",
  "commercial",
] as const;

export const AMENITIES = [
  "parking",
  "laundry",
  "ac",
  "heating",
  "dishwasher",
  "pool",
  "gym",
  "furnished",
  "pet_friendly",
  "balcony",
  "garden",
  "basement",
] as const;

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: "You must be logged in",
  NOT_AUTHORIZED: "You don't have permission to perform this action",
  RESOURCE_NOT_FOUND: "The requested resource was not found",
  VALIDATION_ERROR: "The provided data is invalid",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
  INVALID_TRANSITION: "This action is not allowed in the current state",
  ALREADY_EXISTS: "This resource already exists",
  OPERATION_FAILED: "The operation failed. Please try again.",
} as const;

// ===== SUCCESS MESSAGES =====
export const SUCCESS_MESSAGES = {
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  OPERATION_COMPLETE: "Operation completed successfully",
} as const;
