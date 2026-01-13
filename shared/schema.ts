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
  // NOTE: passwordHash is unused - Supabase Auth handles password storage
  passwordHash: text("password_hash"),
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
  // Legal Consent
  termsVersion: text("terms_version"),
  privacyVersion: text("privacy_version"),
  acceptedTermsAt: timestamp("accepted_terms_at"),
  acceptedPrivacyAt: timestamp("accepted_privacy_at"),
  acceptedIp: text("accepted_ip"),
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
  yearBuilt: integer("year_built"),
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
  availableFrom: date("available_from"),
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

// Admin actions for audit logging
export const adminActions = pgTable("admin_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

export type AdminAction = typeof adminActions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;

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

// Application status enum for Zod validation
export const applicationStatusEnum = z.enum([
  "draft",
  "submitted",
  "under_review",
  "payment_requested",
  "approved",
  "rejected",
  "withdrawn",
]);

export type ApplicationStatus = z.infer<typeof applicationStatusEnum>;

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
  // Snapshot data for auditing and consistency
  rentSnapshot: decimal("rent_snapshot", { precision: 12, scale: 2 }),
  depositSnapshot: decimal("deposit_snapshot", { precision: 12, scale: 2 }),
  applicationFeeSnapshot: decimal("application_fee_snapshot", { precision: 8, scale: 2 }),
  leaseTermSnapshot: text("lease_term_snapshot"),
  availableDateSnapshot: date("available_date_snapshot"),
  propertyTitleSnapshot: text("property_title_snapshot"),
  propertyAddressSnapshot: text("property_address_snapshot"),
  propertyTypeSnapshot: text("property_type_snapshot"),
  rulesAcknowledged: boolean("rules_acknowledged").default(false),
  rulesAcknowledgedAt: timestamp("rules_acknowledged_at"),
  policiesSnapshot: jsonb("policies_snapshot").$type<{
    petPolicy?: string;
    smokingPolicy?: string;
    occupancyLimit?: number;
    utilitiesIncluded?: string[];
    hoaRules?: string;
    customRules?: string[];
  }>(),
  propertyVersionSnapshot: integer("property_version_snapshot").default(1),
  propertyStatusAtApplyTime: text("property_status_at_apply_time"),
  // Conversation link for messaging
  conversationId: uuid("conversation_id"),
  // Last step saved for auto-save tracking
  lastSavedStep: integer("last_saved_step").default(0),
  // Legal Disclosures
  disclosurePdfUrl: text("disclosure_pdf_url"),
  leasePdfUrl: text("lease_pdf_url"),
  signedLeasePdfUrl: text("signed_lease_pdf_url"),
  // Lease e-signature fields
  leaseSignatureStatus: text("lease_signature_status").default("pending_signature"), // pending_signature, partially_signed, signed
  leaseFullySignedAt: timestamp("lease_fully_signed_at"),
  leaseGeneratedAtSnapshot: timestamp("lease_generated_at_snapshot"),
  stateCode: text("state_code"), // The state where the property is located
  stateDisclosureAcknowledged: boolean("state_disclosure_acknowledged").default(false),
  legalDisclosures: jsonb("legal_disclosures").$type<{
    accuracyCertified: boolean;
    feeAcknowledged: boolean;
    fcraConsent: boolean;
    fairHousingAcknowledged: boolean;
    electronicConsent: boolean;
    acknowledgedAt: string;
    acceptedIp?: string;
    termsVersion?: string;
    backgroundCheckAccepted?: boolean;
    propertyRulesAccepted?: boolean;
  }>(),
  stateDisclosures: jsonb("state_disclosures").$type<Record<string, {
    acknowledged: boolean;
    acknowledgedAt: string;
  }>>(),
  legalAcceptance: jsonb("legal_acceptance").$type<{
    accepted: boolean;
    acceptedAt: string;
    documents: {
      rentalApplicationTerms: string;
      privacyPolicy: string;
      fairHousingNotice: string;
    };
  }>(),
  paymentRequest: jsonb("payment_request").$type<{
    amount: string;
    purpose: string;
    landlordMessage?: string;
    requestedAt: string;
    status: "pending" | "paid" | "declined";
    declinedReason?: string;
    declinedAt?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  userPropertyUnique: unique().on(table.userId, table.propertyId),
}));

