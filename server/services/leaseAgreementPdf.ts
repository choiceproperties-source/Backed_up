import PDFDocument from 'pdfkit';
import * as applicationRepository from '../modules/applications/application.repository';

export async function generateLeasePdf(applicationId: string): Promise<string> {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");
  return `/api/v2/applications/${applicationId}/lease-agreement.pdf`;
}

export async function createLeasePdfStream(applicationId: string, res: any) {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");

  const property = await applicationRepository.getProperty(application.property_id);
  const user = await applicationRepository.getUser(application.user_id);
  const owner = await applicationRepository.getUser(property?.owner_id);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // HEADER
  doc.fontSize(18).font('Helvetica-Bold').text('RESIDENTIAL LEASE AGREEMENT', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Choice Properties Management Platform', { align: 'center' });
  doc.fontSize(10).text(`Governing Law: State of ${property?.state || 'N/A'}`, { align: 'center' });
  doc.moveDown(2);

  // 1. PARTIES
  doc.fontSize(12).font('Helvetica-Bold').text('1. PARTIES', { underline: true });
  doc.fontSize(10).font('Helvetica').text(`This Lease Agreement is entered into between:`);
  doc.text(`LANDLORD: ${owner?.full_name || 'Choice Properties Owner'} ("Landlord")`);
  doc.text(`TENANT: ${user?.full_name || 'N/A'} ("Tenant")`);
  doc.moveDown();

  // 2. PROPERTY
  doc.fontSize(12).font('Helvetica-Bold').text('2. PROPERTY DESCRIPTION', { underline: true });
  doc.fontSize(10).font('Helvetica').text(`Address: ${property?.address || 'N/A'}, ${property?.city || ''}, ${property?.state || ''}`);
  doc.text(`Included Amenities: ${property?.amenities ? JSON.stringify(property.amenities) : 'Standard fixtures and fittings'}`);
  doc.moveDown();

  // 3. FINANCIAL TERMS
  doc.fontSize(12).font('Helvetica-Bold').text('3. FINANCIAL TERMS', { underline: true });
  doc.fontSize(10).font('Helvetica').text(`Monthly Rent: $${application.rentSnapshot || property?.price || '0.00'}`);
  doc.text(`Security Deposit: $${application.depositSnapshot || property?.price || '0.00'}`);
  doc.text(`Late Fee: 5% of monthly rent if not paid within 5 days of due date.`);
  doc.moveDown();

  // 4. LEASE TERM
  doc.fontSize(12).font('Helvetica-Bold').text('4. LEASE TERM', { underline: true });
  doc.fontSize(10).font('Helvetica').text(`Term Length: ${application.leaseTermSnapshot || property?.lease_term || '12 Months'}`);
  doc.text(`Start Date: ${application.moveInDate ? new Date(application.moveInDate).toLocaleDateString() : 'TBD'}`);
  doc.text(`Renewal: This lease shall automatically renew on a month-to-month basis unless 30 days written notice is provided.`);
  doc.moveDown();

  // 5. LEGAL CLAUSES
  doc.fontSize(12).font('Helvetica-Bold').text('5. LEGAL CLAUSES', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text('USE OF PREMISES: The Tenant shall use the premises for residential purposes only. No commercial activity is permitted.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('MAINTENANCE & REPAIRS: Landlord is responsible for structural repairs and mechanical systems. Tenant is responsible for maintaining the unit in a clean and sanitary condition.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('ENTRY RIGHTS: Landlord may enter the premises for repairs or inspection with 24-hour notice, or immediately in case of emergency.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('FAIR HOUSING: This lease is subject to all Federal and State Fair Housing laws. No discrimination shall be tolerated.', { align: 'justify' });
  doc.moveDown(0.5);
  doc.text('SEVERABILITY: If any part of this lease is found invalid, the remainder shall remain in full force and effect.', { align: 'justify' });
  doc.moveDown();

  // 6. SIGNATURES
  doc.fontSize(12).font('Helvetica-Bold').text('6. SIGNATURES', { underline: true });
  doc.fontSize(10).font('Helvetica').text(`TENANT SIGNATURE (Digital): ${user?.full_name || 'N/A'}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();
  doc.text(`LANDLORD SIGNATURE (Digital): ${owner?.full_name || 'Choice Properties Authorized Agent'}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown(2);

  // FOOTER
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(`Application Ref: ${applicationId} | Page ${i + 1} of ${range.count}`, 50, doc.page.height - 50, { align: 'center' });
  }

  doc.end();
}
