import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PropertyCard } from "@/components/property-card";
import { PropertySearch } from "@/components/property-search";
import { useProperties } from "@/hooks/use-properties";
import type { Property } from "@/lib/types";
import { ArrowRight, CheckCircle2, Home as HomeIcon, MapPin, ShieldCheck, Zap, Globe } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
import { TestimonialCarousel } from "@/components/testimonial-carousel";
import { HowItWorksTimeline } from "@/components/how-it-works-timeline";
import { QuickBrowseSection } from "@/components/quick-browse-section";
import heroBg from "@assets/generated_images/modern_luxury_home_exterior_with_blue_sky.png";
import { updateMetaTags, getOrganizationStructuredData, addStructuredData, setCanonicalUrl, getBreadcrumbStructuredData } from "@/lib/seo";

const TESTIMONIALS = [
  {
    name: "Sarah Martinez",
    location: "Los Angeles, CA",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    rating: 5,
    text: "I was worried about finding a place with my credit history, but Choice Properties connected me with understanding landlords. The application process was transparent, and I moved into my dream apartment within two weeks.",
    property: "Downtown Loft"
  },
  {
    name: "Michael Johnson",
    location: "Pasadena, CA",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    rating: 5,
    text: "As a single dad relocating for work, I needed to find a home fast. Choice Properties made it happen. They understood my situation and helped me find a family-friendly neighborhood near great schools.",
    property: "Cozy Suburban Home"
  },
  {
    name: "Emily Chen",
    location: "Santa Monica, CA",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    rating: 5,
    text: "The whole process was incredibly smooth. From initial viewing to signing the lease, everything was professional and efficient. The online application system saved me so much time. Highly recommend!",
    property: "Seaside Condo"
  },
  {
    name: "David Lee",
    location: "Seattle, WA",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    rating: 5,
    text: "Found my perfect home in just 3 weeks! The personalized recommendations and responsive support team made all the difference. This is how renting should be.",
    property: "Modern Apartment"
  }
];

