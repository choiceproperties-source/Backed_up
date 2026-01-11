import PDFDocument from 'pdfkit';
import * as applicationRepository from '../modules/applications/application.repository';

export async function generateLeasePdf(applicationId: string): Promise<string> {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");

  // In a real app, upload to Supabase. For now, simulate returning a URL.
  const leaseUrl = `/api/v2/applications/${applicationId}/lease-agreement.pdf`;
  return leaseUrl;
}

export async function createLeasePdfStream(applicationId: string, res: any) {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");

  const property = await applicationRepository.getProperty(application.property_id);
  const user = await applicationRepository.getUser(application.user_id);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // HEADER
  doc.fontSize(20).text('Residential Lease Agreement', { align: 'center' });
  doc.fontSize(14).text('Choice Properties', { align: 'center' });
  doc.fontSize(10).text(`Governing Law: ${property?.state || 'N/A'}`, { align: 'center' });
  doc.moveDown();

  // PARTIES
  doc.fontSize(12).text('1. PARTIES', { underline: true });
  doc.fontSize(10).text(`Landlord: Choice Properties Management`);
  doc.fontSize(10).text(`Tenant: ${user?.full_name || 'N/A'}`);
  doc.moveDown();

  // PROPERTY
  doc.fontSize(12).text('2. PROPERTY DESCRIPTION', { underline: true });
  doc.fontSize(10).text(`Address: ${property?.address || 'N/A'}, ${property?.city || ''}, ${property?.state || ''}`);
  doc.fontSize(10).text(`Property Type: ${property?.propertyType || 'Residential'}`);
  doc.moveDown();

  // FINANCIAL TERMS
  doc.fontSize(12).text('3. FINANCIAL TERMS', { underline: true });
  doc.fontSize(10).text(`Monthly Rent: $${application.rentSnapshot || property?.price || '0.00'}`);
  doc.fontSize(10).text(`Security Deposit: $${application.depositSnapshot || property?.price || '0.00'}`);
  doc.moveDown();

  // LEASE TERM
  doc.fontSize(12).text('4. LEASE TERM', { underline: true });
  doc.fontSize(10).text(`Term: ${application.leaseTermSnapshot || property?.lease_term || '12 Months'}`);
  doc.fontSize(10).text(`Start Date: ${application.moveInDate ? new Date(application.moveInDate).toLocaleDateString() : 'TBD'}`);
  doc.moveDown();

  // LEGAL CLAUSES (Simplified for brevity)
  doc.fontSize(12).text('5. LEGAL CLAUSES', { underline: true });
  doc.fontSize(10).text('The Tenant shall use the premises for residential purposes only. The Landlord is responsible for major structural repairs, while the Tenant is responsible for maintaining the cleanliness and order of the unit.');
  doc.moveDown();

  // SIGNATURE SECTION
  doc.fontSize(12).text('6. SIGNATURES', { underline: true });
  doc.fontSize(10).text(`Tenant Signature (Electronic): ${user?.full_name || 'N/A'}`);
  doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.fontSize(10).text(`Landlord Signature (Electronic): Choice Properties Admin`);
  doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`);

  // FOOTER
  doc.fontSize(8).text(`Application ID: ${applicationId} | Page 1`, { align: 'center', bottom: 50 });

  doc.end();
}