// Legal Documents table for versioned storage
export const legalDocuments = pgTable("legal_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(), // e.g., "rental_application_terms"
  version: text("version").notNull(), // e.g., "v1.0"
  title: text("title").notNull(),
  content: text("content").notNull(),
  jurisdiction: text("jurisdiction"), // e.g., "US", "CA"
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({
  id: true,
  createdAt: true,
});

export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;

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
  status: text("status").default("pending"), // pending, sent, failed, some_read
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
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentReviews = pgTable("agent_reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid("agent_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  previousData: jsonb("previous_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicationLogs = pgTable("application_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const propertyLogs = pgTable("property_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  field: text("field"),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const securityLogs = pgTable("security_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  status: text("status").notNull(), // success, failure
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaseLogs = pgTable("lease_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentLogs = pgTable("payment_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  status: text("status"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  type: text("type").notNull(), // application_fee, rent, deposit
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").notNull(), // pending, completed, failed, refunded
  paymentMethod: text("payment_method"),
  paymentProvider: text("payment_provider"),
  providerTransactionId: text("provider_transaction_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentVerifications = pgTable("payment_verifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  referenceId: text("reference_id"),
  internalNote: text("internal_note"),
  confirmationChecked: boolean("confirmation_checked").default(false),
  previousPaymentStatus: text("previous_payment_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  lastLoginAt: true,
  failedLoginAttempts: true,
  lockedUntil: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  }),
  termsVersion: z.string().optional(),
  privacyVersion: z.string().optional(),
  acceptedTermsAt: z.string().optional(),
  acceptedPrivacyAt: z.string().optional(),
  acceptedIp: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  viewCount: true,
  saveCount: true,
  applicationCount: true,
  priceHistory: true,
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
  statusHistory: true,
  previousStatus: true,
  paymentAttempts: true,
  paymentPaidAt: true,
  manualPaymentVerified: true,
  manualPaymentVerifiedAt: true,
  manualPaymentVerifiedBy: true,
  manualPaymentAmount: true,
  manualPaymentMethod: true,
  manualPaymentReceivedAt: true,
  manualPaymentNote: true,
  manualPaymentReferenceId: true,
  infoRequestedReason: true,
  infoRequestedAt: true,
  infoRequestedBy: true,
  infoRequestedDueDate: true,
  conditionalApprovalReason: true,
  conditionalApprovalAt: true,
  conditionalApprovalBy: true,
  conditionalApprovalDueDate: true,
  conditionalRequirements: true,
  conditionalDocumentsRequired: true,
  conditionalDocumentsUploaded: true,
  leaseStatus: true,
  leaseVersion: true,
  leaseDocumentUrl: true,
  leaseDocumentId: true,
  leaseTemplateId: true,
  leaseGeneratedAt: true,
  leaseSentAt: true,
  leaseSentBy: true,
  leaseAcceptedAt: true,
  leaseDeclineReason: true,
  leaseSignedAt: true,
  moveInScheduledAt: true,
  moveInInstructions: true,
  rentSnapshot: true,
  depositSnapshot: true,
  applicationFeeSnapshot: true,
  leaseTermSnapshot: true,
  availableDateSnapshot: true,
  propertyTitleSnapshot: true,
  propertyAddressSnapshot: true,
  propertyTypeSnapshot: true,
  policiesSnapshot: true,
  propertyVersionSnapshot: true,
  propertyStatusAtApplyTime: true,
  conversationId: true,
  lastSavedStep: true,
  leaseSignatureStatus: true,
  leaseFullySignedAt: true,
  leaseGeneratedAtSnapshot: true,
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
  createdAt: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAgentReviewSchema = createInsertSchema(agentReviews).omit({
  id: true,
  createdAt: true,
});

export const insertAgencySchema = createInsertSchema(agencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentVerificationSchema = createInsertSchema(paymentVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = z.infer<typeof insertAgencySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type AgentReview = typeof agentReviews.$inferSelect;
export type InsertAgentReview = z.infer<typeof insertAgentReviewSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type PaymentVerification = typeof paymentVerifications.$inferSelect;
export type InsertPaymentVerification = z.infer<typeof insertPaymentVerificationSchema>;
export type RejectionCategory = typeof REJECTION_CATEGORIES[number];
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// File Upload related constants
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  signerUserId: uuid("signer_user_id").references(() => users.id, { onDelete: "cascade" }),
  signerRole: text("signer_role").notNull(), // tenant, landlord
  signerName: text("signer_name").notNull(),
  signedAt: timestamp("signed_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentElectronic: boolean("consent_electronic").default(true),
  consentBinding: boolean("consent_binding").default(true),
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

export const insertLeaseSignatureSchema = createInsertSchema(leaseSignatures).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});

export type LeaseSignature = typeof leaseSignatures.$inferSelect;
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

export const leaseStatusUpdateSchema = z.object({
  status: z.enum(LEASE_STATUSES),
  reason: z.string().optional(),
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
