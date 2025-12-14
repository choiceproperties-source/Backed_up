import { useMemo } from 'react';

export interface MarketTrend {
  month: string;
  avgPrice: number;
  avgRent?: number;
  marketActivity?: number;
}

export function useMarketInsights() {
  // Simulated market data - in production, this would come from an API
  const marketTrends = useMemo(() => {
    const basePrice = 450000;
    return Array.from({ length: 8 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i],
      avgPrice: basePrice + Math.random() * 50000 - 25000,
      avgRent: 2000 + Math.random() * 500 - 250,
      marketActivity: Math.floor(Math.random() * 100) + 60,
    }));
  }, []);

  const insights = useMemo(() => {
    if (marketTrends.length === 0) {
      return {
        trend: 'stable',
        priceChange: 0,
        avgPrice: 0,
        avgRent: 0,
      };
    }

    const first = marketTrends[0].avgPrice;
    const last = marketTrends[marketTrends.length - 1].avgPrice;
    const priceChange = ((last - first) / first) * 100;

    return {
      trend: priceChange > 2 ? 'up' : priceChange < -2 ? 'down' : 'stable',
      priceChange: parseFloat(priceChange.toFixed(2)),
      avgPrice: Math.round(
        marketTrends.reduce((sum, t) => sum + t.avgPrice, 0) / marketTrends.length
      ),
      avgRent: Math.round(
        (marketTrends.reduce((sum, t) => sum + (t.avgRent || 0), 0) / marketTrends.length) * 10
      ) / 10,
    };
  }, [marketTrends]);

  const recommendations = useMemo(() => {
    return [
      {
        title: 'Market Timing',
        description:
          insights.trend === 'down'
            ? 'Good time to buy - prices are trending down'
            : insights.trend === 'up'
            ? 'Consider waiting - prices are trending up'
            : 'Market is stable - good time to negotiate',
        priority: insights.trend === 'up' ? 'high' : 'medium',
      },
      {
        title: 'Inventory Levels',
        description: 'Current inventory is moderate - good selection available',
        priority: 'medium',
      },
      {
        title: 'Competition',
        description: 'Low to moderate competition in your saved searches',
        priority: 'low',
      },
    ];
  }, [insights]);

  return {
    marketTrends,
    insights,
    recommendations,
  };
}
