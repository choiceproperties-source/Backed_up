import { useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Star, ArrowRight } from "lucide-react";
import { updateMetaTags, setCanonicalUrl } from "@/lib/seo";

interface SuccessStory {
  id: string;
  name: string;
  location: string;
  image: string;
  story: string;
  outcome: string;
  propertyType: string;
  moveInDate: string;
  rating: number;
  testimonial: string;
}

export default function SuccessStories() {
  const successStories: SuccessStory[] = [
    {
      id: "1",
      name: "Sarah Martinez",
      location: "Los Angeles, CA",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop",
      story: "After being rejected by 5 landlords due to credit issues, Sarah found hope through Choice Properties. Our team connected her with understanding landlords who believed in second chances.",
      outcome: "Approved and moved into a beautiful downtown loft in 2 weeks",
      propertyType: "Downtown Loft",
      moveInDate: "March 2024",
      rating: 5,
      testimonial: "The team was supportive every step of the way. I finally have a home I'm proud of!"
    },
    {
      id: "2",
      name: "Michael Johnson",
      location: "Denver, CO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop",
      story: "Relocating for a new job with a family of four was stressful. Michael needed a home near great schools quickly, and Choice Properties made it seamless.",
      outcome: "Found perfect family home in top-rated school district",
      propertyType: "4-Bedroom House",
      moveInDate: "April 2024",
      rating: 5,
      testimonial: "From search to lease signing, the entire process took just 10 days. Amazing!"
    },
    {
      id: "3",
      name: "Emily Chen",
      location: "Seattle, WA",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop",
      story: "As a first-time renter, Emily was nervous about the application process. Choice Properties guided her through everything with patience and expertise.",
      outcome: "Secured luxury condo with flexible lease terms",
      propertyType: "Modern Condo",
      moveInDate: "February 2024",
      rating: 5,
      testimonial: "Their online application system saved me so much time and stress!"
    },
    {
      id: "4",
      name: "James Wilson",
      location: "Austin, TX",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop",
      story: "After a tough divorce, James needed an affordable apartment quickly. Choice Properties understood his situation and found him the perfect place.",
      outcome: "Moved into cozy apartment with month-to-month flexibility",
      propertyType: "1-Bedroom Apartment",
      moveInDate: "January 2024",
      rating: 5,
      testimonial: "They treated me with compassion and found a solution fast!"
    },
    {
      id: "5",
      name: "Lisa Rodriguez",
      location: "Miami, FL",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=500&fit=crop",
      story: "Looking for her first place in an expensive market, Lisa worried about affordability. Choice Properties showed her options within her budget without compromising on quality.",
      outcome: "Signed lease on spacious beach-adjacent apartment",
      propertyType: "2-Bedroom Beach Apartment",
      moveInDate: "May 2024",
      rating: 5,
      testimonial: "I got more than I expected for my budget!"
    },
    {
      id: "6",
      name: "David Kim",
      location: "Portland, OR",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop",
      story: "International student David faced language barriers and strict landlord requirements. Choice Properties advocated for him and secured housing quickly.",
      outcome: "Found inclusive landlord and supportive neighborhood community",
      propertyType: "Studio Near Campus",
      moveInDate: "August 2024",
      rating: 5,
      testimonial: "They made me feel welcome and found a landlord who values diversity!"
    }
  ];

  useEffect(() => {
    updateMetaTags({
      title: "Success Stories - Choice Properties | Real Renter Experiences",
      description: "Read inspiring stories from renters who found their perfect homes through Choice Properties. From credit rebuilding to relocation, see how we help.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/success-stories"
    });
    setCanonicalUrl("https://choiceproperties.com/success-stories");
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-b from-primary to-primary/80 text-white overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center" data-aos="fade-up">
            <h1 className="font-heading text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Real Stories from Real Renters
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Discover how Choice Properties helped thousands find their perfect homes, overcome challenges, and build better lives.
            </p>
          </div>
        </div>
      </section>

      {/* Success Stories Grid */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {successStories.map((story, idx) => (
              <div
                key={story.id}
                className="group bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                data-aos="fade-up"
                data-aos-delay={idx * 100}
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="font-heading text-xl font-bold text-primary mb-1">{story.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{story.location}</p>
                    <div className="flex gap-1 mb-4">
                      {[...Array(story.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed mb-4 italic">
                    "{story.testimonial}"
                  </p>

                  <div className="space-y-2 pt-4 border-t border-border">
                    <div className="text-xs">
                      <span className="font-semibold text-primary">{story.propertyType}</span>
                      <span className="text-muted-foreground"> • {story.moveInDate}</span>
                    </div>
                    <p className="text-sm text-secondary font-semibold">{story.outcome}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full Stories Section */}
      <section className="py-24 bg-muted/30 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-4xl font-bold text-primary mb-12 text-center">
              Behind Every Success: The Stories
            </h2>

            <div className="space-y-12">
              {successStories.slice(0, 3).map((story, idx) => (
                <div
                  key={story.id}
                  className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-border/50 shadow-sm"
                  data-aos="fade-up"
                  data-aos-delay={idx * 100}
                >
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-shrink-0">
                      <img
                        src={story.image}
                        alt={story.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-heading text-2xl font-bold text-primary mb-2">{story.name}</h3>
                      <p className="text-muted-foreground mb-4">{story.location}</p>
                      <p className="text-foreground leading-relaxed mb-4">{story.story}</p>
                      <div className="p-4 bg-secondary/10 rounded-lg border-l-4 border-secondary">
                        <p className="text-sm font-semibold text-secondary mb-2">The Outcome:</p>
                        <p className="text-foreground">{story.outcome}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <div data-aos="zoom-in">
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">Your Story Could Be Next</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
              Ready to find your perfect home? Start your journey with Choice Properties today.
            </p>
            <Link href="/properties">
              <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-primary-foreground font-bold h-16 px-12 text-xl shadow-lg hover:shadow-xl transition-all">
                Browse Properties <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
