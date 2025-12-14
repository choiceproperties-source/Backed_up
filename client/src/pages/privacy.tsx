import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="bg-primary py-16 text-center">
        <h1 className="font-heading text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-primary-foreground/80 max-w-xl mx-auto px-4">
          Effective Date: November 21, 2025
        </p>
      </div>
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="prose prose-blue max-w-none">
          <p className="text-lg text-muted-foreground mb-6">Last updated: November 21, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Choice Properties ("we," "our," or "us") respects your privacy and is committed to protecting it through our compliance with this policy. This policy describes the types of information we may collect from you or that you may provide when you visit the website choiceproperties.com (our "Website") and our practices for collecting, using, maintaining, protecting, and disclosing that information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect several types of information from and about users of our Website, including information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>By which you may be personally identified, such as name, postal address, e-mail address, telephone number ("personal information");</li>
              <li>That is about you but individually does not identify you, such as usage details, IP addresses, and information collected through cookies.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use information that we collect about you or that you provide to us, including any personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To present our Website and its contents to you.</li>
              <li>To provide you with information, products, or services that you request from us.</li>
              <li>To fulfill any other purpose for which you provide it (e.g., processing rental applications).</li>
              <li>To notify you about changes to our Website or any products or services we offer or provide though it.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We have implemented measures designed to secure your personal information from accidental loss and from unauthorized access, use, alteration, and disclosure. All information you provide to us is stored on our secure servers behind firewalls.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              To ask questions or comment about this privacy policy and our privacy practices, contact us at: info@choiceproperties.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
