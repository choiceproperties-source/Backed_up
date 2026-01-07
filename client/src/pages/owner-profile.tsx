import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PropertyCard } from "@/components/property-card";
import { useQuery } from "@tanstack/react-query";
import { User, PropertyWithOwner } from "@/lib/types";
import { CheckCircle2, Mail, Phone, MapPin, Building2, Star, Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

export default function OwnerProfile() {
  const [match, params] = useRoute("/owner/:id");
  const userId = params?.id;

  const { data: profile, isLoading: isProfileLoading } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const { data: propertiesData, isLoading: isPropertiesLoading } = useQuery<PropertyWithOwner[]>({
    queryKey: [`/api/properties`, { ownerId: userId }],
    enabled: !!userId,
  });

  if (!match || (!isProfileLoading && !profile)) {
    return <NotFound />;
  }

  if (isProfileLoading || isPropertiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={1.5} />
      </div>
    );
  }

  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : "Recently";

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/80 py-12 px-6 relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group">
                <Avatar className="h-14 w-14 border-4 border-background shadow-2xl transition-transform group-hover:scale-105">
                  <AvatarImage src={profile?.profile_image || undefined} alt={profile?.full_name || ""} />
                  <AvatarFallback className="text-xl bg-primary/5 font-bold">{initials}</AvatarFallback>
                </Avatar>
                {profile?.license_verified && (
                  <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg ring-2 ring-background">
                    <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left pt-4">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  <h1 className="text-4xl font-bold tracking-tight text-white">{profile?.full_name}</h1>
                  {profile?.rating && (
                    <div className="flex items-center gap-1 bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
                      <Star className="h-4 w-4 fill-current" />
                      {profile.rating}
                    </div>
                  )}
                </div>
                
                <p className="text-white/80 text-lg mb-6 max-w-2xl leading-relaxed font-medium">
                  {profile?.bio || "Professional property manager focused on providing exceptional living experiences."}
                </p>

                <div className="flex flex-wrap gap-6 justify-center md:justify-start text-sm font-semibold">
                  <div className="flex items-center gap-2 text-white/90">
                    <Building2 className="h-4 w-4 text-white" strokeWidth={1.5} />
                    <span>Member since {memberSince}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-4 w-4 text-white" strokeWidth={1.5} />
                    <span>{propertiesData?.length || 0} Active Listings</span>
                  </div>
                  {profile?.years_experience && (
                    <div className="flex items-center gap-2 text-white/90">
                      <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={1.5} />
                      <span>{profile.years_experience}+ Years Exp.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold mb-4 tracking-tight">About</h2>
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {profile?.bio || "No detailed bio provided."}
                  </p>
                </div>
              </section>
              
              {profile?.license_verified && (
                <div className="bg-primary/5 border border-border/50 rounded-xl p-6 flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 tracking-tight">Verified Partner</h3>
                    <p className="text-muted-foreground/80 font-medium">
                      This member has successfully completed our professional verification process, confirming their identity and commitment to high-quality service.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <Card className="p-8 sticky top-24 rounded-xl border border-border/50 shadow-xl">
                <h3 className="font-bold text-xl mb-6 tracking-tight">Contact Details</h3>
                <div className="space-y-4">
                  {(profile?.display_email || profile?.display_phone) ? (
                    <>
                      {profile.display_email && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 group hover:bg-muted/70 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Mail className="h-5 w-5" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Email</p>
                            <p className="text-sm font-medium truncate">{profile.display_email}</p>
                          </div>
                        </div>
                      )}

                      {profile.display_phone && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 group hover:bg-muted/70 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                            <Phone className="h-5 w-5" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Phone</p>
                            <p className="text-sm font-medium">{profile.display_phone}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground/60 text-sm font-medium bg-muted/30 rounded-xl border-2 border-dashed">
                      Contact information is private. <br/>Please use the inquiry form.
                    </div>
                  )}
                </div>

                <Button className="w-full mt-8 h-11 text-base font-medium shadow-lg shadow-primary/20">
                  Request Information
                </Button>
              </Card>
            </div>
          </div>

          <section>
            <div className="flex items-baseline justify-between mb-8 border-b pb-4">
              <h2 className="text-3xl font-bold tracking-tight">Active Listings</h2>
              <span className="text-muted-foreground font-medium italic">{propertiesData?.length || 0} properties total</span>
            </div>

            {propertiesData && propertiesData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {propertiesData.map((property) => (
                  <PropertyCard key={property.id} property={property as any} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed border-border/50">
                <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-xl font-bold text-muted-foreground">No active listings</p>
                <p className="text-muted-foreground/60 mt-2 font-medium">Currently preparing new opportunities.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
