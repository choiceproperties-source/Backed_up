import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useOwnedProperties } from '@/hooks/use-owned-properties';
import { useOwnerApplications } from '@/hooks/use-property-applications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Home,
  FileText,
  LogOut,
  Plus,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';

export default function LandlordDashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { properties, loading: propsLoading } = useOwnedProperties();
  const { applications, isLoading: appsLoading } = useOwnerApplications();

  // Update meta tags
  useMemo(() => {
    updateMetaTags({
      title: 'Landlord Dashboard - Choice Properties',
      description: 'Manage your properties and rental applications',
      image: 'https://choiceproperties.com/og-image.png',
      url: 'https://choiceproperties.com/landlord-dashboard',
    });
  }, []);

  // Redirect if not logged in or not a landlord
  if (!isLoggedIn || !user || (user.role !== 'landlord' && user.role !== 'admin')) {
    navigate('/login');
    return null;
  }

  // Calculate stats
  const stats = useMemo(
    () => ({
      properties: properties.length,
      applications: applications.length,
      approvedApps: applications.filter((a: any) => a.status === 'approved').length,
      pendingApps: applications.filter((a: any) => a.status === 'pending').length,
    }),
    [properties, applications]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Landlord Dashboard</h1>
            <p className="text-blue-100 mt-2">Manage your properties and applications</p>
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
      <div className="container mx-auto px-4 -mt-8 relative z-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6" data-testid="stat-properties">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Active Properties</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {stats.properties}
                </p>
              </div>
              <Home className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6" data-testid="stat-applications">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Applications</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  {stats.applications}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stats.pendingApps} pending</p>
              </div>
              <FileText className="h-8 w-8 text-indigo-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6" data-testid="stat-approved">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Approved Applications</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.approvedApps}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6" data-testid="stat-pending">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {stats.pendingApps}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 flex-1 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card className="p-8" data-testid="section-quick-actions">
            <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/landlord-properties')}
                className="w-full justify-between bg-blue-600 hover:bg-blue-700"
                data-testid="button-manage-properties"
              >
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Manage Properties
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/landlord-applications')}
                className="w-full justify-between bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-view-applications"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Applications
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/landlord-profile')}
                variant="outline"
                className="w-full justify-between"
                data-testid="button-profile"
              >
                <span>My Profile</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-8" data-testid="section-overview">
            <h2 className="text-2xl font-bold text-foreground mb-6">Overview</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Welcome to your landlord dashboard! From here you can manage all your properties,
                review tenant applications, and handle your rental business.
              </p>
              <p>
                • Add new properties to attract tenants • Review and approve/reject applications •
                Track all active listings and applications
              </p>
              <p className="text-xs text-muted-foreground italic mt-4">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
