import { useEffect, useState } from "react";
import { TrendingUp, Users, Award, Home } from "lucide-react";

interface TrustIndicator {
  number: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function TrustIndicators() {
  const [indicators, setIndicators] = useState<TrustIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const response = await fetch("/api/stats/trust-indicators");
        if (response.ok) {
          const result = await response.json();
          const data = result.data || getDefaultIndicators();
          setIndicators(data);
        } else {
          setIndicators(getDefaultIndicators());
        }
      } catch (err) {
        console.log("Trust indicators API unavailable, using defaults");
        setIndicators(getDefaultIndicators());
      } finally {
        setLoading(false);
      }
    };

    fetchIndicators();
  }, []);

  const getDefaultIndicators = (): TrustIndicator[] => [
    {
      number: "500+",
      label: "Properties Listed",
      icon: <Home className="h-10 w-10 text-secondary" />,
      description: "Verified rental homes across the nation"
    },
    {
      number: "2,000+",
      label: "Happy Renters",
      icon: <Users className="h-10 w-10 text-secondary" />,
      description: "Successfully placed in their dream homes"
    },
    {
      number: "98%",
      label: "Landlord Approval Rate",
      icon: <Award className="h-10 w-10 text-secondary" />,
      description: "Industry-leading satisfaction score"
    },
    {
      number: "10,000+",
      label: "Successful Placements",
      icon: <TrendingUp className="h-10 w-10 text-secondary" />,
      description: "Completed moves with zero disputes"
    }
  ];

  if (loading) {
    return null;
  }

  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary mb-6">
            Trusted by Renters Nationwide
          </h2>
          <p className="text-muted-foreground text-lg">
            Our proven track record speaks for itself. Join thousands of satisfied renters who found their perfect home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {indicators.map((indicator, idx) => (
            <div
              key={idx}
              className="group p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center"
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <div className="mb-6 flex justify-center p-4 rounded-full bg-primary/5 w-fit mx-auto group-hover:bg-primary/10 transition-colors">
                {indicator.icon}
              </div>
              <div className="mb-4">
                <h3 className="font-heading text-4xl md:text-5xl font-bold text-secondary mb-2">
                  {indicator.number}
                </h3>
                <p className="font-heading text-xl font-bold text-primary">
                  {indicator.label}
                </p>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {indicator.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
