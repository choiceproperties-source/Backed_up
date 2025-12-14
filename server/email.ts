// SendGrid integration using Replit's connector system
import sgMail from "@sendgrid/mail";
import escapeHtml from "escape-html";

interface SendGridCredentials {
  apiKey: string;
  email: string;
}

// Fetch SendGrid credentials from Replit connector
async function getCredentials(): Promise<SendGridCredentials> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Replit connector token not available');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  
  return {
    apiKey: connectionSettings.settings.api_key, 
    email: connectionSettings.settings.from_email
  };
}

// Get fresh SendGrid client each time (tokens can expire)
async function getSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return { client: sgMail, fromEmail: email };
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: EmailParams): Promise<{ success: boolean; mock?: boolean; error?: any }> {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    await client.send({
      to,
      from: from || fromEmail,
      subject,
      html,
    });
    
    console.log(`[EMAIL] Sent email to ${to}: ${subject}`);
    return { success: true };
  } catch (error: any) {
    // If SendGrid isn't configured, return mock success for development
    if (error.message?.includes('not connected') || error.message?.includes('not available')) {
      console.log(`[EMAIL] Mock email to ${to}: ${subject}`);
      return { success: true, mock: true };
    }
    console.error('[EMAIL] Failed to send email:', error);
    return { success: false, error };
  }
}

