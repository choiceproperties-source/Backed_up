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

// Enhanced approval confirmation with detailed receipt
export function getApprovalConfirmationEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
  propertyAddress: string;
  applicationId: string;
  applicationFee?: number;
  paymentDate?: string;
  transactionId?: string;
  moveInDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string;
}) {
  const receiptSection = data.applicationFee ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Payment Receipt</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Transaction ID:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #1e293b;">${escapeHtml(data.transactionId || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Payment Date:</td>
          <td style="padding: 8px 0; text-align: right; color: #1e293b;">${escapeHtml(data.paymentDate || new Date().toLocaleDateString())}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Application Fee:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1e293b;">$${data.applicationFee.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 12px 0 0; font-weight: bold; color: #1e293b;">Total Paid:</td>
          <td style="padding: 12px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #16a34a;">$${data.applicationFee.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  ` : '';

  const nextStepsSection = `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 16px;">Next Steps</h3>
      <ol style="margin: 0; padding-left: 20px; color: #166534;">
        <li style="margin-bottom: 10px;">Review and sign your lease agreement (you'll receive this separately)</li>
        ${data.securityDeposit ? `<li style="margin-bottom: 10px;">Pay security deposit: <strong>$${data.securityDeposit.toFixed(2)}</strong></li>` : ''}
        ${data.moveInDate ? `<li style="margin-bottom: 10px;">Prepare for your move-in date: <strong>${escapeHtml(data.moveInDate)}</strong></li>` : ''}
        <li style="margin-bottom: 10px;">Schedule your move-in inspection with the property owner</li>
        <li>Set up utilities in your name before moving in</li>
      </ol>
    </div>
  `;

  const contactSection = data.landlordName ? `
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Property Owner Contact</h3>
      <p style="margin: 5px 0; color: #1e3a8a;"><strong>${escapeHtml(data.landlordName)}</strong></p>
      ${data.landlordEmail ? `<p style="margin: 5px 0; color: #3b82f6;">${escapeHtml(data.landlordEmail)}</p>` : ''}
      ${data.landlordPhone ? `<p style="margin: 5px 0; color: #3b82f6;">${escapeHtml(data.landlordPhone)}</p>` : ''}
    </div>
  ` : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Congratulations!</h1>
        <p style="color: #bbf7d0; margin: 10px 0 0;">Your Application Has Been Approved</p>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${escapeHtml(data.applicantName)},</p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We are thrilled to inform you that your rental application for <strong>${escapeHtml(data.propertyTitle)}</strong> has been approved!
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">Property Address</p>
          <p style="margin: 5px 0 0; color: #1e293b; font-size: 16px; font-weight: 600;">${escapeHtml(data.propertyAddress)}</p>
          ${data.monthlyRent ? `<p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Monthly Rent: <strong style="color: #1e293b;">$${data.monthlyRent.toFixed(2)}</strong></p>` : ''}
        </div>

        ${receiptSection}
        ${nextStepsSection}
        ${contactSection}
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Thank you for choosing Choice Properties. We're excited to help you find your perfect home!
          </p>
          <p style="color: #374151; font-size: 14px;">
            Best regards,<br>
            <strong>The Choice Properties Team</strong>
          </p>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-top: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 12px;">
            <strong>Important:</strong> Please keep this email for your records. Your application reference number is: <strong>${escapeHtml(data.applicationId)}</strong>
          </p>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          This email and any attachments are confidential. If you received this in error, please delete it.
        </p>
        <p style="margin: 10px 0 0; color: #94a3b8; font-size: 11px;">
          Choice Properties | Your Trusted Rental Housing Partner
        </p>
      </div>
    </div>
  `;
}

// Payment confirmation receipt email
export function getPaymentReceiptEmailTemplate(data: {
  applicantName: string;
  propertyTitle: string;
  amount: number;
  paymentType: string;
  transactionId: string;
  paymentMethod?: string;
  paymentDate?: string;
}) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed</h1>
      </div>
      
      <div style="padding: 30px; background: white; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${escapeHtml(data.applicantName)},</p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your payment has been successfully processed. Here are your transaction details:
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Property:</td>
              <td style="padding: 10px 0; text-align: right; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.propertyTitle)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Type:</td>
              <td style="padding: 10px 0; text-align: right; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.paymentType)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Transaction ID:</td>
              <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.transactionId)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Date:</td>
              <td style="padding: 10px 0; text-align: right; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.paymentDate || new Date().toLocaleDateString())}</td>
            </tr>
            ${data.paymentMethod ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Method:</td>
              <td style="padding: 10px 0; text-align: right; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(data.paymentMethod)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 15px 0 0; font-weight: bold; color: #1e293b; font-size: 16px;">Amount Paid:</td>
              <td style="padding: 15px 0 0; text-align: right; font-weight: bold; font-size: 20px; color: #16a34a;">$${data.amount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p style="color: #374151; font-size: 14px;">
            Best regards,<br>
            <strong>The Choice Properties Team</strong>
          </p>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          Please save this receipt for your records. Questions? Contact support@choiceproperties.com
        </p>
      </div>
    </div>
  `;
}
