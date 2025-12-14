import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PropertyTemplates } from "@/components/property-templates";
import { useEffect } from "react";
import { updateMetaTags } from "@/lib/seo";

export default function PropertyTemplatesPage() {
  useEffect(() => {
    updateMetaTags({
      title: "Property Templates - Landlord Dashboard",
      description: "Manage property templates for quick listing creation",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/property-templates",
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <PropertyTemplates />
      </main>
      <Footer />
    </div>
  );
}
