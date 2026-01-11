import PDFDocument from 'pdfkit';
import { applications, properties, users } from '@shared/schema';
import * as applicationRepository from '../modules/applications/application.repository';

export async function generateDisclosurePdf(applicationId: string): Promise<string> {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");

  const property = await applicationRepository.getProperty(application.property_id);
  const user = await applicationRepository.getUser(application.user_id);

  // In a real app, we'd upload to Supabase. For now, we simulate returning a URL
  // and updating the database.
  const pdfUrl = `/api/v2/applications/${applicationId}/disclosures.pdf`;

  // Return the mock URL as requested in the requirements (URL is written once after submission)
  return pdfUrl;
}

export async function createPdfStream(applicationId: string, res: any) {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");

  const property = await applicationRepository.getProperty(application.property_id);
  const user = await applicationRepository.getUser(application.user_id);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // HEADER
  doc.fontSize(20).text('Choice Properties', { align: 'center' });
  doc.fontSize(16).text('Rental Application Legal Disclosures', { align: 'center' });
  doc.fontSize(10).text(`Generated Date: ${new Date().toISOString()}`, { align: 'center' });
  doc.moveDown();

  // APPLICANT INFO
  doc.fontSize(12).text('APPLICANT INFORMATION', { underline: true });
  doc.fontSize(10).text(`Full Name: ${user?.full_name || 'N/A'}`);
  doc.fontSize(10).text(`Email: ${user?.email || 'N/A'}`);
  doc.fontSize(10).text(`Application ID: ${applicationId}`);
  doc.fontSize(10).text(`Property Address: ${property?.address || 'N/A'}, ${property?.city || ''}, ${property?.state || ''}`);
  doc.moveDown();

  // DISCLOSURE SECTIONS
  doc.fontSize(12).text('FEDERAL DISCLOSURES', { underline: true });
  const federal = application.legalDisclosures || {};
  const fedItems = [
    { label: 'Fair Housing', acknowledged: federal.fairHousingAcknowledged },
    { label: 'Credit Check Authorization', acknowledged: federal.creditCheckAuthorized },
    { label: 'Accuracy Certification', acknowledged: federal.accuracyCertified },
    { label: 'Fee Acknowledgment', acknowledged: federal.feeAcknowledged },
  ];

  fedItems.forEach(item => {
    doc.fontSize(10).text(`${item.label}: ${item.acknowledged ? '✔ Acknowledged' : '✘ Not Acknowledged'} (Timestamp: ${federal.acknowledgedAt || application.updated_at})`);
  });
  doc.moveDown();

  // STATE DISCLOSURES
  const stateDisclosures = application.stateDisclosures || {};
  if (Object.keys(stateDisclosures).length > 0) {
    doc.fontSize(12).text(`${property?.state || 'STATE'} SPECIFIC DISCLOSURES`, { underline: true });
    Object.entries(stateDisclosures).forEach(([id, data]: [string, any]) => {
      doc.fontSize(10).text(`${id}: ${data.acknowledged ? '✔ Acknowledged' : '✘ Not Acknowledged'} (Timestamp: ${data.acknowledgedAt})`);
    });
    doc.moveDown();
  }

  // LEGAL ATTESTATION
  doc.fontSize(12).text('LEGAL ATTESTATION', { underline: true });
  doc.fontSize(10).text('“I certify under penalty of perjury that the above information is true and correct.”', { oblique: true });
  doc.moveDown();

  // SIGNATURE BLOCK
  doc.fontSize(10).text(`Typed Name: ${user?.full_name || 'N/A'}`);
  doc.fontSize(10).text(`Date: ${new Date(application.updated_at).toLocaleDateString()}`);
  doc.moveDown();

  // FOOTER
  doc.fontSize(8).text('This document is legally binding and retained for audit purposes.', { align: 'center' });

  doc.end();
}