export default function Home() {
  const { properties = [], loading } = useProperties();

  useEffect(() => {
    updateMetaTags({
      title: "Choice Properties - Find Your Perfect Rental Home | Troy, MI Real Estate",
      description: "Your trusted rental housing partner in Troy, MI. Browse 500+ rental properties, apply online, and find your perfect home. Free property search with instant notifications.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com"
    });
    setCanonicalUrl("https://choiceproperties.com");
    addStructuredData(getOrganizationStructuredData(), 'organization');
    addStructuredData(getBreadcrumbStructuredData([
      { name: 'Home', url: 'https://choiceproperties.com' }
    ]), 'breadcrumb');
  }, []);

  const featuredProperties = Array.isArray(properties) ? properties.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />

      {/* ===== HERO SECTION - ENHANCED ===== */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBg})` }}
          role="img"
          aria-label="Modern luxury home exterior with blue sky background"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/75 via-primary/55 to-background/85 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-60" />
        </div>

        <div className="container relative z-10 px-4 text-white space-y-6 max-w-5xl py-12">
          <div data-aos="fade-down" className="text-center space-y-4">
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
              Find the home that <span className="text-secondary block md:inline">fits your life</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 font-light">
              Your Trusted Rental Housing Partner
            </p>
          </div>
          
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-white/80 leading-relaxed text-center" data-aos="fade-up" data-aos-delay="200">
            At Choice Properties, we solve one of life's most important needs—finding a place you can truly call home.
          </p>
          
          <div data-aos="fade-up" data-aos-delay="400">
            <PropertySearch />
          </div>

        </div>
      </section>

      {/* ===== QUICK BROWSE SECTION ===== */}
      <QuickBrowseSection />

      {/* ===== FEATURED PROPERTIES - MASONRY STYLE ===== */}
      <section className="py-24 bg-white dark:bg-slate-900" id="properties">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-16" data-aos="fade-up">
            <div>
              <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary mb-3">Featured Properties</h2>
              <p className="text-muted-foreground text-lg">Browse verified rental listings from across the country</p>
            </div>
            <Link href="/properties">
              <Button variant="link" className="text-secondary font-bold text-lg hidden md:flex group gap-2">
                View All Listings <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {featuredProperties.map((property, idx) => (
                <div
                  key={property.id}
                  className="group"
                  data-aos="fade-up"
                  data-aos-delay={idx * 100}
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105">
                    <PropertyCard property={property} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="text-center md:hidden">
            <Link href="/properties">
              <Button className="w-full bg-secondary text-primary-foreground h-12 font-bold text-lg">View All Properties</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== ANIMATED STATISTICS SECTION ===== */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary/80 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary rounded-full mix-blend-screen blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary rounded-full mix-blend-screen blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            <div className="space-y-3" data-aos="fade-up">
              <div className="text-5xl md:text-6xl font-bold text-secondary">
                <AnimatedCounter end={500} prefix="" suffix="+" />
              </div>
              <p className="text-xl font-semibold">Verified Properties</p>
              <p className="text-white/70">Handpicked rental homes</p>
            </div>

            <div className="space-y-3" data-aos="fade-up" data-aos-delay="100">
              <div className="text-5xl md:text-6xl font-bold text-secondary">
                <AnimatedCounter end={2000} prefix="" suffix="+" />
              </div>
              <p className="text-xl font-semibold">Happy Renters</p>
              <p className="text-white/70">Successfully placed</p>
            </div>

            <div className="space-y-3" data-aos="fade-up" data-aos-delay="200">
              <div className="text-5xl md:text-6xl font-bold text-secondary">
                <AnimatedCounter end={98} prefix="" suffix="%" />
              </div>
              <p className="text-xl font-semibold">Approval Rate</p>
              <p className="text-white/70">Industry leading</p>
            </div>

            <div className="space-y-3" data-aos="fade-up" data-aos-delay="300">
              <div className="text-5xl md:text-6xl font-bold text-secondary">
                <AnimatedCounter end={10000} prefix="" suffix="+" />
              </div>
              <p className="text-xl font-semibold">Successful Moves</p>
              <p className="text-white/70">Zero disputes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS - ENHANCED TIMELINE ===== */}
      <section className="py-24 bg-white dark:bg-slate-900" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20" data-aos="fade-up">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">How It Works</h2>
            <p className="text-muted-foreground text-lg">Simple, straightforward steps to find your perfect rental home</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <HowItWorksTimeline />
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE US - ENHANCED FEATURES ===== */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background" id="why-us">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">Why Choose Choice Properties</h2>
            <p className="text-muted-foreground text-lg">
              We connect renters with verified properties and guide you through every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <CheckCircle2 className="h-12 w-12 text-secondary" />,
                title: "Verified Listings",
                description: "Every property is verified and legitimate. No scams, no surprises—just quality homes.",
                gradient: "from-blue-500/10 to-transparent"
              },
              {
                icon: <ShieldCheck className="h-12 w-12 text-secondary" />,
                title: "Secure Platform",
                description: "Your information stays safe with our secure platform. Protected interactions.",
                gradient: "from-green-500/10 to-transparent"
              },
              {
                icon: <HomeIcon className="h-12 w-12 text-secondary" />,
                title: "All Property Types",
                description: "Houses, apartments, condos, townhomes. Find exactly what you're looking for.",
                gradient: "from-purple-500/10 to-transparent"
              },
              {
                icon: <Globe className="h-12 w-12 text-secondary" />,
                title: "Nationwide Access",
                description: "Rental properties available nationwide. Find your perfect match anywhere.",
                gradient: "from-orange-500/10 to-transparent"
              },
              {
                icon: <Zap className="h-12 w-12 text-secondary" />,
                title: "Quick Approvals",
                description: "Get approved within 48 hours. Fast-track your move-in process.",
                gradient: "from-yellow-500/10 to-transparent"
              },
              {
                icon: <MapPin className="h-12 w-12 text-secondary" />,
                title: "Neighborhood Insights",
                description: "Detailed information about neighborhoods, schools, and local amenities.",
                gradient: "from-red-500/10 to-transparent"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`group p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-border/50 backdrop-blur-sm shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-secondary/50`}
                data-aos="fade-up"
                data-aos-delay={idx * 100}
              >
                <div className="mb-6 p-4 rounded-full bg-primary/5 w-fit group-hover:bg-primary/10 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-heading text-xl font-bold mb-3 text-primary">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHO WE HELP - ENHANCED BANNER ===== */}
      <section className="py-24 bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-screen blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div data-aos="fade-right" className="space-y-8">
              <div>
                <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">Who We Help</h2>
                <p className="text-lg text-white/85 leading-relaxed">
                  We specialize in matching renters with properties that fit their lifestyle, budget, and needs. Wherever you are in the USA, Choice Properties pairs you with a home that's right for you.
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  "Working professionals seeking flexibility",
                  "Families and single parents",
                  "Students & First-time renters",
                  "Relocating individuals",
                  "Renters rebuilding credit",
                  "Those seeking second-chance housing"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center text-lg font-medium group">
                    <CheckCircle2 className="h-6 w-6 text-secondary mr-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative" data-aos="fade-left">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 group hover-elevate">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Happy family moving in"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div className="absolute -bottom-8 -left-8 bg-gradient-to-br from-secondary to-secondary/80 text-primary-foreground p-8 rounded-2xl shadow-2xl border border-white/20 hidden md:block">
                <p className="text-4xl font-bold">100%</p>
                <p className="text-sm font-semibold uppercase tracking-wider">Verified Listings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS - CAROUSEL ===== */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background dark:from-slate-800/30" id="reviews">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">What Our Tenants Say</h2>
            <p className="text-muted-foreground text-lg">
              Real stories from real people who found their perfect home through Choice Properties
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <TestimonialCarousel testimonials={TESTIMONIALS} />
          </div>

          <div className="mt-16 text-center" data-aos="fade-up" data-aos-delay="400">
            <div className="inline-flex items-center gap-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-8 py-4 rounded-full border border-green-200 dark:border-green-800 shadow-md">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-semibold text-lg">Over 500+ Happy Tenants in 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA - ENHANCED ===== */}
      <section className="py-32 bg-gradient-to-r from-secondary/20 via-primary/10 to-secondary/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-secondary rounded-full mix-blend-screen blur-3xl" />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div data-aos="zoom-in" className="space-y-8">
            <h2 className="font-heading text-5xl md:text-6xl font-bold text-primary">Your next rental starts here</h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
              We don't just list properties—we guide you through the entire process. From viewing a home to getting your application approved, we're with you every step of the way.
            </p>
            <Link href="/properties">
              <Button size="lg" className="bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary/80 text-primary-foreground font-bold h-16 px-16 text-xl shadow-xl hover:shadow-2xl transition-all rounded-full">
                Start Searching Now <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
