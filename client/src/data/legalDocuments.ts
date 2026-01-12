export interface LegalDocument {
  id: string;
  documentKey: string;
  title: string;
  category: string;
  version: string;
  jurisdiction: string;
  appliesTo: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  content: string;
}

export const legalDocuments: LegalDocument[] = [
  {
    id: "tos",
    documentKey: "terms_of_service",
    title: "Terms of Service",
    category: "General",
    version: "1.0",
    jurisdiction: "Federal",
    appliesTo: "All Users",
    effectiveDate: "2026-01-12T00:00:00Z",
    lastUpdated: "January 12, 2026",
    summary: "These terms govern your use of the Choice Properties platform and services.",
    content: "Choice Properties provides a platform for connecting tenants and landlords. By using our service, you agree to comply with our community guidelines and fair usage policies. We reserve the right to modify these terms at any time. Your continued use of the platform after changes constitutes acceptance of the new terms. [Placeholder legal text for Terms of Service]"
  },
  {
    id: "privacy",
    documentKey: "privacy_policy",
    title: "Privacy Policy",
    category: "General",
    version: "1.0",
    jurisdiction: "Federal",
    appliesTo: "All Users",
    effectiveDate: "2026-01-12T00:00:00Z",
    lastUpdated: "January 12, 2026",
    summary: "Learn how we collect, use, and protect your personal information.",
    content: "We take your privacy seriously. We collect information you provide during signup and application, including contact details and financial information. This data is used solely for the purpose of rental transactions and platform improvements. We do not sell your personal data to third parties. Our security measures include encryption and secure server protocols. [Placeholder legal text for Privacy Policy]"
  },
  {
    id: "rental-terms",
    documentKey: "rental_application_terms",
    title: "Rental Application Terms",
    category: "Application",
    version: "1.0",
    jurisdiction: "State-Specific",
    appliesTo: "Tenants Only",
    effectiveDate: "2026-01-12T00:00:00Z",
    lastUpdated: "January 12, 2026",
    summary: "Terms specifically related to submitting a rental application through our platform.",
    content: "When submitting an application, you agree to provide truthful and complete information. Landlords may use this information to evaluate your eligibility for their property. Submitting an application does not guarantee approval or reservation of the property. Fees paid for application processing are generally non-refundable. [Placeholder legal text for Rental Application Terms]"
  },
  {
    id: "fair-housing",
    documentKey: "fair_housing_notice",
    title: "Fair Housing Notice",
    category: "Compliance",
    version: "1.0",
    jurisdiction: "Federal",
    appliesTo: "All Users",
    effectiveDate: "2026-01-12T00:00:00Z",
    lastUpdated: "January 12, 2026",
    summary: "Our commitment to equal housing opportunities for all.",
    content: "Choice Properties is committed to compliance with all federal, state, and local fair housing laws. We do not discriminate on the basis of race, color, religion, sex, handicap, familial status, or national origin. We expect all landlords on our platform to adhere to these same principles. [Placeholder legal text for Fair Housing Notice]"
  },
  {
    id: "credit-check",
    documentKey: "background_credit_disclosure",
    title: "Background & Credit Check Disclosure",
    category: "Compliance",
    version: "1.0",
    jurisdiction: "Federal",
    appliesTo: "Tenants Only",
    effectiveDate: "2026-01-12T00:00:00Z",
    lastUpdated: "January 12, 2026",
    summary: "Important information about the screening process.",
    content: "As part of the application process, landlords may request a credit report and background check. You will be notified when such a request is made and your explicit consent will be required. These reports are obtained through authorized consumer reporting agencies in compliance with the FCRA. [Placeholder legal text for Background & Credit Check Disclosure]"
  },
  {
    id: "electronic-consent",
    documentKey: "electronic_consent_disclosure",
    title: "Electronic Consent & Signature Disclosure",
    category: "Compliance",
    version: "1.0",
    jurisdiction: "Federal",
    appliesTo: "All Users",
    effectiveDate: "2026-01-12T00:00:00Z",
    lastUpdated: "January 12, 2026",
    summary: "Consent to conduct business and sign documents electronically.",
    content: "By using Choice Properties, you consent to receive communications and sign documents electronically. Your electronic signature is as legally binding as a physical signature. You have the right to request paper copies of documents, which may be subject to additional fees. You may withdraw your consent at any time, but this may limit your ability to use our services. [Placeholder legal text for Electronic Consent & Signature Disclosure]"
  }
];
