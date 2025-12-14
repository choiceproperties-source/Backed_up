import { useState } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useFavorites } from '@/hooks/use-favorites';
import { useSavedSearches } from '@/hooks/use-saved-searches';
import { useMarketInsights } from '@/hooks/use-market-insights';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  Search,
  TrendingUp,
  LogOut,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Loader2,
  Trash2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PropertyData {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  images?: string[];
}

export default function BuyerDashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('wishlist');
  const [wishlistProperties, setWishlistProperties] = useState<PropertyData[]>([]);
  const [loadingWishlistDetails, setLoadingWishlistDetails] = useState(false);

  // Fetch hooks
  const { favorites, toggleFavorite, loading: favoritesLoading } = useFavorites();
  const { searches, loading: searchesLoading, deleteSearch } = useSavedSearches();
  const { marketTrends, insights, recommendations } = useMarketInsights();

  // Fetch property details for wishlist when favorites load
  const [wishlistFetched, setWishlistFetched] = useState(false);
  if (favorites.length > 0 && !wishlistFetched && !favoritesLoading) {
    setWishlistFetched(true);
    const fetchWishlistDetails = async () => {
      setLoadingWishlistDetails(true);
      try {
        const properties: PropertyData[] = [];
        for (const favId of favorites) {
          const res = await fetch(`/api/properties/${favId}`);
          if (res.ok) {
            const data = await res.json();
            properties.push(data.data || data);
          }
        }
        setWishlistProperties(properties);
      } catch (err) {
      } finally {
        setLoadingWishlistDetails(false);
      }
    };
    fetchWishlistDetails();
  }

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  // Handle remove from wishlist
  const handleRemoveFromWishlist = async (propertyId: string) => {
    await toggleFavorite(propertyId);
    setWishlistProperties(wishlistProperties.filter((p) => p.id !== propertyId));
    toast({
      title: 'Removed',
      description: 'Property removed from wishlist',
    });
  };

  // Handle delete search
  const handleDeleteSearch = async (searchId: string) => {
    const success = await deleteSearch(searchId);
    if (success) {
      toast({
        title: 'Success',
        description: 'Saved search deleted',
      });
    }
  };

  // Stats
  const stats = {
    wishlistItems: wishlistProperties.length,
    savedSearches: searches.length,
    avgPriceInWishlist:
      wishlistProperties.length > 0
        ? Math.round(wishlistProperties.reduce((sum, p) => sum + (p.price || 0), 0) / wishlistProperties.length)
        : 0,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Buyer Dashboard</h1>
            <p className="text-white/80 mt-2">Track your wishlist, searches, and market insights</p>
          </div>
          <Button
            onClick={() => {
              logout();
              navigate('/');
            }}
            variant="ghost"
            className="text-white hover:bg-white/20"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4" data-testid="stat-wishlist">
            <p className="text-sm font-semibold text-muted-foreground">Wishlist Items</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.wishlistItems}</p>
            <Heart className="h-4 w-4 text-red-500 mt-2" />
          </Card>
          <Card className="p-4" data-testid="stat-searches">
            <p className="text-sm font-semibold text-muted-foreground">Saved Searches</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.savedSearches}</p>
            <Search className="h-4 w-4 text-blue-500 mt-2" />
          </Card>
          <Card className="p-4" data-testid="stat-avg-price">
            <p className="text-sm font-semibold text-muted-foreground">Avg Price (Wishlist)</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${(stats.avgPriceInWishlist / 1000).toFixed(0)}k
            </p>
            <DollarSign className="h-4 w-4 text-green-500 mt-2" />
          </Card>
          <Card className="p-4" data-testid="stat-market-trend">
            <p className="text-sm font-semibold text-muted-foreground">Market Trend</p>
            <p className={`text-3xl font-bold ${
              insights.trend === 'up'
                ? 'text-red-600 dark:text-red-400'
                : insights.trend === 'down'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {insights.trend === 'up' ? '↑' : insights.trend === 'down' ? '↓' : '→'}
              {Math.abs(insights.priceChange).toFixed(1)}%
            </p>
            <TrendingUp className="h-4 w-4 mt-2" />
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 mt-12 flex-1">
        <div className="flex gap-2 mb-8 flex-wrap border-b border-border">
          {[
            { id: 'wishlist', label: 'Wishlist', icon: Heart },
            { id: 'searches', label: 'Saved Searches', icon: Search },
            { id: 'insights', label: 'Market Insights', icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-b-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Wishlist */}
        {activeTab === 'wishlist' && (
          <div className="space-y-4 pb-12" data-testid="section-wishlist">
            {loadingWishlistDetails || favoritesLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading wishlist...</p>
              </Card>
            ) : wishlistProperties.length === 0 ? (
              <Card className="p-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No wishlist items yet</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Heart your favorite properties to add them to your wishlist
                </p>
                <Button
                  onClick={() => navigate('/properties')}
                  className="mt-4"
                  data-testid="button-browse-properties"
                >
                  Browse Properties
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {wishlistProperties.map((property) => (
                  <Card
                    key={property.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                    data-testid={`card-wishlist-${property.id}`}
                  >
                    <div className="aspect-video bg-muted relative">
                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-200/50 to-indigo-200/50">
                          <MapPin className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge
                        className="absolute top-3 right-3 bg-red-500 text-white"
                        data-testid={`badge-wishlist-${property.id}`}
                      >
                        <Heart className="h-3 w-3 mr-1 fill-white" />
                        Wishlist
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1 text-foreground">{property.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                        <MapPin className="h-4 w-4" />
                        {property.city}, {property.state}
                      </p>
                      <div className="flex gap-4 mb-4 text-sm text-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" /> {property.bedrooms} bed
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4" /> {property.bathrooms} bath
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <p className="font-bold text-blue-600 dark:text-blue-400 text-lg flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {(property.price || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/property/${property.id}`)}
                          data-testid={`button-view-${property.id}`}
                        >
                          View
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFromWishlist(property.id)}
                          data-testid={`button-remove-wishlist-${property.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Searches */}
        {activeTab === 'searches' && (
          <div className="space-y-4 pb-12" data-testid="section-searches">
            {searchesLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-foreground font-semibold">Loading searches...</p>
              </Card>
            ) : searches.length === 0 ? (
              <Card className="p-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-semibold">No saved searches yet</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Save your search filters to quickly revisit them
                </p>
                <Button
                  onClick={() => navigate('/properties')}
                  className="mt-4"
                  data-testid="button-create-search"
                >
                  Create Saved Search
                </Button>
              </Card>
            ) : (
              searches.map((search, idx) => (
                <Card
                  key={search.id}
                  className="p-6"
                  data-testid={`card-search-${search.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 text-foreground">
                        {search.name || `Search ${idx + 1}`}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {search.filters?.city && (
                          <Badge variant="outline" data-testid={`badge-filter-city-${search.id}`}>
                            {search.filters.city}
                          </Badge>
                        )}
                        {search.filters?.minPrice && (
                          <Badge
                            variant="outline"
                            data-testid={`badge-filter-price-${search.id}`}
                          >
                            ${search.filters.minPrice?.toLocaleString()} -
                            ${search.filters.maxPrice?.toLocaleString()}
                          </Badge>
                        )}
                        {search.filters?.bedrooms && (
                          <Badge variant="outline" data-testid={`badge-filter-beds-${search.id}`}>
                            {search.filters.bedrooms}+ Beds
                          </Badge>
                        )}
                        {search.filters?.propertyType && (
                          <Badge
                            variant="outline"
                            data-testid={`badge-filter-type-${search.id}`}
                          >
                            {search.filters.propertyType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Saved: {new Date(search.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams();
                          Object.entries(search.filters || {}).forEach(([key, value]) => {
                            if (value) params.append(key, String(value));
                          });
                          navigate(`/properties?${params.toString()}`);
                        }}
                        data-testid={`button-view-results-${search.id}`}
                      >
                        View Results
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                        data-testid={`button-delete-search-${search.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Market Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-6 pb-12" data-testid="section-insights">
            {/* Market Trend Chart */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 text-foreground">Price Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${Math.round(value).toLocaleString()}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Average Price</p>
                <p className="text-2xl font-bold text-foreground">
                  ${(insights.avgPrice || 0).toLocaleString()}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Average Rent</p>
                <p className="text-2xl font-bold text-foreground">
                  ${(insights.avgRent || 0).toLocaleString()}/mo
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Price Change (8mo)</p>
                <p
                  className={`text-2xl font-bold ${
                    insights.trend === 'up'
                      ? 'text-red-600 dark:text-red-400'
                      : insights.trend === 'down'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {insights.priceChange > 0 ? '+' : ''}
                  {insights.priceChange.toFixed(2)}%
                </p>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 text-foreground">Market Recommendations</h3>
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded border-l-4 ${
                      rec.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-950 border-l-red-500'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-950 border-l-yellow-500'
                        : 'bg-green-50 dark:bg-green-950 border-l-green-500'
                    }`}
                  >
                    <p className="font-semibold text-foreground">{rec.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Pro Tips for Buyers</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Set up price alerts for properties in your wishlist</li>
                    <li>• Compare your wishlist prices with current market trends</li>
                    <li>• Save multiple searches to track different market segments</li>
                    <li>• Review market insights regularly to find the best time to buy</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
