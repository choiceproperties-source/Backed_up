import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property-card";
import propertiesData from "@/data/properties.json";
import type { Property } from "@/lib/types";
import { CheckCircle2, Mail, Phone, MapPin, Building2 } from "lucide-react";
import NotFound from "@/pages/not-found";

export default function OwnerProfile() {
  const [match, params] = useRoute("/owner/:slug");
  const slug = params?.slug;
  
  const ownerProperties = (propertiesData as Property[]).filter(p => p.owner.slug === slug);
  const owner = ownerProperties[0]?.owner;

  if (!match || !owner) {
    return <NotFound />;
  }

  const memberSince = new Date(owner.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full transform translate-x-20 -translate-y-20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                <AvatarImage src={owner.profile_photo_url} alt={owner.name} />
                <AvatarFallback className="text-4xl">{owner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                  <h1 className="font-heading text-4xl font-bold">{owner.name}</h1>
                  {owner.verified && (
                    <div className="group relative">
                      <CheckCircle2 className="h-8 w-8 text-blue-400" />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Verified Property Manager
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-white/90 text-lg mb-4">{owner.description}</p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Member since {memberSince}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{ownerProperties.length} Active Listings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-primary mb-6">About</h2>
              <p className="text-muted-foreground leading-relaxed text-lg mb-6">
                {owner.description}
              </p>
              
              {owner.verified && (
                <div className="bg-card border border-primary/20 rounded-lg p-6 flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-primary mb-2">Verified Property Manager</h3>
                    <p className="text-muted-foreground text-sm">
                      This property manager has been verified by Choice Properties. We've confirmed their identity, 
                      business license, and professional credentials to ensure you're working with a trustworthy partner.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card border rounded-xl p-6 sticky top-24">
                <h3 className="font-bold text-lg mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <a
                    href={`mailto:${owner.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover-elevate group"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{owner.email}</p>
                    </div>
                  </a>

                  {owner.phone && (
                    <a
                      href={`tel:${owner.phone}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover-elevate group"
                    >
                      <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{owner.phone}</p>
                      </div>
                    </a>
                  )}
                </div>

                <Button className="w-full mt-6">
                  Send Message
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-primary">Active Listings</h2>
              <span className="text-muted-foreground">{ownerProperties.length} properties</span>
            </div>

            {ownerProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownerProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-muted/20 rounded-lg">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium text-muted-foreground">No active listings at the moment</p>
                <p className="text-muted-foreground mt-2">Check back soon for new properties</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
