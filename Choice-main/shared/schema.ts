import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, integer, decimal, boolean, jsonb, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  licenseNumber: text("license_number"),
  licenseExpiry: date("license_expiry"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  status: text("status").default("active"),
  ownerId: uuid("owner_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  role: text("role").default("renter"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  licenseExpiry: date("license_expiry"),
  licenseVerified: boolean("license_verified").default(false),
  specialties: jsonb("specialties").$type<string[]>(),
  yearsExperience: integer("years_experience"),
  totalSales: integer("total_sales").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  location: text("location"),
  isManagedProfile: boolean("is_managed_profile").default(false),
  managedBy: uuid("managed_by"),
  displayEmail: text("display_email"),
  displayPhone: text("display_phone"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorBackupCodes: jsonb("two_factor_backup_codes").$type<string[]>(),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Property listing statuses
export const PROPERTY_LISTING_STATUSES = [
  "draft",
  "available", 
  "rented",
  "under_maintenance",
  "coming_soon",
  "unpublished"
] as const;

export const PROPERTY_VISIBILITY = [
  "public",
  "private",
  "featured"
] as const;

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  listingAgentId: uuid("listing_agent_id").references(() => users.id, { onDelete: "set null" }),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  price: decimal("price", { precision: 12, scale: 2 }),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFeet: integer("square_feet"),
  propertyType: text("property_type"),
  amenities: jsonb("amenities"),
  images: jsonb("images"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  furnished: boolean("furnished").default(false),
  petsAllowed: boolean("pets_allowed").default(false),
  leaseTerm: text("lease_term"),
  utilitiesIncluded: jsonb("utilities_included"),
  status: text("status").default("active"),
  // New property management fields
  listingStatus: text("listing_status").default("draft"),
  visibility: text("visibility").default("public"),
  expiresAt: timestamp("expires_at"),
  autoUnpublish: boolean("auto_unpublish").default(true),
  expirationDays: integer("expiration_days").default(90),
  priceHistory: jsonb("price_history").$type<Array<{
    price: string;
    changedAt: string;
    changedBy?: string;
  }>>(),
  viewCount: integer("view_count").default(0),
  saveCount: integer("save_count").default(0),
  applicationCount: integer("application_count").default(0),
  listedAt: timestamp("listed_at"),
  soldAt: timestamp("sold_at"),
  soldPrice: decimal("sold_price", { precision: 12, scale: 2 }),
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  addressVerified: boolean("address_verified").default(false),
  applicationFee: decimal("application_fee", { precision: 8, scale: 2 }).default("45.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Property custom questions for applications (defined by landlord/agent)
export const propertyQuestions = pgTable("property_questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionType: text("question_type").default("text"), // text, textarea, select, checkbox, radio
  options: jsonb("options").$type<string[]>(), // For select/radio/checkbox types
  required: boolean("required").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property internal notes for landlords/agents
export const propertyNotes = pgTable("property_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  noteType: text("note_type").default("general"),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application status workflow: draft -> pending_payment -> payment_verified -> submitted -> under_review -> conditional_approval/info_requested -> approved/rejected/withdrawn
// Valid transitions: draft->pending_payment, pending_payment->payment_verified, payment_verified->submitted, submitted->under_review, 
// under_review->info_requested/conditional_approval/approved/rejected, conditional_approval->approved/rejected/withdrawn, info_requested->under_review/approved/rejected
export const APPLICATION_STATUSES = [
  "draft",
  "pending_payment",
  "payment_verified",
  "submitted",
  "under_review",
  "info_requested",
  "conditional_approval",
  "approved",
  "rejected",
  "withdrawn"
] as const;

// Lease lifecycle statuses for post-approval workflow
export const LEASE_STATUSES = [
  "lease_preparation",
  "lease_sent",
  "lease_accepted",
  "lease_declined",
  "move_in_ready",
  "completed"
] as const;

// Valid lease status transitions (from -> to)
export const LEASE_STATUS_TRANSITIONS: Record<string, string[]> = {
  "lease_preparation": ["lease_sent", "lease_declined"],
  "lease_sent": ["lease_accepted", "lease_declined", "lease_sent"],
  "lease_accepted": ["move_in_ready"],
  "lease_declined": ["lease_preparation"],
  "move_in_ready": ["completed"],
  "completed": []
} as const;

// Payment verification methods for manual verification
export const PAYMENT_VERIFICATION_METHODS = [
  "cash",
  "check",
  "bank_transfer",
  "wire_transfer",
  "money_order",
  "other"
] as const;

export const REJECTION_CATEGORIES = [
  "income_insufficient",
  "credit_issues",
  "background_check_failed",
  "rental_history_issues",
  "incomplete_application",
  "missing_documents",
  "verification_failed",
  "other"
] as const;

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  step: integer("step").default(0),
  personalInfo: jsonb("personal_info"),
  rentalHistory: jsonb("rental_history"),
  employment: jsonb("employment"),
  references: jsonb("references"),
  disclosures: jsonb("disclosures"),
  documents: jsonb("documents"),
  status: text("status").default("draft"),
  previousStatus: text("previous_status"),
  statusHistory: jsonb("status_history").$type<Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    reason?: string;
  }>>(),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  // Scoring
  score: integer("score"),
  scoreBreakdown: jsonb("score_breakdown").$type<{
    incomeScore: number;
    creditScore: number;
    rentalHistoryScore: number;
    employmentScore: number;
    documentsScore: number;
    totalScore: number;
    maxScore: number;
    flags: string[];
  }>(),
  scoredAt: timestamp("scored_at"),
  // Rejection
  rejectionCategory: text("rejection_category"),
  rejectionReason: text("rejection_reason"),
  rejectionDetails: jsonb("rejection_details").$type<{
    categories: string[];
    explanation: string;
    appealable: boolean;
  }>(),
  // Documents
  requiredDocuments: jsonb("required_documents").$type<string[]>(),
  documentStatus: jsonb("document_status").$type<Record<string, {
    uploaded: boolean;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
  }>>(),
  // Expiration
  expiresAt: timestamp("expires_at"),
  expiredAt: timestamp("expired_at"),
  // Application fee
  applicationFee: decimal("application_fee", { precision: 8, scale: 2 }),
  // Payment tracking
  paymentStatus: text("payment_status").default("pending"), // pending, paid, failed, manually_verified
  paymentAttempts: jsonb("payment_attempts").$type<Array<{
    referenceId: string;
    timestamp: string;
    status: 'failed' | 'pending' | 'success';
    amount: number;
    errorMessage?: string;
  }>>(),
  paymentPaidAt: timestamp("payment_paid_at"),
  // Manual payment verification
  manualPaymentVerified: boolean("manual_payment_verified").default(false),
  manualPaymentVerifiedAt: timestamp("manual_payment_verified_at"),
  manualPaymentVerifiedBy: uuid("manual_payment_verified_by").references(() => users.id),
  manualPaymentAmount: decimal("manual_payment_amount", { precision: 8, scale: 2 }),
  manualPaymentMethod: text("manual_payment_method"), // cash, check, bank_transfer, wire_transfer, money_order, other
  manualPaymentReceivedAt: timestamp("manual_payment_received_at"),
  manualPaymentNote: text("manual_payment_note"),
  manualPaymentReferenceId: text("manual_payment_reference_id"),
  // Info request tracking
  infoRequestedReason: text("info_requested_reason"),
  infoRequestedAt: timestamp("info_requested_at"),
  infoRequestedBy: uuid("info_requested_by").references(() => users.id),
  infoRequestedDueDate: timestamp("info_requested_due_date"),
  // Conditional approval tracking
  conditionalApprovalReason: text("conditional_approval_reason"),
  conditionalApprovalAt: timestamp("conditional_approval_at"),
  conditionalApprovalBy: uuid("conditional_approval_by").references(() => users.id),
  conditionalApprovalDueDate: timestamp("conditional_approval_due_date"),
  conditionalRequirements: jsonb("conditional_requirements").$type<Array<{
    id: string;
    type: 'document' | 'information' | 'verification';
    description: string;
    required: boolean;
    satisfied: boolean;
    satisfiedAt?: string;
    satisfiedBy?: string;
    notes?: string;
  }>>(),
  conditionalDocumentsRequired: jsonb("conditional_documents_required").$type<string[]>(),
  conditionalDocumentsUploaded: jsonb("conditional_documents_uploaded").$type<Record<string, {
    fileId: string;
    fileName: string;
    uploadedAt: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
  }>>(),
  // Lease preparation tracking
  leaseStatus: text("lease_status").default("lease_preparation"),
  leaseVersion: integer("lease_version").default(1),
  leaseDocumentUrl: text("lease_document_url"),
  leaseDocumentId: uuid("lease_document_id"),
  leaseTemplateId: uuid("lease_template_id"),
  leaseGeneratedAt: timestamp("lease_generated_at"),
  leaseSentAt: timestamp("lease_sent_at"),
  leaseSentBy: uuid("lease_sent_by").references(() => users.id),
  leaseAcceptedAt: timestamp("lease_accepted_at"),
  leaseDeclineReason: text("lease_decline_reason"),
  leaseSignedAt: timestamp("lease_signed_at"),
  moveInDate: timestamp("move_in_date"),
  moveInScheduledAt: timestamp("move_in_scheduled_at"),
  moveInInstructions: jsonb("move_in_instructions").$type<{
    keyPickup?: {
      location: string;
      time: string;
      notes?: string;
    };
    accessDetails?: {
      gateCode?: string;
      keypadCode?: string;
      smartLockCode?: string;
      notes?: string;
    };
    utilityNotes?: {
      electricity?: string;
      water?: string;
      gas?: string;
      internet?: string;
      other?: string;
    };
    checklistItems?: Array<{
      id: string;
      item: string;
      completed: boolean;
    }>;
  }>(),
  // Custom answers to property-specific questions
  customAnswers: jsonb("custom_answers").$type<Record<string, string>>(),
  // Conversation link for messaging
  conversationId: uuid("conversation_id"),
  // Last step saved for auto-save tracking
  lastSavedStep: integer("last_saved_step").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  userPropertyUnique: unique().on(table.userId, table.propertyId),
}));

// Co-applicants for multiple people on one application
export const coApplicants = pgTable("co_applicants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  relationship: text("relationship"), // spouse, roommate, family, etc.
  personalInfo: jsonb("personal_info"),
  employment: jsonb("employment"),
  income: decimal("income", { precision: 12, scale: 2 }),
  status: text("status").default("pending"), // pending, verified, rejected
  invitedAt: timestamp("invited_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application comments for internal notes and tracking
export const applicationComments = pgTable("application_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  comment: text("comment").notNull(),
  commentType: text("comment_type").default("note"), // note, decision, verification, flag
  isInternal: boolean("is_internal").default(true), // internal notes vs. applicant-visible
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application notifications for tracking sent notifications
export const applicationNotifications = pgTable("application_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(), // status_change, document_request, reminder, expiration_warning
  channel: text("channel").default("email"), // email, in_app, sms
  subject: text("subject"),
  content: text("content"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  status: text("status").default("pending"), // pending, sent, failed, read
  createdAt: timestamp("created_at").defaultNow(),
});

// User notification preferences for controlling communication channels
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  emailNewApplications: boolean("email_new_applications").default(true),
  emailStatusUpdates: boolean("email_status_updates").default(true),
  emailPropertySaved: boolean("email_property_saved").default(true),
  emailLeaseReminders: boolean("email_lease_reminders").default(true),
  inAppNotifications: boolean("in_app_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  notificationFrequency: text("notification_frequency").default("instant"), // instant, daily, weekly
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property notifications for tracking property-related events
export const propertyNotifications = pgTable("property_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(), // property_saved, price_changed, status_changed, new_similar_property
  channel: text("channel").default("email"), // email, in_app, sms
  subject: text("subject"),
  content: text("content"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  status: text("status").default("pending"), // pending, sent, failed, read
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPropertyUnique: unique().on(table.userId, table.propertyId),
}));

export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id").references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderPhone: text("sender_phone"),
  message: text("message"),
  inquiryType: text("inquiry_type"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const requirements = pgTable("requirements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  budgetMin: decimal("budget_min", { precision: 10, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  propertyType: jsonb("property_type"),
  locations: jsonb("locations"),
  amenities: jsonb("amenities"),
  pets: jsonb("pets"),
  leaseTerm: text("lease_term"),
  moveInDate: date("move_in_date"),
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating"),
  title: text("title"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  userPropertyUnique: unique().on(table.userId, table.propertyId),
}));

export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userPropertyUnique: unique().on(table.userId, table.propertyId),
}));

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const LEASE_ACTIONS = [
  "lease_created",
  "lease_edited",
  "lease_sent",
  "lease_accepted",
  "lease_declined",
  "lease_signed_tenant",
  "lease_signed_landlord",
  "move_in_scheduled"
] as const;

export const IMAGE_AUDIT_ACTIONS = [
  "image_upload",
  "image_delete",
  "image_replace",
  "image_reorder"
] as const;

export const AUDIT_ACTIONS = [
  "create", "update", "delete", "view", "login", "logout", 
  "2fa_enable", "2fa_disable", "2fa_verify", "password_change",
  "role_change", "status_change", "document_upload", "document_verify",
  "application_review", "application_approve", "application_reject",
  "payment_verify_manual", "payment_attempt", "application_info_request",
  "application_conditional_approve",
  ...LEASE_ACTIONS,
  ...IMAGE_AUDIT_ACTIONS
] as const;

// Image audit logs for tracking all image operations
export const imageAuditLogs = pgTable("image_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // upload, delete, replace, reorder
  photoId: uuid("photo_id"),
  propertyId: uuid("property_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment verification audit trail
export const paymentVerifications = pgTable("payment_verifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, check, bank_transfer, wire_transfer, money_order, other
  receivedAt: timestamp("received_at").notNull(),
  referenceId: text("reference_id").notNull(),
  internalNote: text("internal_note"),
  confirmationChecked: boolean("confirmation_checked").default(false),
  previousPaymentStatus: text("previous_payment_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentVerificationSchema = createInsertSchema(paymentVerifications).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentVerification = z.infer<typeof insertPaymentVerificationSchema>;
export type PaymentVerification = typeof paymentVerifications.$inferSelect;
export type PaymentVerificationMethod = typeof PAYMENT_VERIFICATION_METHODS[number];

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id"),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sensitiveData = pgTable("sensitive_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  dataType: text("data_type").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  encryptionKeyId: text("encryption_key_id"),
  accessedBy: jsonb("accessed_by").$type<Array<{ userId: string; accessedAt: string; reason: string }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const uploadedFiles = pgTable("uploaded_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  checksum: text("checksum"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSettingsSchema = createInsertSchema(adminSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSensitiveDataSchema = createInsertSchema(sensitiveData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
  isVerified: true,
  verifiedBy: true,
  verifiedAt: true,
});

export type InsertAdminSettings = z.infer<typeof insertAdminSettingsSchema>;
export type AdminSettings = typeof adminSettings.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AuditAction = typeof AUDIT_ACTIONS[number];

export type InsertSensitiveData = z.infer<typeof insertSensitiveDataSchema>;
export type SensitiveData = typeof sensitiveData.$inferSelect;

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

export const TRANSACTION_TYPES = ["sale", "lease", "referral"] as const;
export const TRANSACTION_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => users.id, { onDelete: "set null" }),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  buyerId: uuid("buyer_id").references(() => users.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  transactionType: text("transaction_type").default("lease"),
  transactionAmount: decimal("transaction_amount", { precision: 12, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }),
  agentSplit: decimal("agent_split", { precision: 5, scale: 2 }),
  agentCommission: decimal("agent_commission", { precision: 12, scale: 2 }),
  agencyCommission: decimal("agency_commission", { precision: 12, scale: 2 }),
  status: text("status").default("pending"),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentReviews = pgTable("agent_reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id").references(() => users.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  wouldRecommend: boolean("would_recommend").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  reviewerAgentUnique: unique().on(table.reviewerId, table.agentId),
}));

// Conversations for messaging between users (related to properties or applications)
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  subject: text("subject"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Participants in a conversation
export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationUserUnique: unique().on(table.conversationId, table.userId),
}));

// Messages within conversations
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, system, attachment
  attachments: jsonb("attachments").$type<string[]>(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgencySchema = createInsertSchema(agencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertPropertyNoteSchema = createInsertSchema(propertyNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyQuestionSchema = createInsertSchema(propertyQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  reviewedBy: true,
  reviewedAt: true,
  score: true,
  scoreBreakdown: true,
  scoredAt: true,
  rejectionCategory: true,
  rejectionReason: true,
  rejectionDetails: true,
  expiredAt: true,
  statusHistory: true,
  previousStatus: true,
});

export const insertCoApplicantSchema = createInsertSchema(coApplicants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  invitedAt: true,
  respondedAt: true,
});

export const insertApplicationCommentSchema = createInsertSchema(applicationComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationNotificationSchema = createInsertSchema(applicationNotifications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  readAt: true,
});

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyNotificationSchema = createInsertSchema(propertyNotifications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  readAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  read: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export const insertAgentReviewSchema = createInsertSchema(agentReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({
  id: true,
  createdAt: true,
  lastReadAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  readAt: true,
});

export type InsertAgency = z.infer<typeof insertAgencySchema>;
export type Agency = typeof agencies.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type PropertyListingStatus = typeof PROPERTY_LISTING_STATUSES[number];
export type PropertyVisibility = typeof PROPERTY_VISIBILITY[number];

export type InsertPropertyNote = z.infer<typeof insertPropertyNoteSchema>;
export type PropertyNote = typeof propertyNotes.$inferSelect;

export type InsertPropertyQuestion = z.infer<typeof insertPropertyQuestionSchema>;
export type PropertyQuestion = typeof propertyQuestions.$inferSelect;

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type LeaseStatus = typeof LEASE_STATUSES[number];

// Lease status update schema with validation
export const leaseStatusUpdateSchema = z.object({
  leaseStatus: z.enum([...LEASE_STATUSES] as [string, ...string[]]),
  leaseDocumentUrl: z.string().url().optional(),
  leaseVersion: z.number().int().positive().optional(),
  moveInDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type LeaseStatusUpdate = z.infer<typeof leaseStatusUpdateSchema>;

export type InsertCoApplicant = z.infer<typeof insertCoApplicantSchema>;
export type CoApplicant = typeof coApplicants.$inferSelect;

export type InsertApplicationComment = z.infer<typeof insertApplicationCommentSchema>;
export type ApplicationComment = typeof applicationComments.$inferSelect;

export type InsertApplicationNotification = z.infer<typeof insertApplicationNotificationSchema>;
export type ApplicationNotification = typeof applicationNotifications.$inferSelect;

export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;

export type InsertPropertyNotification = z.infer<typeof insertPropertyNotificationSchema>;
export type PropertyNotification = typeof propertyNotifications.$inferSelect;

export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export type RejectionCategory = typeof REJECTION_CATEGORIES[number];

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Requirement = typeof requirements.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionType = typeof TRANSACTION_TYPES[number];
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];

export type InsertAgentReview = z.infer<typeof insertAgentReviewSchema>;
export type AgentReview = typeof agentReviews.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  // Password requirements: 8+ characters, at least one uppercase letter, at least one number
  // These same requirements are displayed as hints on the login form for consistency
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string()
    // Accepts international phone numbers with optional + prefix, country code, and flexible formatting
    // Examples: +1 555-123-4567, 555.123.4567, (555) 123-4567, +44 20 7946 0958, +81-90-1234-5678
    .regex(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  role: z.enum(['renter', 'buyer', 'landlord', 'property_manager', 'agent']).optional().default('renter'),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  // Note: Login schema only validates that password is not empty.
  // Password format requirements are enforced at signup and displayed as a UX hint on login form.
  // The actual password validation happens server-side via Supabase auth.
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ===================== MODERATION =====================

export const REPORT_TYPES = [
  "inappropriate_content",
  "fraudulent_listing",
  "misleading_information",
  "duplicate_listing",
  "spam",
  "discrimination",
  "safety_concern",
  "other"
] as const;

export const REPORT_STATUSES = ["pending", "under_review", "resolved", "dismissed"] as const;

export const contentReports = pgTable("content_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  reviewId: uuid("review_id").references(() => reviews.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  priority: text("priority").default("normal"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolution: text("resolution"),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const DISPUTE_TYPES = [
  "application_rejection",
  "payment_issue",
  "property_condition",
  "lease_terms",
  "security_deposit",
  "maintenance",
  "communication",
  "other"
] as const;

export const DISPUTE_STATUSES = ["open", "under_investigation", "awaiting_response", "resolved", "escalated", "closed"] as const;

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  initiatorId: uuid("initiator_id").references(() => users.id, { onDelete: "set null" }),
  respondentId: uuid("respondent_id").references(() => users.id, { onDelete: "set null" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  disputeType: text("dispute_type").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").default("open"),
  priority: text("priority").default("normal"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolution: text("resolution"),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const disputeMessages = pgTable("dispute_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: uuid("dispute_id").references(() => disputes.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false),
  attachments: jsonb("attachments").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const DOCUMENT_VERIFICATION_STATUSES = ["pending", "verified", "rejected", "expired"] as const;

export const documentVerifications = pgTable("document_verifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").references(() => uploadedFiles.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  status: text("status").default("pending"),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Moderation insert schemas
export const insertContentReportSchema = createInsertSchema(contentReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedBy: true,
  resolvedAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedBy: true,
  resolvedAt: true,
});

export const insertDisputeMessageSchema = createInsertSchema(disputeMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentVerificationSchema = createInsertSchema(documentVerifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedBy: true,
  verifiedAt: true,
});

// Moderation types
export type InsertContentReport = z.infer<typeof insertContentReportSchema>;
export type ContentReport = typeof contentReports.$inferSelect;
export type ReportType = typeof REPORT_TYPES[number];
export type ReportStatus = typeof REPORT_STATUSES[number];

export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type DisputeType = typeof DISPUTE_TYPES[number];
export type DisputeStatus = typeof DISPUTE_STATUSES[number];

export type InsertDisputeMessage = z.infer<typeof insertDisputeMessageSchema>;
export type DisputeMessage = typeof disputeMessages.$inferSelect;

export type InsertDocumentVerification = z.infer<typeof insertDocumentVerificationSchema>;
export type DocumentVerification = typeof documentVerifications.$inferSelect;
export type DocumentVerificationStatus = typeof DOCUMENT_VERIFICATION_STATUSES[number];

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Payment types and statuses
export const PAYMENT_TYPES = ["rent", "security_deposit"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "overdue", "verified"] as const;

// Active leases between landlord and tenant
export const leases = pgTable("leases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").references(() => users.id, { onDelete: "cascade" }),
  landlordId: uuid("landlord_id").references(() => users.id, { onDelete: "cascade" }),
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }).notNull(),
  securityDepositAmount: decimal("security_deposit_amount", { precision: 12, scale: 2 }).notNull(),
  rentDueDay: integer("rent_due_day").default(1).notNull(), // Day of month (1-31)
  leaseStartDate: timestamp("lease_start_date").notNull(),
  leaseEndDate: timestamp("lease_end_date").notNull(),
  status: text("status").default("active"), // active, expired, terminated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment tracking for rent and security deposits
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leaseId: uuid("lease_id").references(() => leases.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(), // rent, security_deposit
  status: text("status").default("pending"), // pending, paid, overdue, verified
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  referenceId: text("reference_id"), // Transaction/receipt reference
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertLeaseSchema = createInsertSchema(leases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
  verifiedBy: true,
  verifiedAt: true,
});

// Types
export type InsertLease = z.infer<typeof insertLeaseSchema>;
export type Lease = typeof leases.$inferSelect;
export type PaymentType = typeof PAYMENT_TYPES[number];
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Lease Templates for landlords to use as starting point
export const leaseTemplates = pgTable("lease_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  state: text("state"), // State-specific template
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 12, scale: 2 }),
  leaseTermMonths: integer("lease_term_months"),
  content: text("content").notNull(), // Template HTML/text content
  customClauses: jsonb("custom_clauses").$type<Array<{
    id: string;
    title: string;
    content: string;
    optional: boolean;
  }>>(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lease Drafts - working drafts of leases before sending to tenant
export const leaseDrafts = pgTable("lease_drafts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => leaseTemplates.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "cascade" }),
  version: integer("version").default(1),
  status: text("status").default("draft"), // draft, ready_to_send, sent
  rentAmount: decimal("rent_amount", { precision: 12, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 12, scale: 2 }),
  leaseStartDate: timestamp("lease_start_date").notNull(),
  leaseEndDate: timestamp("lease_end_date").notNull(),
  content: text("content").notNull(),
  customClauses: jsonb("custom_clauses").$type<Array<{
    id: string;
    title: string;
    content: string;
    optional: boolean;
    included: boolean;
  }>>(),
  changes: jsonb("changes").$type<Array<{
    version: number;
    changedBy: string;
    changedAt: string;
    changeDescription?: string;
    previousValues?: Record<string, any>;
  }>>(),
  signatureEnabled: boolean("signature_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lease Signatures - tracks who signed the lease and when
export const leaseSignatures = pgTable("lease_signatures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  signerId: uuid("signer_id").references(() => users.id, { onDelete: "cascade" }),
  signerRole: text("signer_role").notNull(), // tenant, landlord
  signatureData: text("signature_data").notNull(), // Base64 encoded signature or digital signature
  documentHash: text("document_hash"), // Hash of signed document for verification
  signedAt: timestamp("signed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property Templates for quick listing creation
export const propertyTemplates = pgTable("property_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  propertyType: text("property_type"),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }),
  squareFeet: integer("square_feet"),
  amenities: jsonb("amenities").$type<string[]>(),
  furnished: boolean("furnished").default(false),
  petsAllowed: boolean("pets_allowed").default(false),
  leaseTerm: text("lease_term"),
  utilitiesIncluded: jsonb("utilities_included").$type<string[]>(),
  defaultPrice: decimal("default_price", { precision: 12, scale: 2 }),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyTemplateSchema = createInsertSchema(propertyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPropertyTemplate = z.infer<typeof insertPropertyTemplateSchema>;
export type PropertyTemplate = typeof propertyTemplates.$inferSelect;

// Lease Template insert schema
export const insertLeaseTemplateSchema = createInsertSchema(leaseTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaseTemplate = z.infer<typeof insertLeaseTemplateSchema>;
export type LeaseTemplate = typeof leaseTemplates.$inferSelect;

// Lease Draft insert and update schemas
export const insertLeaseDraftSchema = createInsertSchema(leaseDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  changes: true,
  status: true,
});

export const updateLeaseDraftSchema = z.object({
  rentAmount: z.number().positive().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  leaseStartDate: z.string().datetime().optional(),
  leaseEndDate: z.string().datetime().optional(),
  content: z.string().optional(),
  customClauses: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    optional: z.boolean(),
    included: z.boolean().optional(),
  })).optional(),
  status: z.enum(["draft", "ready_to_send", "sent"]).optional(),
  changeDescription: z.string().optional(),
});

export type InsertLeaseDraft = z.infer<typeof insertLeaseDraftSchema>;
export type UpdateLeaseDraft = z.infer<typeof updateLeaseDraftSchema>;
export type LeaseDraft = typeof leaseDrafts.$inferSelect;
export type LeaseSignature = typeof leaseSignatures.$inferSelect;

export const insertLeaseSignatureSchema = createInsertSchema(leaseSignatures).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});

export type InsertLeaseSignature = z.infer<typeof insertLeaseSignatureSchema>;

// Lease send schema
export const leaseSendSchema = z.object({
  changeDescription: z.string().default("Lease sent to tenant"),
});

// Lease accept schema
export const leaseAcceptSchema = z.object({
  moveInDate: z.string().datetime().optional(),
});

// Lease decline schema
export const leaseDeclineSchema = z.object({
  reason: z.string().min(1, "Decline reason is required").optional(),
});

// Lease signature schemas
export const leaseSignatureEnableSchema = z.object({
  signatureEnabled: z.boolean(),
});

export const leaseSignSchema = z.object({
  signatureData: z.string().min(1, "Signature data is required"),
  documentHash: z.string().optional(),
});

export const leaseCounstersignSchema = z.object({
  signatureData: z.string().min(1, "Signature data is required"),
  documentHash: z.string().optional(),
});

export type LeaseSignatureEnable = z.infer<typeof leaseSignatureEnableSchema>;
export type LeaseSign = z.infer<typeof leaseSignSchema>;
export type LeaseCounstersign = z.infer<typeof leaseCounstersignSchema>;

// Move-in preparation schemas
export const moveInPrepareSchema = z.object({
  moveInDate: z.string().datetime().optional(),
  keyPickup: z.object({
    location: z.string().min(1, "Key pickup location required"),
    time: z.string().min(1, "Key pickup time required"),
    notes: z.string().optional(),
  }).optional(),
  accessDetails: z.object({
    gateCode: z.string().optional(),
    keypadCode: z.string().optional(),
    smartLockCode: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  utilityNotes: z.object({
    electricity: z.string().optional(),
    water: z.string().optional(),
    gas: z.string().optional(),
    internet: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
  checklistItems: z.array(z.object({
    id: z.string(),
    item: z.string(),
    completed: z.boolean().optional(),
  })).optional(),
});

export const moveInChecklistUpdateSchema = z.object({
  checklistItems: z.array(z.object({
    id: z.string(),
    completed: z.boolean(),
  })).min(1),
});

export type MoveInPrepare = z.infer<typeof moveInPrepareSchema>;
export type MoveInChecklistUpdate = z.infer<typeof moveInChecklistUpdateSchema>;

// Geocoding validation schema
export const geocodeAddressSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export type GeocodeAddressInput = z.infer<typeof geocodeAddressSchema>;

// Scheduled publishing schema  
export const scheduledPublishSchema = z.object({
  scheduledPublishAt: z.string().datetime().optional().nullable(),
});

export type ScheduledPublishInput = z.infer<typeof scheduledPublishSchema>;

// Payment Audit Action Types
export const PAYMENT_AUDIT_ACTIONS = [
  "payment_created",
  "payment_marked_paid",
  "payment_verified",
  "payment_marked_overdue",
  "payment_status_changed",
  "payment_delete_blocked"
] as const;

export type PaymentAuditAction = typeof PAYMENT_AUDIT_ACTIONS[number];

// Property Manager Permission Groups
export const PROPERTY_MANAGER_PERMISSIONS = {
  view_properties: "view_properties",
  manage_applications: "manage_applications",
  manage_leases: "manage_leases",
  manage_payments: "manage_payments",
  manage_maintenance: "manage_maintenance",
  messaging_access: "messaging_access",
} as const;

export type PermissionGroup = typeof PROPERTY_MANAGER_PERMISSIONS[keyof typeof PROPERTY_MANAGER_PERMISSIONS];

// Property Manager Assignments - Tracks which properties each manager is assigned to
export const propertyManagerAssignments = pgTable("property_manager_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }).notNull(),
  propertyManagerId: uuid("property_manager_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
  permissions: jsonb("permissions").$type<PermissionGroup[]>().default(sql`'["view_properties", "manage_applications", "manage_leases", "manage_payments", "manage_maintenance", "messaging_access"]'::jsonb`),
  assignedAt: timestamp("assigned_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertyManagerAssignmentSchema = createInsertSchema(propertyManagerAssignments).omit({
  id: true,
  assignedAt: true,
  createdAt: true,
  updatedAt: true,
  revokedAt: true,
});

export type InsertPropertyManagerAssignment = z.infer<typeof insertPropertyManagerAssignmentSchema>;
export type PropertyManagerAssignment = typeof propertyManagerAssignments.$inferSelect;

// Photo categories for different upload contexts
export const PHOTO_CATEGORIES = [
  "property",
  "maintenance",
  "inspection",
  "documentation",
  "other"
] as const;

export type PhotoCategory = typeof PHOTO_CATEGORIES[number];

// Photos table - stores image metadata from ImageKit uploads
export const photos: any = pgTable("photos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  imageKitFileId: text("imagekit_file_id").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  category: text("category").notNull().$type<PhotoCategory>(),
  uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  maintenanceRequestId: uuid("maintenance_request_id"),
  isPrivate: boolean("is_private").default(false),
  orderIndex: integer("order_index").default(0),
  archived: boolean("archived").default(false),
  archivedAt: timestamp("archived_at"),
  replacedWithId: uuid("replaced_with_id").references(() => photos.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  fileSizeBytes: integer("file_size_bytes").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;
