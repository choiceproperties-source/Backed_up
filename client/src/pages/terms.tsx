import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="bg-primary py-16 text-center">
        <h1 className="font-heading text-4xl font-bold text-white mb-4">Terms & Conditions</h1>
        <p className="text-primary-foreground/80 max-w-xl mx-auto px-4">
          Effective Date: November 21, 2025
        </p>
      </div>
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-blue max-w-none">
          <p className="text-lg text-muted-foreground mb-8">
            Welcome to Choice Properties. By submitting an application through our platform, you agree to the following terms and conditions. Please read carefully.
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">1. Our Role</h2>
            <p className="text-muted-foreground mb-4">
              Choice Properties is a platform that partners with property owners, management companies, and licensed real estate agents to advertise rental properties, collect applications, and perform initial applicant screenings.
            </p>
            <div className="bg-muted/30 p-4 rounded-lg border border-secondary/50 mb-4">
              <p className="font-medium text-primary">Important:</p>
              <p className="text-muted-foreground">
                Choice Properties does not approve, deny, or make final decisions regarding rental applications. Final approval and leasing decisions are made solely by the property owner, management company, or agent responsible for the property.
              </p>
            </div>
            <p className="text-muted-foreground">
              Our services are designed to streamline the application process, save time, and make rental transactions more transparent and professional for applicants.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">2. Application Process</h2>
            <p className="text-muted-foreground mb-4">By submitting your application through Choice Properties:</p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Your information will be securely collected and organized for presentation to the property team.</li>
              <li>You may be contacted directly by the property owner, management company, or agent regarding your application.</li>
              <li>Initial screenings may be performed by Choice Properties to ensure completeness and professional presentation of your application.</li>
            </ol>
            <p className="text-sm text-muted-foreground italic">
              Note: Submission of an application does not guarantee rental approval or a lease.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">3. Applicant Responsibilities</h2>
            <p className="text-muted-foreground mb-4">Applicants are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Providing accurate, complete, and truthful information.</li>
              <li>Submitting all required documents and forms requested during the application process.</li>
              <li>Responding to any inquiries from property owners, management companies, or agents in a timely manner.</li>
            </ul>
            <p className="text-muted-foreground">
              Providing false, misleading, or incomplete information may result in rejection of your application by the property team.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">4. Confidentiality & Data Handling</h2>
            <p className="text-muted-foreground mb-4">Choice Properties takes your privacy seriously:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>All personal and financial information you provide is stored securely and handled in accordance with applicable privacy laws.</li>
              <li>Your information is shared only with the property owner, management company, or agent associated with the property to which you are applying.</li>
              <li>We do not sell or distribute your data to third parties outside of this purpose.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">5. Limitations of Liability</h2>
            <p className="text-muted-foreground mb-4">
              Choice Properties acts solely as a facilitation and marketing platform. We are not responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Decisions made by property owners, management companies, or agents regarding application approval.</li>
              <li>Property conditions, availability, or suitability.</li>
              <li>Any communication or agreements between the applicant and property owners or agents after submission.</li>
            </ul>
            <p className="text-muted-foreground">
              By using our platform, you agree to release Choice Properties from any liability related to rental approval, leasing decisions, or property management.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">6. Accuracy of Listings</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Choice Properties strives to provide accurate and up-to-date property information, including descriptions, images, and availability.</li>
              <li>Listings are provided by property owners or management companies, and Choice Properties cannot guarantee completeness or accuracy.</li>
              <li>Applicants should verify all details directly with the property team before making decisions.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">7. Communication & Contact</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>After submission, applicants may be contacted directly by the property owner, management company, or agent.</li>
              <li>Choice Properties may send emails, notifications, or updates related to your application for administrative purposes only.</li>
              <li>Applicants are responsible for keeping contact information current to ensure timely communication.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">8. Benefits of Applying Through Choice Properties</h2>
            <p className="text-muted-foreground mb-4">By using our platform, applicants gain:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>A streamlined, one-stop application process for multiple properties.</li>
              <li>Professional organization of your documents and application presentation.</li>
              <li>Secure and confidential handling of personal and financial information.</li>
              <li>Faster connection with decision-makers.</li>
              <li>Access to a wide range of properties across multiple owners, agents, and management companies.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">9. Amendments</h2>
            <p className="text-muted-foreground">
              Choice Properties may update these Terms & Conditions from time to time. Any changes will be posted on this page, and continued use of the platform constitutes acceptance of updated terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-primary">10. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by the laws of the state or jurisdiction in which Choice Properties operates. Any disputes will be subject to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <div className="bg-primary/5 p-6 rounded-lg border border-primary/10 text-center mt-12">
            <p className="text-primary font-medium">
              By submitting an application through Choice Properties, you acknowledge that you have read, understood, and agree to these Terms & Conditions.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
