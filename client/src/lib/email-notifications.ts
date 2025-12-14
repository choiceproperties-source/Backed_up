// Email notification integration prep
export interface EmailNotification {
  to: string;
  type: 'application_submitted' | 'application_approved' | 'application_rejected' | 'status_update';
  subject: string;
  data: Record<string, any>;
}

export async function queueEmailNotification(notification: EmailNotification) {
  try {
    const response = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to queue email notification:', error);
    return false;
  }
}

export function prepareApplicationSubmittedEmail(email: string, propertyTitle: string, applicationId: string) {
  return {
    to: email,
    type: 'application_submitted' as const,
    subject: `Application Submitted - ${propertyTitle}`,
    data: {
      propertyTitle,
      applicationId,
      timestamp: new Date().toISOString(),
    },
  };
}

export function prepareApplicationDecisionEmail(email: string, propertyTitle: string, approved: boolean) {
  return {
    to: email,
    type: approved ? 'application_approved' as const : 'application_rejected' as const,
    subject: approved ? `Congratulations! Application Approved - ${propertyTitle}` : `Application Update - ${propertyTitle}`,
    data: {
      propertyTitle,
      approved,
      timestamp: new Date().toISOString(),
    },
  };
}