// Email templates
export function getAgentInquiryEmailTemplate(data: {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string;
  propertyTitle?: string;
}) {
  return `
    <h2>New Inquiry from Choice Properties</h2>
    <p><strong>From:</strong> ${escapeHtml(data.senderName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.senderEmail)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(data.senderPhone)}</p>
    ${data.propertyTitle ? `<p><strong>Property:</strong> ${escapeHtml(data.propertyTitle)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(data.message)}</p>
    <p>Please reply to ${escapeHtml(data.senderEmail)} to respond.</p>
  `;
}

export function getApplicationConfirmationEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
}) {
  return `
    <h2>Application Received!</h2>
    <p>Hi ${escapeHtml(data.applicantName)},</p>
    <p>We've received your application for <strong>${escapeHtml(data.propertyTitle)}</strong>.</p>
    <p>Your application is currently under review. You'll hear from us within 3-5 business days.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Application status change templates
export function getApplicationStatusEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
  status: string;
  rejectionReason?: string;
  appealable?: boolean;
}) {
  const statusTemplates: Record<string, string> = {
    pending: `
      <h2>Application Submitted Successfully</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> has been successfully submitted and is now pending review.</p>
      <p>We will notify you once the property owner reviews your application.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    under_review: `
      <h2>Application Under Review</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Great news! Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> is now being actively reviewed by the property owner.</p>
      <p>We will keep you updated on any changes to your application status.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    pending_verification: `
      <h2>Verification Required</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> requires additional verification.</p>
      <p>Please ensure all your documents are up to date and accurate. You may be contacted for additional information.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    approved: `
      <h2>Congratulations! Application Approved</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>We are pleased to inform you that your application for <strong>${escapeHtml(data.propertyTitle)}</strong> has been approved!</p>
      <p>The property owner will be in touch with you shortly regarding the next steps for your lease agreement.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    approved_pending_lease: `
      <h2>Approved - Lease Pending</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> has been approved and is pending lease signing.</p>
      <p>Please check your email for the lease agreement and follow the instructions to complete the process.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    rejected: `
      <h2>Application Status Update</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>We regret to inform you that your application for <strong>${escapeHtml(data.propertyTitle)}</strong> was not approved at this time.</p>
      ${data.rejectionReason ? `<p><strong>Reason:</strong> ${escapeHtml(data.rejectionReason)}</p>` : ""}
      ${data.appealable ? "<p>If you believe this decision was made in error, you may appeal by contacting the property owner.</p>" : ""}
      <p>We encourage you to continue your search for the perfect home.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    withdrawn: `
      <h2>Application Withdrawn</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> has been withdrawn as requested.</p>
      <p>If you wish to apply again in the future, please submit a new application.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
    expired: `
      <h2>Application Expired</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> has expired due to inactivity.</p>
      <p>If you are still interested in this property, please submit a new application.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `,
  };

  return statusTemplates[data.status] || statusTemplates.pending;
}

// Expiration warning template
export function getExpirationWarningEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
  daysRemaining: number;
}) {
  return `
    <h2>Application Expiring Soon</h2>
    <p>Dear ${escapeHtml(data.applicantName)},</p>
    <p>Your application for <strong>${escapeHtml(data.propertyTitle)}</strong> will expire in ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}.</p>
    <p>Please log in to your account to complete any missing information or contact us if you need more time.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Document request template
export function getDocumentRequestEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
  requiredDocuments: string[];
}) {
  const docList = data.requiredDocuments.map(doc => `<li>${escapeHtml(doc)}</li>`).join('');
  return `
    <h2>Documents Required</h2>
    <p>Dear ${escapeHtml(data.applicantName)},</p>
    <p>To continue processing your application for <strong>${escapeHtml(data.propertyTitle)}</strong>, we need the following documents:</p>
    <ul>${docList}</ul>
    <p>Please upload these documents through your dashboard as soon as possible.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Co-applicant invitation template
export function getCoApplicantInvitationEmailTemplate(data: {
  coApplicantName: string;
  mainApplicantName: string;
  propertyTitle: string;
  invitationLink?: string;
}) {
  return `
    <h2>You've Been Invited to Join an Application</h2>
    <p>Dear ${escapeHtml(data.coApplicantName)},</p>
    <p>${escapeHtml(data.mainApplicantName)} has invited you to be a co-applicant for the property <strong>${escapeHtml(data.propertyTitle)}</strong> on Choice Properties.</p>
    <p>As a co-applicant, you'll need to provide information about your income, employment, and rental history to strengthen the application.</p>
    <p>To complete your co-applicant profile, please click the link below:</p>
    ${data.invitationLink ? `<p><a href="${escapeHtml(data.invitationLink)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Complete Co-Applicant Profile</a></p>` : ''}
    <p>If you have any questions or need assistance, please contact the property owner or our support team.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Owner notification when new application received
export function getNewApplicationNotificationTemplate(data: {
  ownerName: string;
  propertyTitle: string;
  applicantName: string;
  applicationId: string;
}) {
  return `
    <h2>New Application Received</h2>
    <p>Dear ${escapeHtml(data.ownerName)},</p>
    <p>A new application has been submitted for your property <strong>${escapeHtml(data.propertyTitle)}</strong>.</p>
    <p><strong>Applicant:</strong> ${escapeHtml(data.applicantName)}</p>
    <p>Please log in to your dashboard to review the application and take action.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Scoring complete notification
export function getScoringCompleteEmailTemplate(data: {
  ownerName: string;
  propertyTitle: string;
  applicantName: string;
  score: number;
  maxScore: number;
}) {
  const percentage = Math.round((data.score / data.maxScore) * 100);
  return `
    <h2>Application Scored</h2>
    <p>Dear ${escapeHtml(data.ownerName)},</p>
    <p>The application from <strong>${escapeHtml(data.applicantName)}</strong> for <strong>${escapeHtml(data.propertyTitle)}</strong> has been scored.</p>
    <p><strong>Score:</strong> ${data.score}/${data.maxScore} (${percentage}%)</p>
    <p>Log in to your dashboard to review the full score breakdown and make a decision.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Co-applicant invitation template
export function getCoApplicantInviteEmailTemplate(data: {
  coApplicantName: string;
  primaryApplicantName: string;
  propertyTitle: string;
  relationship: string;
  applicationLink: string;
}) {
  return `
    <h2>You've Been Added as a Co-Applicant</h2>
    <p>Dear ${escapeHtml(data.coApplicantName)},</p>
    <p><strong>${escapeHtml(data.primaryApplicantName)}</strong> has added you as a ${escapeHtml(data.relationship)} on their rental application for <strong>${escapeHtml(data.propertyTitle)}</strong>.</p>
    <p>To complete the application, you'll need to verify your identity and provide some basic information.</p>
    <p><a href="${escapeHtml(data.applicationLink)}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Complete Your Application</a></p>
    <p>If you did not expect this invitation, please ignore this email or contact us.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Background check initiated template
export function getBackgroundCheckEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
}) {
  return `
    <h2>Background Check Initiated</h2>
    <p>Dear ${escapeHtml(data.applicantName)},</p>
    <p>As part of your application for <strong>${escapeHtml(data.propertyTitle)}</strong>, we have initiated a background verification process.</p>
    <p>This typically includes:</p>
    <ul>
      <li>Identity verification</li>
      <li>Employment verification</li>
      <li>Rental history review</li>
      <li>Credit assessment</li>
      <li>Background screening</li>
    </ul>
    <p>This process usually takes 5-10 business days. We'll notify you when it's complete.</p>
    <p>Best regards,<br>Choice Properties Team</p>
  `;
}

// Verification complete template
export function getVerificationCompleteEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
  passed: boolean;
}) {
  if (data.passed) {
    return `
      <h2>Verification Complete - Passed</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>Great news! The verification process for your application to <strong>${escapeHtml(data.propertyTitle)}</strong> has been completed successfully.</p>
      <p>Your application is now pending final review by the property owner. We'll notify you once a decision has been made.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `;
  } else {
    return `
      <h2>Verification Update</h2>
      <p>Dear ${escapeHtml(data.applicantName)},</p>
      <p>The verification process for your application to <strong>${escapeHtml(data.propertyTitle)}</strong> has been completed. Unfortunately, some items require additional attention.</p>
      <p>Please check your application dashboard for more details or contact us if you have questions.</p>
      <p>Best regards,<br>Choice Properties Team</p>
    `;
  }
}
