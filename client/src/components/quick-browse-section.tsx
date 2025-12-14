import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Building2, Warehouse, Users, Zap } from "lucide-react";

const PROPERTY_TYPES = [
  {
    id: "apartments",
    name: "Apartments",
    icon: Building2,
    description: "Modern & comfortable",
    color: "from-blue-500/10 to-transparent"
  },
  {
    id: "houses",
    name: "Houses",
    icon: Home,
    description: "Space & freedom",
    color: "from-green-500/10 to-transparent"
  },
  {
    id: "condos",
    name: "Condos",
    icon: Warehouse,
    description: "Urban lifestyle",
    color: "from-purple-500/10 to-transparent"
  },
  {
    id: "shared",
    name: "Shared Spaces",
    icon: Users,
    description: "Community living",
    color: "from-orange-500/10 to-transparent"
  },
  {
    id: "all",
    name: "View All",
    icon: Zap,
    description: "500+ listings",
    color: "from-secondary/20 to-transparent"
  }
];

export function QuickBrowseSection() {
  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12" data-aos="fade-up">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-4">Browse by Property Type</h2>
          <p className="text-muted-foreground text-lg">Start your search by selecting what you're looking for</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PROPERTY_TYPES.map((type, idx) => {
            const Icon = type.icon;
            return (
              <Link key={type.id} href="/properties">
                <Button
                  variant="outline"
                  className={`w-full h-auto py-6 px-4 rounded-2xl bg-gradient-to-br ${type.color} border-border/50 hover:border-secondary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group`}
                  data-aos="fade-up"
                  data-aos-delay={idx * 50}
                  data-testid={`button-browse-${type.id}`}
                >
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <Icon className="h-8 w-8 text-secondary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-primary">{type.name}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
