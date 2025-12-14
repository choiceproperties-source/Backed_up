import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PropertyCard } from "@/components/property-card";
import { PropertySearch } from "@/components/property-search";
import { Testimonials } from "@/components/testimonials";
import { useProperties } from "@/hooks/use-properties";
import type { Property } from "@/lib/types";
import { ArrowRight, CheckCircle2, Home as HomeIcon, MapPin, ShieldCheck, Search as SearchIcon, FileText, CheckSquare, Home as HomeCheckIcon } from "lucide-react";
import heroBg from "@assets/generated_images/modern_luxury_home_exterior_with_blue_sky.png";
import { updateMetaTags, getOrganizationStructuredData, addStructuredData, setCanonicalUrl, getBreadcrumbStructuredData } from "@/lib/seo";

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

  // Show first 3 properties as featured (from backend data)
  const featuredProperties = Array.isArray(properties) ? properties.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[700px] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
          style={{ backgroundImage: `url(${heroBg})` }}
          role="img"
          aria-label="Modern luxury home exterior with blue sky background"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background/90 backdrop-blur-[1px]" />
        </div>

        <div className="container relative z-10 px-4 text-white space-y-8 max-w-5xl py-12">
          <div data-aos="fade-down" className="text-center">
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 leading-tight">
              Find the home that <span className="text-secondary">fits your life</span>
            </h1>
            <p className="text-lg md:text-2xl text-white/90 font-light">
              Your Trusted Rental Housing Partner
            </p>
          </div>
          
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-white/80 leading-relaxed" data-aos="fade-up" data-aos-delay="200">
            At Choice Properties, we are dedicated to solving one of life’s most important needs—finding a place you can truly call home.
          </p>
          
          <PropertySearch />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary mb-6">How It Works</h2>
            <p className="text-muted-foreground text-lg">Simple steps to find your perfect rental home</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: 1, icon: SearchIcon, title: "Search Properties", desc: "Filter by location, price, bedrooms and more" },
              { step: 2, icon: FileText, title: "Submit Application", desc: "Apply online with all required documents" },
              { step: 3, icon: CheckSquare, title: "Get Approved", desc: "We verify your info and landlord approves" },
              { step: 4, icon: HomeCheckIcon, title: "Move In", desc: "Sign lease, get keys, move into your home" }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative">
                  <div className="text-center">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary-foreground">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-primary mb-3">
                      Step {item.step}: {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                  {idx < 3 && (
                    <div className="hidden md:block absolute top-8 -right-4 text-secondary">→</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary mb-6">Why Choose Choice Properties</h2>
            <p className="text-muted-foreground text-lg">
              We connect renters with verified properties and guide you through every step of the rental process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <CheckCircle2 className="h-10 w-10 text-secondary" />,
                title: "Verified Listings",
                description: "Every property is verified and legitimate. No scams, no surprises - just quality homes."
              },
              {
                icon: <ShieldCheck className="h-10 w-10 text-secondary" />,
                title: "Secure Platform",
                description: "Your information stays safe with our secure platform. Protected renter-landlord interactions."
              },
              {
                icon: <HomeIcon className="h-10 w-10 text-secondary" />,
                title: "All Property Types",
                description: "Houses, apartments, condos, townhomes. Find exactly what you're looking for."
              },
              {
                icon: <MapPin className="h-10 w-10 text-secondary" />,
                title: "Nationwide Access",
                description: "Rental properties available nationwide. Find your perfect match wherever life takes you."
              }
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="group p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
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

      {/* Who We Help Banner */}
      <section className="py-20 bg-primary text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right">
              <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">Who We Help</h2>
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                We specialize in matching renters with properties that fit their lifestyle, budget, and needs. 
                Wherever you are in the USA, Choice Properties is ready to pair you with a home that’s right for you.
              </p>
              <ul className="space-y-4">
                {[
                  "Working professionals",
                  "Families and single parents",
                  "Students & First-time renters",
                  "Relocating individuals",
                  "Renters rebuilding credit",
                  "Those seeking second-chance housing"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center text-lg font-medium">
                    <CheckCircle2 className="h-6 w-6 text-secondary mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative" data-aos="fade-left">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Happy family moving in" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-secondary text-primary-foreground p-6 rounded-xl shadow-xl hidden md:block">
                <p className="text-3xl font-bold">100%</p>
                <p className="text-sm font-semibold uppercase tracking-wider">Verified Listings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-24 bg-muted/30 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12" data-aos="fade-up">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-2">Featured Properties</h2>
              <p className="text-muted-foreground text-lg">Browse verified rental listings from across the country.</p>
            </div>
            <Link href="/properties">
              <Button variant="link" className="text-secondary font-bold text-lg hidden md:flex group">
                View All Listings <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProperties.map((property, idx) => (
              <div key={property.id} data-aos="fade-up" data-aos-delay={idx * 100}>
                <PropertyCard property={property} />
              </div>
            ))}
          </div>

          <div className="mt-12 text-center md:hidden">
            <Link href="/properties">
              <Button className="w-full bg-outline border-primary text-primary h-12 font-bold">View All Properties</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary mb-6">What Our Tenants Say</h2>
            <p className="text-muted-foreground dark:text-gray-400 text-lg">
              Real stories from real people who found their perfect home through Choice Properties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Sarah Martinez",
                location: "Los Angeles, CA",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
                rating: 5,
                text: "I was worried about finding a place with my credit history, but Choice Properties connected me with understanding landlords. The application process was transparent, and I moved into my dream apartment within two weeks. The team was supportive every step of the way!",
                property: "Downtown Loft"
              },
              {
                name: "Michael Johnson",
                location: "Pasadena, CA",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
                rating: 5,
                text: "As a single dad relocating for work, I needed to find a home fast. Choice Properties made it happen. They understood my situation and helped me find a family-friendly neighborhood near great schools. Couldn't be happier with my new place!",
                property: "Cozy Suburban Home"
              },
              {
                name: "Emily Chen",
                location: "Santa Monica, CA",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
                rating: 5,
                text: "The whole process was incredibly smooth. From the initial viewing to signing the lease, everything was professional and efficient. The property manager is responsive, and the online application system saved me so much time. Highly recommend Choice Properties!",
                property: "Seaside Condo"
              }
            ].map((testimonial, idx) => (
              <div 
                key={idx} 
                className="bg-card border rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300"
                data-aos="fade-up"
                data-aos-delay={idx * 100}
              >
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                  />
                  <div>
                    <h4 className="font-bold text-lg text-primary">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>

                <p className="text-muted-foreground leading-relaxed mb-4 italic">
                  "{testimonial.text}"
                </p>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Rented: <span className="font-semibold text-primary">{testimonial.property}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center" data-aos="fade-up" data-aos-delay="400">
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-6 py-3 rounded-full border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Over 500+ Happy Tenants in 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/20 relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div data-aos="zoom-in">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-primary mb-6">Your next rental starts here.</h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              We don’t just list properties—we guide you through the entire process. 
              From viewing a home to getting your application approved, we’re with you every step of the way.
            </p>
            <Link href="/properties">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold h-16 px-12 text-xl shadow-lg hover:shadow-xl transition-all">
                Start Searching Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
