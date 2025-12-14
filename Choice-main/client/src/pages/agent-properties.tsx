import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useProperties } from '@/hooks/use-properties';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  DollarSign,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';

export default function AgentProperties() {
  const { user, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { properties, loading } = useProperties();

  // Update meta tags
  useMemo(() => {
    updateMetaTags({
      title: 'My Properties - Agent Dashboard',
      description: 'View and manage your assigned rental properties',
    });
  }, []);

  // Filter properties assigned to this agent
  const assignedProperties = properties.filter(
    (p: any) => p.listingAgentId === user?.id
  );

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 p-0 h-auto"
              onClick={() => navigate('/agent-dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="text-3xl font-bold">My Assigned Properties</h1>
          <p className="text-purple-100 mt-2">{assignedProperties.length} properties</p>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="container mx-auto px-4 py-12 flex-1">
        {loading ? (
          <div className="text-center py-12">Loading properties...</div>
        ) : assignedProperties.length === 0 ? (
          <Card className="p-12 text-center" data-testid="empty-state">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Assigned Properties</h3>
            <p className="text-muted-foreground">You don't have any assigned properties yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedProperties.map((property: any) => (
              <Card
                key={property.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                data-testid={`card-property-${property.id}`}
                onClick={() => navigate(`/property/${property.id}`)}
              >
                {/* Property Image */}
                {property.images && property.images[0] && (
                  <div className="h-48 bg-gradient-to-br from-purple-400 to-indigo-600 relative overflow-hidden">
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-4 right-4" data-testid={`badge-status-${property.id}`}>
                      {property.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                )}

                {/* Property Info */}
                <div className="p-6">
                  <h3 className="font-bold text-lg text-foreground mb-2">{property.title}</h3>

                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>
                      {property.city}, {property.state}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y">
                    <div className="text-center">
                      <Bed className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <span className="text-sm font-semibold">{property.bedrooms}</span>
                      <p className="text-xs text-muted-foreground">Beds</p>
                    </div>
                    <div className="text-center">
                      <Bath className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <span className="text-sm font-semibold">{property.bathrooms}</span>
                      <p className="text-xs text-muted-foreground">Baths</p>
                    </div>
                    <div className="text-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <span className="text-sm font-semibold">${parseInt(property.price).toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">Month</p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    data-testid={`button-view-${property.id}`}
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
