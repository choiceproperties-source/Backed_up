import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useOwnedProperties } from '@/hooks/use-owned-properties';
import { useOwnerApplications } from '@/hooks/use-property-applications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Home,
  FileText,
  LogOut,
  Plus,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';
import { LandlordDashboardSkeleton } from '@/components/dashboard-skeleton';

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

  // Calculate stats - MUST be before any early returns to comply with React hooks rules
  const stats = useMemo(() => {
    const propList = Array.isArray(properties) ? properties : [];
    const appList = Array.isArray(applications) ? applications : [];
    const activeProperties = propList.filter((p: any) => p.status === 'active');
    const rentedProperties = propList.filter((p: any) => p.status === 'rented');
    const totalProperties = propList.length;
    const occupancyRate = totalProperties > 0 ? Math.round((rentedProperties.length / totalProperties) * 100) : 0;
    
    const monthlyRevenue = rentedProperties.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    const potentialRevenue = propList.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);
    
    return {
      properties: totalProperties,
      activeListings: activeProperties.length,
      rentedProperties: rentedProperties.length,
      applications: appList.length,
      approvedApps: appList.filter((a: any) => a.status === 'approved').length,
      pendingApps: appList.filter((a: any) => a.status === 'pending').length,
      occupancyRate,
      monthlyRevenue,
      potentialRevenue,
    };
  }, [properties, applications]);

  // Redirect if not logged in or not a landlord/property manager
  if (!isLoggedIn || !user || (user.role !== 'landlord' && user.role !== 'property_manager' && user.role !== 'admin')) {
    navigate('/login');
    return null;
  }

  // Show skeleton while loading
  if (propsLoading || appsLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold">Landlord Dashboard</h1>
            <p className="text-blue-100 mt-2">Manage your properties and applications</p>
          </div>
        </div>
        <LandlordDashboardSkeleton />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/80 text-white py-12 px-6 relative overflow-hidden mb-12">
        <div className="container mx-auto flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Landlord Dashboard</h1>
            <p className="text-white/80 mt-2 text-lg font-medium">Manage your properties and applications</p>
          </div>
          <Button
            onClick={() => {
              logout();
              navigate('/');
            }}
            variant="ghost"
            className="text-white hover:bg-white/20 h-11 font-medium border border-white/30"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-2" strokeWidth={1.5} />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-10 relative z-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 rounded-xl border border-border/50 hover-elevate shadow-sm transition-all duration-300 bg-card/50 backdrop-blur-sm" data-testid="stat-properties">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Total Properties</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {stats.properties}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-wider opacity-60">
                  {stats.activeListings} active • {stats.rentedProperties} rented
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/5">
                <Building2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-xl border border-border/50 hover-elevate shadow-sm transition-all duration-300 bg-card/50 backdrop-blur-sm" data-testid="stat-occupancy">
            <div className="flex items-start justify-between">
              <div className="w-full">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Occupancy Rate</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  {stats.properties > 0 ? `${stats.occupancyRate}%` : '--'}
                </p>
                {stats.properties > 0 ? (
                  <Progress value={stats.occupancyRate} className="h-1.5 mt-3 rounded-full bg-muted shadow-inner" />
                ) : (
                  <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-wider opacity-60">Add properties to track</p>
                )}
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/5 ml-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-xl border border-border/50 hover-elevate shadow-sm transition-all duration-300 bg-card/50 backdrop-blur-sm" data-testid="stat-revenue">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Monthly Revenue</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  ${stats.monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-wider opacity-60">
                  ${stats.potentialRevenue.toLocaleString()} potential
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/5">
                <DollarSign className="h-5 w-5 text-green-500" strokeWidth={1.5} />
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-xl border border-border/50 hover-elevate shadow-sm transition-all duration-300 bg-card/50 backdrop-blur-sm" data-testid="stat-applications">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Applications</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  {stats.applications}
                </p>
                <div className="flex gap-2 mt-1">
                  {stats.pendingApps > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 rounded-full px-2 py-0.5 font-bold uppercase tracking-widest">
                      {stats.pendingApps} pending
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/5">
                <FileText className="h-5 w-5 text-indigo-500" strokeWidth={1.5} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Pending Actions Alert */}
      {stats.pendingApps > 0 && (
        <div className="container mx-auto px-4 mb-8" data-testid="pending-alert">
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg">
            <div className="p-4 flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    {stats.pendingApps} Application{stats.pendingApps > 1 ? 's' : ''} Awaiting Review
                  </p>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    Review pending applications to keep tenants engaged
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/landlord-applications')}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white h-11 font-medium"
                data-testid="button-review-applications"
              >
                Review Now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 flex-1 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card className="p-8 rounded-xl border border-border/50 shadow-sm" data-testid="section-quick-actions">
            <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
            <div className="grid gap-4">
              <Button
                onClick={() => navigate('/landlord-properties')}
                className="w-full justify-between bg-primary hover:bg-primary/90 h-11 font-medium shadow-sm transition-all duration-200"
                data-testid="button-manage-properties"
              >
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4" strokeWidth={1.5} />
                  Manage Properties
                </span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button
                onClick={() => navigate('/landlord-applications')}
                className="w-full justify-between bg-indigo-600 hover:bg-indigo-700 h-11 font-medium shadow-sm transition-all duration-200"
                data-testid="button-view-applications"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" strokeWidth={1.5} />
                  View Applications
                </span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button
                onClick={() => navigate('/landlord-profile')}
                variant="outline"
                className="w-full justify-between h-11 font-medium border-border/60 hover-elevate transition-all duration-200"
                data-testid="button-profile"
              >
                <span>My Profile</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-8 rounded-xl border border-border/50 shadow-sm" data-testid="section-overview">
            <h2 className="text-2xl font-bold text-foreground mb-6">Overview</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>
                  Welcome to your landlord dashboard! From here you can manage all your properties,
                  review tenant applications, and handle your rental business.
                </p>
                <p>
                  • Add new properties to attract tenants • Review and approve/reject applications •
                  Track all active listings and applications
                </p>
              </div>
              <p className="text-xs text-muted-foreground/60 italic mt-4">
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
