import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Award, Users, Shield, Home, Heart, CheckCircle } from "lucide-react";
import { updateMetaTags, getOrganizationStructuredData, addStructuredData } from "@/lib/seo";

export default function About() {
  useEffect(() => {
    updateMetaTags({
      title: "About Us - Choice Properties",
      description: "Learn about Choice Properties, your trusted rental housing partner. We connect qualified renters with the right landlords across the USA.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/about"
    });
    addStructuredData(getOrganizationStructuredData(), 'organization');
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="bg-primary py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container relative z-10 px-4">
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-6" data-aos="zoom-in">About Us</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto" data-aos="fade-up" data-aos-delay="200">
            Your Trusted Rental Housing Partner. Connecting qualified renters with the right landlords across the USA.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* What We Do */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
          <div data-aos="fade-right">
            <h2 className="font-heading text-3xl font-bold text-primary mb-6">What We Do</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              We specialize in matching renters with properties that fit their lifestyle, budget, and needs. 
              Whether you’re searching for a Single-Family Home, Apartment, or Townhome, we make the entire process simple, fast, and stress-free.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Single-family homes",
                "Affordable apartments",
                "Luxury rentals",
                "Townhomes and duplexes",
                "Managed properties",
                "Private landlords"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-secondary mr-2 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl" data-aos="fade-left">
            <img 
              src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
              alt="Real Estate" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Mission */}
        <div className="bg-muted/30 rounded-3xl p-10 md:p-16 text-center mb-24" data-aos="fade-up">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-6">Our Mission</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            To connect renters with reliable housing opportunities—quickly, respectfully, and professionally—while supporting landlords and management teams with motivated, qualified applicants.
          </p>
        </div>

        {/* Our Promise */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12" data-aos="fade-up">
            <h2 className="font-heading text-3xl font-bold text-primary mb-4">Our Promise</h2>
            <p className="text-lg text-muted-foreground">
              We believe everyone deserves a fair chance at safe, comfortable housing.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="h-8 w-8" />,
                title: "Trustworthy Landlords",
                desc: "We verify all property owners to ensure safety and reliability."
              },
              {
                icon: <Home className="h-8 w-8" />,
                title: "Quality Homes",
                desc: "Clean, well-maintained homes that you'll be proud to live in."
              },
              {
                icon: <Award className="h-8 w-8" />,
                title: "Positive Experience",
                desc: "From application to move-in, we support you every step of the way."
              }
            ].map((card, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-gray-900 border border-border p-8 rounded-xl text-center hover:shadow-lg transition-shadow"
                data-aos="fade-up"
                data-aos-delay={idx * 100}
              >
                <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-secondary-foreground">
                  {card.icon}
                </div>
                <h3 className="font-bold text-xl mb-3">{card.title}</h3>
                <p className="text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
