import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PropertyCard } from "@/components/property-card";
import { EnhancedPropertySearch } from "@/components/enhanced-property-search";
import { useProperties } from "@/hooks/use-properties";
import type { Property } from "@/lib/types";
import { ArrowRight, CheckCircle2, Home as HomeIcon, MapPin, ShieldCheck, Zap, Globe, Play, Star, Users, Award, Search } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
import { TestimonialCarousel } from "@/components/testimonial-carousel";
import { HowItWorksTimeline } from "@/components/how-it-works-timeline";
import { QuickBrowseSection } from "@/components/quick-browse-section";
import { TrustBadges, CredibilityBar } from "@/components/trust-badges";
import { FloatingShapes } from "@/components/floating-particles";
import { LiveActivityTicker } from "@/components/live-activity-ticker";
import { SkipLink } from "@/components/skip-link";
import { useParallax, useReducedMotion, useIntersectionObserver } from "@/hooks/use-parallax";
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

function AnimatedSection({ 
  children, 
  className = '',
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay, prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { properties = [], loading } = useProperties();
  const parallaxOffset = useParallax(0.3);
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

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

  const featuredProperties = Array.isArray(properties) ? properties.slice(0, 6) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SkipLink />
      <Navbar />

      <main id="main-content">
        {/* ===== HERO SECTION - ENHANCED WITH PARALLAX ===== */}
        <section 
          ref={heroRef}
          className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat will-change-transform"
            style={{ 
              backgroundImage: `url(${heroBg})`,
              transform: prefersReducedMotion ? 'none' : `translateY(${parallaxOffset}px) scale(1.1)`,
            }}
            role="img"
            aria-label="Modern luxury home exterior with blue sky background"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/45 to-primary/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20" />
          </div>

          <FloatingShapes />

          <div className="container relative z-10 px-4 text-white max-w-6xl py-16 md:py-24" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            <div className="text-center space-y-8">
              <LiveActivityTicker className="justify-center mb-8" />
              
              <AnimatedSection delay={0}>
                <h1 
                  id="hero-heading"
                  className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
                >
                  Find the home that{" "}
                  <span className="text-secondary relative inline-block">
                    fits your life
                    <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary/30" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0,6 Q50,0 100,6 T200,6" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                  </span>
                </h1>
              </AnimatedSection>
              
              <AnimatedSection delay={200}>
                <p className="text-xl md:text-2xl text-white/90 font-light max-w-2xl mx-auto">
                  Your Trusted Rental Housing Partner
                </p>
              </AnimatedSection>
              
              <AnimatedSection delay={400}>
                <p className="text-lg max-w-2xl mx-auto text-white/75 leading-relaxed">
                  At Choice Properties, we solve one of life's most important needs—finding a place you can truly call home.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={600}>
                <TrustBadges variant="hero" className="mt-6" />
              </AnimatedSection>
              
              <AnimatedSection delay={800}>
                <EnhancedPropertySearch />
              </AnimatedSection>

              <AnimatedSection delay={1000}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                  <Link href="/properties">
                    <Button 
                      size="lg" 
                      className="bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold h-14 px-10 text-lg shadow-xl hover:shadow-2xl transition-all group" 
                      data-testid="cta-search-rentals"
                    >
                      <Search className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
                      Search Rentals
                    </Button>
                  </Link>
                  <Link href="/signup?role=landlord">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 font-bold h-14 px-8 text-lg" 
                      data-testid="cta-list-property"
                    >
                      List Your Property
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
            <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-white/70 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        <CredibilityBar />

        <QuickBrowseSection />

        {/* ===== TRENDING NEIGHBORHOODS ===== */}
        <section className="py-20 bg-muted/30" aria-labelledby="neighborhoods-heading">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <div className="text-center mb-12">
                <h2 id="neighborhoods-heading" className="font-heading text-3xl md:text-4xl font-bold text-primary mb-3">
                  Trending Neighborhoods
                </h2>
                <p className="text-muted-foreground text-lg">Discover popular areas with high renter satisfaction</p>
              </div>
            </AnimatedSection>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Downtown", properties: 45, image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop" },
                { name: "Midtown", properties: 38, image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=300&fit=crop" },
                { name: "Suburbs", properties: 62, image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop" },
                { name: "Waterfront", properties: 28, image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop" },
              ].map((area, idx) => (
                <AnimatedSection key={idx} delay={idx * 100}>
                  <Link href={`/properties?location=${area.name}`}>
                    <div 
                      className="relative group rounded-xl overflow-hidden aspect-[4/3] cursor-pointer" 
                      data-testid={`neighborhood-${area.name.toLowerCase()}`}
                    >
                      <img 
                        src={area.image} 
                        alt={`${area.name} neighborhood`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="font-bold text-lg">{area.name}</h3>
                        <p className="text-sm text-white/80">{area.properties} properties</p>
                      </div>
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURED PROPERTIES ===== */}
        <section className="py-24 bg-background" id="properties" aria-labelledby="featured-heading">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-16">
                <div>
                  <h2 id="featured-heading" className="font-heading text-4xl md:text-5xl font-bold text-primary mb-3">
                    Featured Properties
                  </h2>
                  <p className="text-muted-foreground text-lg">Browse verified rental listings from across the country</p>
                </div>
                <Link href="/properties">
                  <Button variant="link" className="text-secondary font-bold text-lg hidden md:flex group gap-2" data-testid="link-view-all">
                    View All Listings <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl bg-muted animate-pulse h-80" />
                ))}
              </div>
            ) : featuredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {featuredProperties.map((property, idx) => (
                  <AnimatedSection key={property.id} delay={idx * 100}>
                    <div className="group h-full">
                      <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-1 h-full">
                        <PropertyCard property={property} />
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            ) : null}

            <div className="text-center md:hidden">
              <Link href="/properties">
                <Button className="w-full bg-secondary text-primary-foreground h-12 font-bold text-lg" data-testid="button-browse-listings-mobile">
                  Browse Listings
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ===== ANIMATED STATISTICS SECTION ===== */}
        <section className="py-24 bg-gradient-to-r from-primary to-primary/80 text-white relative overflow-hidden" aria-labelledby="stats-heading">
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary rounded-full mix-blend-screen blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary rounded-full mix-blend-screen blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <h2 id="stats-heading" className="sr-only">Our Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
              {[
                { end: 500, suffix: '+', label: 'Verified Properties', desc: 'Handpicked rental homes' },
                { end: 2000, suffix: '+', label: 'Happy Renters', desc: 'Successfully placed' },
                { end: 98, suffix: '%', label: 'Approval Rate', desc: 'Industry leading' },
                { end: 10000, suffix: '+', label: 'Successful Moves', desc: 'Zero disputes' },
              ].map((stat, idx) => (
                <AnimatedSection key={idx} delay={idx * 100}>
                  <div className="space-y-3">
                    <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-secondary">
                      <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                    </div>
                    <p className="text-lg md:text-xl font-semibold">{stat.label}</p>
                    <p className="text-white/70 text-sm">{stat.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-24 bg-background" id="how-it-works" aria-labelledby="how-it-works-heading">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 id="how-it-works-heading" className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">
                  How It Works
                </h2>
                <p className="text-muted-foreground text-lg">Simple, straightforward steps to find your perfect rental home</p>
              </div>
            </AnimatedSection>
            
            <div className="max-w-4xl mx-auto">
              <HowItWorksTimeline />
            </div>
          </div>
        </section>

        {/* ===== WHY CHOOSE US ===== */}
        <section className="py-24 bg-gradient-to-b from-muted/30 to-background" id="why-us" aria-labelledby="why-us-heading">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 id="why-us-heading" className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">
                  Why Choose Choice Properties
                </h2>
                <p className="text-muted-foreground text-lg">
                  We connect renters with verified properties and guide you through every step.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: CheckCircle2,
                  title: "Verified Listings",
                  description: "Every property is verified and legitimate. No scams, no surprises—just quality homes.",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure Platform",
                  description: "Your information stays safe with our secure platform. Protected interactions.",
                },
                {
                  icon: HomeIcon,
                  title: "All Property Types",
                  description: "Houses, apartments, condos, townhomes. Find exactly what you're looking for.",
                },
                {
                  icon: Globe,
                  title: "Nationwide Access",
                  description: "Rental properties available nationwide. Find your perfect match anywhere.",
                },
                {
                  icon: Zap,
                  title: "Quick Approvals",
                  description: "Get approved within 48 hours. Fast-track your move-in process.",
                },
                {
                  icon: MapPin,
                  title: "Neighborhood Insights",
                  description: "Detailed information about neighborhoods, schools, and local amenities.",
                },
              ].map((feature, idx) => (
                <AnimatedSection key={idx} delay={idx * 100}>
                  <div
                    className="group p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="mb-6 p-4 rounded-xl bg-secondary/10 w-fit group-hover:bg-secondary/20 transition-colors">
                      <feature.icon className="h-8 w-8 text-secondary" aria-hidden="true" />
                    </div>
                    <h3 className="font-heading text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHO WE HELP ===== */}
        <section className="py-24 bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-white overflow-hidden relative" aria-labelledby="who-we-help-heading">
          <div className="absolute inset-0 opacity-5" aria-hidden="true">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-screen blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <AnimatedSection>
                <div className="space-y-8">
                  <div>
                    <h2 id="who-we-help-heading" className="font-heading text-4xl md:text-5xl font-bold mb-6">Who We Help</h2>
                    <p className="text-lg text-white/85 leading-relaxed">
                      We specialize in matching renters with properties that fit their lifestyle, budget, and needs. Wherever you are in the USA, Choice Properties pairs you with a home that's right for you.
                    </p>
                  </div>

                  <ul className="space-y-4" role="list">
                    {[
                      "Working professionals seeking flexibility",
                      "Families and single parents",
                      "Students & First-time renters",
                      "Relocating individuals",
                      "Renters rebuilding credit",
                      "Those seeking second-chance housing"
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center text-lg font-medium group">
                        <CheckCircle2 className="h-6 w-6 text-secondary mr-4 flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={200}>
                <div className="relative">
                  <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                    <img
                      src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                      alt="Happy family moving into their new home"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>

                  <div className="absolute -bottom-8 -left-8 bg-gradient-to-br from-secondary to-secondary/80 text-primary-foreground p-8 rounded-2xl shadow-2xl border border-white/20 hidden md:block">
                    <p className="text-4xl font-bold">100%</p>
                    <p className="text-sm font-semibold uppercase tracking-wider">Verified Listings</p>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="py-24 bg-gradient-to-b from-muted/30 to-background" id="reviews" aria-labelledby="testimonials-heading">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 id="testimonials-heading" className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">
                  What Our Tenants Say
                </h2>
                <p className="text-muted-foreground text-lg">
                  Real stories from real people who found their perfect home through Choice Properties
                </p>
              </div>
            </AnimatedSection>

            <div className="max-w-6xl mx-auto">
              <TestimonialCarousel testimonials={TESTIMONIALS} />
            </div>

            <AnimatedSection delay={400}>
              <div className="mt-16 text-center">
                <div className="inline-flex items-center gap-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-8 py-4 rounded-full border border-green-200 dark:border-green-800 shadow-md">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                  <span className="font-semibold text-lg">Over 500+ Happy Tenants in 2024</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-32 bg-gradient-to-r from-secondary/20 via-primary/10 to-secondary/20 relative overflow-hidden" aria-labelledby="cta-heading">
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute top-1/2 right-0 w-96 h-96 bg-secondary rounded-full mix-blend-screen blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <AnimatedSection>
              <div className="space-y-8 max-w-3xl mx-auto">
                <h2 id="cta-heading" className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-primary">
                  Your next rental starts here
                </h2>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                  We don't just list properties—we guide you through the entire process. From viewing a home to getting your application approved, we're with you every step of the way.
                </p>
                <Link href="/properties">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary/80 text-primary-foreground font-bold h-16 px-12 md:px-16 text-lg md:text-xl shadow-xl hover:shadow-2xl transition-all rounded-full group"
                    data-testid="cta-start-searching"
                  >
                    Start Searching Now 
                    <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
