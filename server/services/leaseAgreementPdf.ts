import PDFDocument from 'pdfkit';
import * as applicationRepository from '../modules/applications/application.repository';
import { supabase } from '../supabase';

export async function generateLeasePdf(applicationId: string): Promise<string> {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");
  // Log PDF generation
  await supabase.from("admin_actions").insert({
    action: "lease_pdf_generated",
    resource_type: "application",
    resource_id: applicationId,
    details: { timestamp: new Date().toISOString() }
  });
  return `/api/v2/leases/${applicationId}/download-pdf`;
}

export async function createLeasePdfStream(applicationId: string, res: any, isSigned: boolean = false) {
  const application = await applicationRepository.findApplicationById(applicationId);
  if (!application) throw new Error("Application not found");

  const property = await applicationRepository.getProperty(application.property_id);
  const user = await applicationRepository.getUser(application.user_id);
  const owner = await applicationRepository.getUser(property?.owner_id);

  // Fetch signatures if signed
  let signatures: any[] = [];
  if (isSigned) {
    const { data, error } = await supabase
      .from("lease_signatures")
      .select("*")
      .eq("application_id", applicationId);
    if (!error) signatures = data || [];
  }

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  // HEADER
  doc.fontSize(18).font('Helvetica-Bold').text(isSigned ? 'FINAL RESIDENTIAL LEASE AGREEMENT' : 'RESIDENTIAL LEASE AGREEMENT', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Choice Properties Management Platform', { align: 'center' });
  if (isSigned) {
    doc.fontSize(10).font('Helvetica-Bold').text('IMMUTABLE SIGNED DOCUMENT', { align: 'center', color: 'red' });
  }
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
  
  if (isSigned) {
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('ELECTRONIC SIGNATURE DISCLOSURE', { underline: true });
    
    // Fetch state disclosure text based on state_code
    const stateDisclosuresLookup: Record<string, string> = {
      "CA": "California E-Signature Disclosure: You agree that your electronic signature is the legal equivalent of your manual signature on this Agreement. Under the California Uniform Electronic Transactions Act (UETA), this Agreement is legally binding.",
      "NY": "New York E-Signature Disclosure: This document is being signed electronically pursuant to the New York Electronic Signatures and Records Act (ESRA). Your electronic signature has the same validity and enforceability as a handwritten signature.",
      "TX": "Texas E-Signature Disclosure: You acknowledge that your electronic signature on this Agreement is legally binding under the Texas Uniform Electronic Transactions Act.",
    };

    const firstSigWithState = signatures.find(s => s.state_code);
    const stateDisclosureText = (firstSigWithState?.state_code && stateDisclosuresLookup[firstSigWithState.state_code]) 
      || 'By providing an electronic signature, both parties agree that this document is legally binding under the Electronic Signatures in Global and National Commerce (ESIGN) Act. Both parties acknowledge that they have read and understood the terms of this lease agreement.';

    doc.fontSize(8).font('Helvetica').text(stateDisclosureText, { align: 'justify' });
  }
  
  doc.moveDown();

  // 6. SIGNATURES
  doc.fontSize(12).font('Helvetica-Bold').text('6. SIGNATURES', { underline: true });
  
  const tenantSig = signatures.find(s => s.signer_role === 'tenant');
  const landlordSig = signatures.find(s => s.signer_role === 'landlord');

  doc.fontSize(10).font('Helvetica').text(`TENANT SIGNATURE: ${tenantSig?.signer_name || user?.full_name || 'N/A'}`);
  doc.text(`Date: ${tenantSig ? new Date(tenantSig.created_at).toLocaleString() : (isSigned ? 'N/A' : new Date().toLocaleDateString())}`);
  if (tenantSig) {
    doc.fontSize(8).text(`IP Address: ${tenantSig.ip_address} | Method: Electronic Consent Verified | Disclosure Acknowledged: ${tenantSig.state_disclosure_acknowledged ? 'Yes' : 'No'} (${tenantSig.state_code})`, { color: 'grey' });
  }
  
  doc.moveDown();
  
  doc.fontSize(10).font('Helvetica').text(`LANDLORD SIGNATURE: ${landlordSig?.signer_name || owner?.full_name || 'Choice Properties Authorized Agent'}`);
  doc.text(`Date: ${landlordSig ? new Date(landlordSig.created_at).toLocaleString() : (isSigned ? 'N/A' : new Date().toLocaleDateString())}`);
  if (landlordSig) {
    doc.fontSize(8).text(`IP Address: ${landlordSig.ip_address} | Method: Electronic Consent Verified | Disclosure Acknowledged: ${landlordSig.state_disclosure_acknowledged ? 'Yes' : 'No'} (${landlordSig.state_code})`, { color: 'grey' });
  }
  
  doc.moveDown(2);

  // FOOTER
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(`Application Ref: ${applicationId} | Page ${i + 1} of ${range.count} | ${isSigned ? 'SIGNED FINAL COPY' : 'DRAFT'}`, 50, doc.page.height - 50, { align: 'center' });
  }

  doc.end();
}

