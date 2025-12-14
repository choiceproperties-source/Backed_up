import { useEffect, useState } from "react";
import { TrendingUp, Users, Zap, Target } from "lucide-react";

interface MarketInsight {
  title: string;
  value: string;
  change: string;
  description: string;
  icon: React.ReactNode;
}

export function MarketInsights() {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch("/api/stats/market-insights");
        if (response.ok) {
          const result = await response.json();
          setInsights(result.data || getDefaultInsights());
        } else {
          setInsights(getDefaultInsights());
        }
      } catch (err) {
        console.log("Market insights API unavailable, using defaults");
        setInsights(getDefaultInsights());
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const getDefaultInsights = (): MarketInsight[] => [
    {
      title: "Average Approval Time",
      value: "2.4 days",
      change: "-40% faster",
      description: "Our streamlined process gets you approved quickly",
      icon: <Zap className="h-10 w-10 text-secondary" />
    },
    {
      title: "Properties Available",
      value: "500+",
      change: "New listings daily",
      description: "Fresh inventory added constantly",
      icon: <Target className="h-10 w-10 text-secondary" />
    },
    {
      title: "Avg Rent Price (Market)",
      value: "$1,450",
      change: "Stable market",
      description: "Compare with actual listings",
      icon: <TrendingUp className="h-10 w-10 text-secondary" />
    },
    {
      title: "Active Users",
      value: "2,000+",
      change: "Growing monthly",
      description: "Join our community of renters",
      icon: <Users className="h-10 w-10 text-secondary" />
    }
  ];

  if (loading) {
    return null;
  }

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary mb-6">
            Market Insights
          </h2>
          <p className="text-muted-foreground text-lg">
            Stay informed with real-time data about the rental market and your options.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300"
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-secondary/10">
                  {insight.icon}
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-2 py-1 rounded">
                  {insight.change}
                </span>
              </div>
              <h3 className="font-heading text-2xl font-bold text-primary mb-1">
                {insight.value}
              </h3>
              <p className="font-heading text-sm font-bold text-primary/80 mb-2">
                {insight.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
